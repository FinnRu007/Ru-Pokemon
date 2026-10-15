// Nuzlocke- und Linked-Soulbound-Regelwerk.
//
// Nuzlocke:
//   * Permadeath: Ein besiegtes Pokemon ist tot (alive = 0) und kann nie wieder eingesetzt werden.
//   * Nur der erste Encounter pro Route ist fangbar (Tabelle encounters, UNIQUE(player_id, route)).
//   * Optional: Dupes Clause (bereits besessene Familien zaehlen nicht), Shiny Clause.
//
// Linked Soulbound:
//   * Alle Faenge der Spieler eines Runs auf derselben Route bilden eine Seelengruppe (soul_links).
//   * Stirbt ein Mitglied, sterben alle anderen sofort (JS-Logik + SQLite-Trigger als Absicherung).
//   * Scheitert ein Spieler an seinem Encounter, wird die Gruppe der Route gebrochen:
//     bereits gefangene Partner sterben, spaetere Faenge dieser Route sind direkt tot (Hardcore).
import crypto from 'node:crypto';
import { species, displayName } from './pokemonFactory.js';

// Standard ist das normale Spiel wie in Platin: alle Extras aus. Wer sie will, schaltet sie beim
// Erstellen ein (Startbildschirm). Ohne Nuzlocke haben die anderen Regeln keine Wirkung.
export const DEFAULT_RULES = {
  nuzlocke: false,
  soulbound: false,
  dupesClause: false,
  shinyClause: false,
  failedEncounterBreaksLink: false,
  maxLevelCap: null
};
// Solo-Spielstände von vor der Regelauswahl liefen mit Nuzlocke und allen Klauseln
const LEGACY_SOLO_RULES = { nuzlocke: true, dupesClause: true, shinyClause: true, failedEncounterBreaksLink: true };

// Regeln aus der Anmeldung übernehmen (nur bekannte Schalter, Extras nur mit Nuzlocke)
export function sanitizeRules(input, solo = false) {
  const rules = { ...DEFAULT_RULES };
  for (const k of Object.keys(DEFAULT_RULES)) if (input && typeof input[k] === typeof DEFAULT_RULES[k] && input[k] !== null) rules[k] = input[k];
  if (!rules.nuzlocke) Object.assign(rules, { soulbound: false, dupesClause: false, shinyClause: false, failedEncounterBreaksLink: false });
  if (solo || !rules.soulbound) Object.assign(rules, { soulbound: false, failedEncounterBreaksLink: solo ? false : rules.failedEncounterBreaksLink && rules.soulbound });
  return rules;
}

export class RulesEngine {
  /**
   * @param repo Storage-Repository
   * @param hooks { onSoulDeath(victims[], sourceInfo) } vom Spielserver bereitgestellt
   */
  constructor(repo, hooks) {
    this.repo = repo;
    this.hooks = hooks;
  }

  rulesFor(player) {
    const run = player.runId ? this.repo.getRun(player.runId) : null;
    if (run) return { ...DEFAULT_RULES, ...run.rules };
    return { ...DEFAULT_RULES, ...(player.rules || LEGACY_SOLO_RULES), soulbound: false };
  }

  // Wird beim Start eines Wildkampfes aufgerufen.
  // Liefert { catchable, reason, counted }.
  onEncounterStart(player, route, wild, ownedFamilies) {
    const rules = this.rulesFor(player);
    if (!rules.nuzlocke) return { catchable: true, counted: false, reason: null };
    if (rules.shinyClause && wild.shiny) {
      return { catchable: true, counted: false, reason: 'Shiny Clause: Schillernde Pokemon duerfen immer gefangen werden.' };
    }
    const existing = this.repo.getEncounter(player.id, route);
    if (existing) {
      return { catchable: false, counted: false, reason: 'Nuzlocke: Auf dieser Route hattest du bereits deinen ersten Encounter. Fangen nicht erlaubt.' };
    }
    const family = species(wild.speciesId).family;
    if (rules.dupesClause && ownedFamilies.has(family)) {
      return { catchable: false, counted: false, reason: 'Dupes Clause: Diese Entwicklungsreihe besitzt du bereits. Der Encounter zaehlt nicht.' };
    }
    this.repo.insertEncounter({ run_id: player.runId, player_id: player.id, route, species_id: wild.speciesId, outcome: 'pending' });
    this.repo.log(player.runId, 'encounter', { playerId: player.id, route, speciesId: wild.speciesId });
    return { catchable: true, counted: true, reason: null };
  }

