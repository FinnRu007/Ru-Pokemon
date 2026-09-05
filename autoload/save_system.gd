extends Node
## SaveSystem (Autoload)
## Speichert/laedt GameState als JSON nach user://saves/slot_<n>.json.
## Design-Entscheidung: jeder Client hat sein eigenes Savegame.

signal saved(slot: int)
signal loaded(slot: int)

const DIR := "user://saves/"
const SLOTS := 3

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(DIR)

func path(slot: int) -> String:
	return "%sslot_%d.json" % [DIR, slot]

func has_save(slot: int) -> bool:
	return FileAccess.file_exists(path(slot))

func save_game(slot: int = 0) -> bool:
	var f := FileAccess.open(path(slot), FileAccess.WRITE)
	if f == null:
		push_error("SaveSystem: kann %s nicht schreiben" % path(slot))
		return false
	f.store_string(JSON.stringify(GameState.to_save_dict(), "\t"))
	f.close()
	saved.emit(slot)
	return true

func load_game(slot: int = 0) -> bool:
	if not has_save(slot):
		return false
	var txt := FileAccess.get_file_as_string(path(slot))
	var d: Variant = JSON.parse_string(txt)
	if typeof(d) != TYPE_DICTIONARY:
		push_error("SaveSystem: %s ist beschaedigt" % path(slot))
		return false
	GameState.load_save_dict(d)
	loaded.emit(slot)
	return true

func delete_save(slot: int) -> void:
	if has_save(slot):
		DirAccess.remove_absolute(path(slot))

## Kurzinfo fuer die Slot-Auswahl (ohne alles zu laden).
func slot_summary(slot: int) -> Dictionary:
	if not has_save(slot):
		return {}
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string(path(slot)))
	if typeof(d) != TYPE_DICTIONARY:
		return { "corrupt": true }
	var secs := int(d.get("play_seconds", 0))
	return {
		"name": d.get("player_name", "?"),
		"party": (d.get("party", []) as Array).size(),
		"dex": (d.get("pokedex_caught", {}) as Dictionary).size(),
		"map": d.get("last_map", "?"),
		"time": "%d:%02d" % [secs / 3600, (secs % 3600) / 60],
	}
