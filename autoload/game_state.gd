extends Node
## GameState (Autoload)
## Dynamischer Fortschritt des LOKALEN Spielers. Rein clientseitig.
## Wird von SaveSystem als JSON nach user://saves/ geschrieben.

signal party_changed()
signal inventory_changed()
signal pokedex_changed()
signal money_changed(new_amount: int)
signal flag_changed(flag: String, value: bool)
signal badges_changed()

var player_name: String = "Spieler"
var player_gender: String = "boy"    ## "boy" (Lucius) oder "girl" (Lucia)
var rival_name: String = "Barry"
var trainer_id: int = 0
var play_seconds: float = 0.0

var party: Array = []            # Array[PokemonInstance] (max 6)
var box: Array = []              # PC-Box (Array[PokemonInstance])
var inventory: Dictionary = {}   # "potion" -> Anzahl
var money: int = 3000

var story_flags: Dictionary = {}     # "got_starter" -> true
var pokedex_seen: Dictionary = {}    # "starly" -> true
var pokedex_caught: Dictionary = {}
var badges: Dictionary = {}          # "coal" -> "Steinorden" (Anzeigename)

var last_map: String = "player_house_2f"
var last_spawn: String = "SpawnPoint"
var last_position: Vector3 = Vector3.ZERO
var last_facing: String = "down"

const MAX_PARTY := 6

func _process(delta: float) -> void:
	play_seconds += delta

# --- Neues Spiel -----------------------------------------------------

func new_game(chosen_name: String = "Spieler", gender: String = "boy", rival: String = "Barry") -> void:
	player_name = chosen_name
	player_gender = gender if gender in ["boy", "girl"] else "boy"
	rival_name = rival if rival.strip_edges() != "" else "Barry"
	trainer_id = randi() % 100000
	play_seconds = 0.0
	party.clear()
	box.clear()
	inventory = { "poke-ball": 5, "potion": 3 }
	money = 3000
	story_flags.clear()
	pokedex_seen.clear()
	pokedex_caught.clear()
	badges.clear()
	last_map = "player_house_2f"
	last_spawn = "SpawnPoint"
	last_position = Vector3.ZERO
	last_facing = "down"

# --- Flags ---------------------------------------------------------

func set_flag(flag: String, value: bool = true) -> void:
	if bool(story_flags.get(flag, false)) == value:
		return
	story_flags[flag] = value
	flag_changed.emit(flag, value)

func has_flag(flag: String) -> bool:
	return bool(story_flags.get(flag, false))

# --- Orden -----------------------------------------------------------

func add_badge(id: String, display_name: String = "") -> void:
	if badges.has(id):
		return
	badges[id] = display_name if display_name != "" else id.capitalize()
	badges_changed.emit()

func has_badge(id: String) -> bool:
	return badges.has(id)

func badge_count() -> int:
	return badges.size()

## Fahrrad beschleunigt die Bewegung (siehe player.gd).
func has_bike() -> bool:
	return has_item("bicycle")

# --- Party -------------------------------------------------------

func add_to_party(mon) -> bool:
	if party.size() >= MAX_PARTY:
		box.append(mon)
		party_changed.emit()
		return false
	party.append(mon)
	party_changed.emit()
	return true

func party_has_usable() -> bool:
	for p in party:
		if not p.is_fainted():
			return true
	return false

## Fuer VM-Feldeinsatz (z. B. Zertrümmerer): muss ein Pokémon im Team können,
## nicht nur im Beutel liegen.
func party_knows_move(move_id: String) -> bool:
	for p in party:
		if p.knows_move(move_id):
			return true
	return false

func heal_party() -> void:
	for p in party:
		p.heal_full()
	party_changed.emit()

# --- Inventar --------------------------------------------------

func add_item(item_id: String, amount: int = 1) -> void:
	inventory[item_id] = int(inventory.get(item_id, 0)) + amount
	if inventory[item_id] <= 0:
		inventory.erase(item_id)
	inventory_changed.emit()

func remove_item(item_id: String, amount: int = 1) -> bool:
	if int(inventory.get(item_id, 0)) < amount:
		return false
	add_item(item_id, -amount)
	return true

func item_count(item_id: String) -> int:
	return int(inventory.get(item_id, 0))

func has_item(item_id: String) -> bool:
	return item_count(item_id) > 0

func items_in_category(category: String) -> Array:
	var out: Array = []
	for id in inventory:
		if String(GameData.items.get(id, {}).get("category", "items")) == category:
			out.append(id)
	out.sort()
	return out

func add_money(amount: int) -> void:
	money = max(0, money + amount)
	money_changed.emit(money)

# --- Pokédex -------------------------------------------------

func register_seen(species_id: String) -> void:
	if not pokedex_seen.has(species_id):
		pokedex_seen[species_id] = true
		pokedex_changed.emit()

func register_caught(species_id: String) -> void:
	pokedex_seen[species_id] = true
	if not pokedex_caught.has(species_id):
		pokedex_caught[species_id] = true
		pokedex_changed.emit()

func seen_count() -> int:
	return pokedex_seen.size()

func caught_count() -> int:
	return pokedex_caught.size()

# --- Netzwerk-Info -------------------------------------------

func to_network_info() -> Dictionary:
	return {
		"name": player_name, "map": last_map, "pos": last_position,
		"facing": last_facing, "status": "idle",
	}

# --- Savegame-Serialisierung -------------------------------

func to_save_dict() -> Dictionary:
	return {
		"version": 1,
		"player_name": player_name,
		"player_gender": player_gender,
		"rival_name": rival_name,
		"trainer_id": trainer_id,
		"play_seconds": play_seconds,
		"money": money,
		"party": party.map(func(p): return p.to_dict()),
		"box": box.map(func(p): return p.to_dict()),
		"inventory": inventory.duplicate(),
		"story_flags": story_flags.duplicate(),
		"pokedex_seen": pokedex_seen.duplicate(),
		"pokedex_caught": pokedex_caught.duplicate(),
		"badges": badges.duplicate(),
		"last_map": last_map,
		"last_spawn": last_spawn,
		"last_position": [last_position.x, last_position.y, last_position.z],
		"last_facing": last_facing,
	}

func load_save_dict(d: Dictionary) -> void:
	player_name = d.get("player_name", "Spieler")
	player_gender = d.get("player_gender", "boy")
	rival_name = d.get("rival_name", "Barry")
	trainer_id = int(d.get("trainer_id", 0))
	play_seconds = float(d.get("play_seconds", 0.0))
	money = int(d.get("money", 3000))
	party = (d.get("party", []) as Array).map(func(x): return PokemonInstance.from_dict(x))
	box = (d.get("box", []) as Array).map(func(x): return PokemonInstance.from_dict(x))
	inventory = (d.get("inventory", {}) as Dictionary).duplicate()
	story_flags = (d.get("story_flags", {}) as Dictionary).duplicate()
	pokedex_seen = (d.get("pokedex_seen", {}) as Dictionary).duplicate()
	pokedex_caught = (d.get("pokedex_caught", {}) as Dictionary).duplicate()
	badges = (d.get("badges", {}) as Dictionary).duplicate()
	last_map = d.get("last_map", "player_house_2f")
	last_spawn = d.get("last_spawn", "SpawnPoint")
	var p: Array = d.get("last_position", [0, 0, 0])
	last_position = Vector3(p[0], p[1], p[2])
	last_facing = d.get("last_facing", "down")
	party_changed.emit()
	inventory_changed.emit()
	pokedex_changed.emit()