  // outcome: 'caught' | 'failed'
  onEncounterResolved(player, route, outcome, pokemon) {
    const rules = this.rulesFor(player);
    const enc = this.repo.getEncounter(player.id, route);
    if (!enc || enc.outcome !== 'pending') return { victims: [] };
    this.repo.updateEncounter(player.id, route, outcome, pokemon ? pokemon.id : null);
    this.repo.log(player.runId, 'encounter_resolved', { playerId: player.id, route, outcome, pokemonId: pokemon?.id });
    if (!rules.soulbound || !player.runId) return { victims: [] };

    return this.repo.transaction(() => {
      let link = this.repo.getLinkByRoute(player.runId, route);
      if (!link) link = this.repo.createLink({ id: crypto.randomUUID(), run_id: player.runId, route, state: 'active' });

      if (outcome === 'caught') {
        this.repo.addLinkMember(link.id, pokemon.id, player.id);
        if (link.state !== 'active') {
          // Gruppe ist bereits tot oder gebrochen: der neue Fang ist sofort tot.
          const cause = link.state === 'broken' ? 'soulbound_failed_encounter' : 'soulbound';
          this.repo.markDead(pokemon.id, cause);
          pokemon.alive = false;
          pokemon.deathCause = cause;
          return { victims: [{ pokemonId: pokemon.id, playerId: player.id, cause }], link };
        }
        return { victims: [], link };
      }

      // outcome === 'failed'
      if (!rules.failedEncounterBreaksLink) return { victims: [] };
      const victims = [];
      for (const m of this.repo.listLinkMembers(link.id)) {
        const p = this.repo.getPokemon(m.pokemon_id);
        if (p && p.alive) {
          this.repo.markDead(p.id, 'soulbound_failed_encounter');
          victims.push({ pokemonId: p.id, playerId: m.player_id, cause: 'soulbound_failed_encounter' });
        }
      }
      this.repo.setLinkState(link.id, 'broken');
      this.repo.log(player.runId, 'link_broken', { route, by: player.id, victims });
      return { victims, link };
    });
  }

  // Ein Pokemon wurde im Kampf besiegt. Bei Nuzlocke = Tod, bei Soulbound sterben alle Partner.
  onPokemonFainted(player, pokemon) {
    const rules = this.rulesFor(player);
    if (!rules.nuzlocke) return { dead: false, victims: [] };
    const victims = [];
    this.repo.transaction(() => {
      // Partner vor dem Tod bestimmen (der SQLite-Trigger toetet sie ggf. bereits mit).
      const link = rules.soulbound ? this.repo.getLinkForPokemon(pokemon.id) : null;
      const partners = link
        ? this.repo.listLinkMembers(link.id).filter((m) => m.pokemon_id !== pokemon.id)
          .map((m) => ({ m, p: this.repo.getPokemon(m.pokemon_id) })).filter((x) => x.p && x.p.alive)
        : [];
      this.repo.markDead(pokemon.id, 'fainted');
      for (const { m } of partners) {
        this.repo.markDead(m.pokemon_id, 'soulbound'); // idempotent
        victims.push({ pokemonId: m.pokemon_id, playerId: m.player_id, cause: 'soulbound' });
      }
      if (link) this.repo.setLinkState(link.id, 'dead');
      this.repo.log(player.runId, 'death', { playerId: player.id, pokemonId: pokemon.id, speciesId: pokemon.speciesId, victims });
    });
    pokemon.alive = false;
    pokemon.deathCause = 'fainted';
    return { dead: true, victims };
  }

  // Uebersicht fuer die Client-Anzeige.
  summary(player) {
    const rules = this.rulesFor(player);
    const encounters = this.repo.listEncounters(player.id).map((e) => ({
      route: e.route, speciesId: e.species_id, species: species(e.species_id).name, outcome: e.outcome, pokemonId: e.pokemon_id
    }));
    let links = [];
    if (player.runId && rules.soulbound) {
      links = this.repo.listRunLinks(player.runId).map((l) => ({
        id: l.id, route: l.route, state: l.state,
        members: this.repo.listLinkMembers(l.id).map((m) => {
          const p = this.repo.getPokemon(m.pokemon_id);
          const owner = this.repo.getPlayer(m.player_id);
          return { playerId: m.player_id, playerName: owner?.name, pokemonId: m.pokemon_id, name: p ? displayName(p) : '?', speciesId: p?.speciesId, alive: !!p?.alive };
        })
      }));
    }
    return { rules, encounters, links };
  }
}
