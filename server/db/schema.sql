-- Persistenz-Schema fuer Platin Multiplayer (SQLite).
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Ein "Run" ist eine gemeinsame Challenge mehrerer Spieler (Lobby-Code) mit festen Regeln.
CREATE TABLE IF NOT EXISTS runs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  rules       TEXT NOT NULL,              -- JSON: nuzlocke, soulbound, dupesClause, shinyClause, ...
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  token       TEXT NOT NULL UNIQUE,
  run_id      TEXT REFERENCES runs(id),
  game_over   INTEGER NOT NULL DEFAULT 0,
  data        TEXT NOT NULL,              -- JSON: Position, Inventar, Fortschritt
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pokemon (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES players(id),
  run_id      TEXT REFERENCES runs(id),
  alive       INTEGER NOT NULL DEFAULT 1, -- Nuzlocke: 0 = tot (Permadeath), nie wieder 1
  death_cause TEXT,                       -- 'fainted' | 'soulbound' | 'soulbound_failed_encounter'
  died_at     INTEGER,
  data        TEXT NOT NULL               -- JSON: Art, Level, Werte, Attacken, Slot ...
);
CREATE INDEX IF NOT EXISTS idx_pokemon_owner ON pokemon(owner_id);

-- Nuzlocke: genau ein Eintrag pro Spieler und Route. Nur der erste Encounter zaehlt.
CREATE TABLE IF NOT EXISTS encounters (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT,
  player_id   TEXT NOT NULL REFERENCES players(id),
  route       TEXT NOT NULL,
  species_id  INTEGER NOT NULL,
  outcome     TEXT NOT NULL,              -- 'pending' | 'caught' | 'failed'
  pokemon_id  TEXT REFERENCES pokemon(id),
  created_at  INTEGER NOT NULL,
  UNIQUE (player_id, route)
);

-- Linked Soulbound: alle Faenge desselben Runs auf derselben Route bilden eine Seelengruppe.
CREATE TABLE IF NOT EXISTS soul_links (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES runs(id),
  route       TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'active', -- 'active' | 'dead' | 'broken'
  created_at  INTEGER NOT NULL,
  UNIQUE (run_id, route)
);

CREATE TABLE IF NOT EXISTS soul_link_members (
  link_id     TEXT NOT NULL REFERENCES soul_links(id),
  pokemon_id  TEXT NOT NULL UNIQUE REFERENCES pokemon(id),
  player_id   TEXT NOT NULL REFERENCES players(id),
  PRIMARY KEY (link_id, player_id)
);

-- Datenbank-seitige Absicherung: Stirbt ein verlinktes Pokemon, sterben alle Partner sofort,
-- auch wenn die Aenderung nicht ueber den Spielserver kommt (z. B. manuelle Admin-Korrektur).
CREATE TRIGGER IF NOT EXISTS trg_soulbound_death
AFTER UPDATE OF alive ON pokemon
WHEN OLD.alive = 1 AND NEW.alive = 0
BEGIN
  UPDATE pokemon
     SET alive = 0,
         death_cause = 'soulbound',
         died_at = NEW.died_at
   WHERE alive = 1
     AND id IN (
       SELECT m2.pokemon_id
         FROM soul_link_members m1
         JOIN soul_link_members m2 ON m2.link_id = m1.link_id
        WHERE m1.pokemon_id = NEW.id AND m2.pokemon_id <> NEW.id
     );
  UPDATE soul_links SET state = 'dead'
   WHERE id IN (SELECT link_id FROM soul_link_members WHERE pokemon_id = NEW.id);
END;

-- Nuzlocke-Absicherung: ein totes Pokemon kann nicht wiederbelebt werden.
CREATE TRIGGER IF NOT EXISTS trg_no_revive
BEFORE UPDATE OF alive ON pokemon
WHEN OLD.alive = 0 AND NEW.alive = 1
  AND (SELECT json_extract(rules, '$.nuzlocke') FROM runs WHERE id = OLD.run_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'Nuzlocke: tote Pokemon bleiben tot');
END;

CREATE TABLE IF NOT EXISTS event_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT,
  type        TEXT NOT NULL,
  payload     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
