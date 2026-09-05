extends Node
## SceneManager (Autoload)
## Besitzt die aktuelle Overworld-Instanz und steuert Map-Wechsel / Warps.
## Meldet Map-Wechsel an GameState (Savegame) und NetworkManager (Sichtbarkeit).

const OVERWORLD_SCENE := preload("res://scenes/overworld/Overworld.tscn")

## Knoten, unter dem die Overworld haengt. Wird von Main gesetzt (Low-Res
## SubViewport). Fallback: aktuelle Szene.
var world_root: Node = null

var current_map: String = ""
var _overworld = null   # Overworld-Instanz (untypisiert -> dynamischer Zugriff)

## Weltzelle (gerundete x/z) -> erlaubte Richtung ("up"/"down"/"left"/"right").
## Ein "Kante"/"Ledge"-Feld darf nur AUS dieser Richtung betreten werden (wie
## im Original: man kann runterhüpfen, aber nicht hochklettern). Wird bei
## jedem Kartenwechsel neu aus data/maps.json[<map>]["ledges"] gebaut.
var ledges: Dictionary = {}

func ledge_dir(cell: Vector2i) -> String:
	return String(ledges.get(cell, ""))

func _build_ledges(map_id: String) -> Dictionary:
	var out := {}
	var d: Dictionary = GameData.maps.get(map_id, {})
	for l in d.get("ledges", []):
		var at: Array = l.get("at", [0, 0])
		out[Vector2i(int(at[0]), int(at[1]))] = String(l.get("dir", "down"))
	return out

func _ensure_overworld() -> void:
	if _overworld != null and is_instance_valid(_overworld):
		return
	_overworld = OVERWORLD_SCENE.instantiate()
	var parent: Node = world_root if (world_root != null and is_instance_valid(world_root)) else get_tree().current_scene
	parent.add_child(_overworld)

## Laedt res://scenes/overworld/maps/<map_id>.tscn und setzt den Spieler an
## den Marker <spawn_name>. Blendet dabei kurz ab/auf (TransitionManager) –
## damit man beim Kartenwechsel nie einen Frame lang alte Geometrie oder den
## Himmel-Hintergrund "im Leeren" sieht.
func load_map(map_id: String, spawn_name: String = "SpawnPoint") -> void:
	await TransitionManager.fade_out()
	_ensure_overworld()
	current_map = map_id
	GameState.last_map = map_id
	GameState.last_spawn = spawn_name
	GameState.set_flag("visited_" + map_id)
	NetworkManager.local_info["map"] = map_id
	ledges = _build_ledges(map_id)
	_overworld.load_map(map_id, spawn_name)
	await get_tree().process_frame   # sicherstellen: neue Geometrie ist gerendert, bevor wir aufblenden
	await TransitionManager.fade_in()

func warp(map_id: String, spawn_name: String) -> void:
	await load_map(map_id, spawn_name)

func get_player():
	if _overworld != null and is_instance_valid(_overworld):
		return _overworld.get_local_player()
	return null
