class_name MapBase
extends Node3D
## Basis fuer jede Overworld-Map. Konkrete Maps (maps/*.tscn) haengen hier
## ihr glTF-Mesh (Apicula-Export), Kollision, Spawn-Marker, Encounter-Zonen
## und NPC-Spawns dran.

@export var map_id: String = ""
@export var display_name: String = ""
@export var bgm: String = ""   # Key in AudioManager (spaeteres Modul)

## Weltposition eines Spawn-/Warp-Markers. Fallback: (0,0,0).
func get_spawn(spawn_name: String) -> Vector3:
	var n := get_node_or_null(NodePath(spawn_name))
	if n != null and n is Node3D:
		return (n as Node3D).global_position
	push_warning("Map '%s': Spawn '%s' nicht gefunden, nutze (0,0,0)" % [map_id, spawn_name])
	return Vector3.ZERO
