class_name RemotePlayer
extends GridActor
## Darstellung eines ANDEREN Spielers auf derselben Map.
## Wird vom NetworkManager (ueber die Overworld) gesteuert. Zwischen den
## empfangenen Tile-Zielen wird interpoliert -> sieht so fluessig aus wie der
## lokale Spieler.

@onready var name_label: Label3D = $NameLabel
@onready var status_icon: Label3D = $StatusIcon

var peer_id: int = 0
var _net_moving: bool = false

const FRAMES_PATH := "res://resources/characters/dawn_frames.tres"

func _ready() -> void:
	collision_layer = 2   # eigener Layer -> blockiert den lokalen Spieler nicht
	collision_mask = 0
	set_physics_process(false)
	var vis := get_node_or_null("Visual")
	if vis != null and vis.has_method("set_frames") and ResourceLoader.exists(FRAMES_PATH):
		vis.set_frames(load(FRAMES_PATH))

## RemotePlayer bewegt sich per Netzwerk, nicht per test_move.
func is_moving() -> bool:
	return _net_moving

func setup(id: int, info: Dictionary) -> void:
	peer_id = id
	global_position = info.get("pos", Vector3.ZERO)
	set_facing(info.get("facing", "down"))
	name_label.text = info.get("name", "???")
	set_status_icon(info.get("status", "idle"))

## Neues Tile-Ziel vom Netzwerk -> dorthin interpolieren.
func network_move_to(pos: Vector3, facing_name: String) -> void:
	set_facing(facing_name)
	_net_moving = true
	step_started.emit(DIRS.get(facing_name, Vector3.ZERO))
	var tw := create_tween()
	tw.tween_property(self, "global_position", pos, step_time)
	tw.tween_callback(func(): _net_moving = false; step_finished.emit())

## Design-Entscheidung: Kaempfe sind privat, aber ueber dem Kopf zeigt ein Icon,
## dass der Spieler gerade im Kampf / Tausch ist.
func set_status_icon(status: String) -> void:
	match status:
		"battle": status_icon.text = "⚔"        # gekreuzte Schwerter
		"trade":  status_icon.text = "⇄"        # Tausch-Pfeile
		_:        status_icon.text = ""
