class_name PokemonInstance
extends RefCounted
## Ein konkretes Pokémon: Spezies + Level + IVs/EVs + Wesen + Attacken + XP +
## aktueller Zustand. Serialisierbar (to_dict / from_dict) – dieselbe Funktion
## fuer Savegame UND Tausch/Kampf uebers Netz.

var species_id: String = ""
var nickname: String = ""
var level: int = 5
var exp: int = 0

var ivs: Dictionary = { "hp": 0, "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0 }
var evs: Dictionary = { "hp": 0, "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0 }
var nature: String = "hardy"

# moves: Array von { id, pp, pp_max }
var moves: Array = []

var current_hp: int = 0
var status: String = ""          # "", "burn", "paralysis", "poison", "sleep", "freeze"
var status_counter: int = 0

# --- Fluechtiger Kampf-Zustand (ausserhalb des Kampfes leer) ---
var stat_stages: Dictionary = { "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0, "acc": 0, "eva": 0 }
var volatile: Dictionary = {}    # z. B. { "flinch": true }

# ------------------------------------------------------------------

static func create(species: String, lvl: int, move_ids: Array = [], rng: RandomNumberGenerator = null) -> PokemonInstance:
	var p := PokemonInstance.new()
	p.species_id = species
	p.level = lvl
	p.exp = StatCalc.exp_for_level(p.growth_rate(), lvl)
	var r := rng if rng != null else RandomNumberGenerator.new()
	if rng == null:
		r.randomize()
	for s in StatCalc.STATS:
		p.ivs[s] = r.randi_range(0, 31)
	p.nature = StatCalc.NATURES.keys()[r.randi_range(0, StatCalc.NATURES.size() - 1)]
	var ids := move_ids if not move_ids.is_empty() else p.auto_moves(lvl)
	for id in ids:
		p.moves.append({ "id": id, "pp": _base_pp(id), "pp_max": _base_pp(id) })
	p.current_hp = p.max_hp()
	return p

static func _base_pp(move_id: String) -> int:
	var m: Dictionary = GameData.moves.get(move_id, {})
	return int(m.get("pp", 5))

# --- Spezies-Daten ---------------------------------------------------

func species() -> Dictionary:
	return GameData.species.get(species_id, {})

func display_name() -> String:
	if nickname != "":
		return nickname
	return String(species().get("name", species_id.capitalize()))

func types() -> Array:
	return species().get("types", ["normal"])

## Nationale Dex-Nummer (fuer Sprite-/Cry-Dateinamen, z.B. assets/.../460.png).
func dex_num() -> int:
	return int(species().get("dex", 0))

func front_sprite_path() -> String:
	return "res://assets/spritesheets/pokemon/front/%d.png" % dex_num()

func back_sprite_path() -> String:
	return "res://assets/spritesheets/pokemon/back/%d.png" % dex_num()

func icon_sprite_path() -> String:
	return "res://assets/spritesheets/pokemon/icons/%d.png" % dex_num()

func cry_path() -> String:
	return "res://assets/audio/cries/%d.ogg" % dex_num()

func growth_rate() -> String:
	return String(species().get("growth_rate", "medium_fast"))

## Die bis Level lvl zuletzt gelernten 4 Attacken.
func auto_moves(lvl: int) -> Array:
	var learnset: Dictionary = species().get("learnset", {})
	var learned: Array = []
	var keys := learnset.keys()
	keys.sort_custom(func(a, b): return int(a) < int(b))
	for k in keys:
		if int(k) <= lvl:
			for mid in learnset[k]:
				learned.append(mid)
	if learned.is_empty():
		learned = ["tackle"]
	return learned.slice(max(0, learned.size() - 4))

# --- Werte ---------------------------------------------------------

func base(stat: String) -> int:
	return int(species().get("base_stats", {}).get(stat, 50))

func max_hp() -> int:
	return StatCalc.calc_hp(base("hp"), ivs.get("hp", 0), evs.get("hp", 0), level)

## Roher Stat (ohne Kampf-Stufen).
func stat(s: String) -> int:
	if s == "hp":
		return max_hp()
	return StatCalc.calc_other(base(s), ivs.get(s, 0), evs.get(s, 0), level, nature, s)

## Effektiver Stat im Kampf (mit Stufen + Statuseffekt).
func battle_stat(s: String) -> int:
	var v := float(stat(s)) * StatCalc.stage_multiplier(stat_stages.get(s, 0))
	if s == "atk" and status == "burn":
		v *= 0.5
	if s == "spe" and status == "paralysis":
		v *= 0.5
	return max(1, int(v))

func is_fainted() -> bool:
	return current_hp <= 0

func heal_full() -> void:
	current_hp = max_hp()
	status = ""
	status_counter = 0
	for m in moves:
		m.pp = m.pp_max

func reset_battle_state() -> void:
	for k in stat_stages:
		stat_stages[k] = 0
	volatile.clear()

# --- XP / Level ---------------------------------------------------

## Gibt true zurueck, wenn (mind.) ein Level-Up passiert ist.
func gain_exp(amount: int) -> bool:
	exp += amount
	var leveled := false
	while level < 100 and exp >= StatCalc.exp_for_level(growth_rate(), level + 1):
		level += 1
		leveled = true
	return leveled

# --- Attacken lernen ------------------------------------------------

func knows_move(move_id: String) -> bool:
	for m in moves:
		if String(m.id) == move_id:
			return true
	return false

## Neue Attacke ans Ende der Liste anhaengen (nur sinnvoll bei < 4 Attacken).
func learn_move(move_id: String) -> void:
	moves.append({ "id": move_id, "pp": _base_pp(move_id), "pp_max": _base_pp(move_id) })

## Ersetzt die Attacke an Index idx durch move_id (volle PP).
func replace_move(idx: int, move_id: String) -> void:
	moves[idx] = { "id": move_id, "pp": _base_pp(move_id), "pp_max": _base_pp(move_id) }

## Alle Attacken, die diese Spezies genau bei lvl per Level-Up lernt.
func moves_at_level(lvl: int) -> Array:
	var learnset: Dictionary = species().get("learnset", {})
	return learnset.get(str(lvl), [])

# --- Serialisierung --------------------------------------------------

func to_dict() -> Dictionary:
	return {
		"species_id": species_id, "nickname": nickname, "level": level, "exp": exp,
		"ivs": ivs.duplicate(), "evs": evs.duplicate(), "nature": nature,
		"moves": moves.duplicate(true), "current_hp": current_hp,
		"status": status, "status_counter": status_counter,
	}

static func from_dict(d: Dictionary) -> PokemonInstance:
	var p := PokemonInstance.new()
	p.species_id = d.get("species_id", "")
	p.nickname = d.get("nickname", "")
	p.level = int(d.get("level", 5))
	p.exp = int(d.get("exp", 0))
	p.ivs = (d.get("ivs", p.ivs) as Dictionary).duplicate()
	p.evs = (d.get("evs", p.evs) as Dictionary).duplicate()
	p.nature = d.get("nature", "hardy")
	p.moves = (d.get("moves", []) as Array).duplicate(true)
	p.current_hp = int(d.get("current_hp", 0))
	p.status = d.get("status", "")
	p.status_counter = int(d.get("status_counter", 0))
	if p.current_hp <= 0 and p.status == "":
		p.current_hp = p.max_hp()
	return p
