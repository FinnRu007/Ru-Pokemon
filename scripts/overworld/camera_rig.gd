class_name CameraRig
extends Camera3D
## Feste 2.5D-Verfolgerkamera im Stil von Pokémon Perl/Platin: schraeg von
## hinten-oben, ORTHOGRAFISCHE Projektion (keine perspektivische Stauchung),
## folgt dem Ziel weich ohne selbst zu rotieren. Dadurch wirken vertikale
## Waende/Hausfassaden immer fluchtgerecht gerade statt "verzerrt".
##
## Wird per Skript gesetzt (nicht ueber die Szenen-Transform), damit der
## Editor / Import die Kamera-Ausrichtung nicht verdreht.

@export var target_path: NodePath          ## leer -> Elternknoten
@export_range(20.0, 75.0) var pitch_deg: float = 48.0
@export_range(1.0, 20.0) var height: float = 5.0
@export_range(1.0, 20.0) var back_distance: float = 4.0
@export_range(1.0, 30.0) var follow_speed: float = 12.0
@export_range(2.0, 30.0) var ortho_size: float = 6.0

## Zwei Voreinstellungen: eng/nah für kompakte Innenräume (Wände immer im
## Bild), weiter/höher für offene Aussenkarten (sonst wirkt jede Route wie
## ein enger Flur aus Wiese – siehe Finn-Feedback "Karte passt garnicht").
const INDOOR := { "size": 5.5, "height": 5.0, "back": 4.0 }
const OUTDOOR := { "size": 9.5, "height": 7.5, "back": 6.0 }

var _target: Node3D = null
var _snap: bool = true
## Raumgrenzen (halbe Breite/Tiefe) – bei Innenräumen wird die Kamera-Position
## darauf geklemmt. Ohne das kann die Kamera bei kleinen Räumen mit Spawn nah
## an der Tür rechnerisch HINTER die Wand rutschen und blickt dann von aussen
## auf die Decke statt in den Raum (Bug, per Screenshot gefunden).
var _bounded: bool = false
var _room_hw: float = 999.0
var _room_hh: float = 999.0

## Von overworld.gd nach jedem Kartenwechsel aufgerufen.
func set_context(indoor: bool, room_hw: float = 999.0, room_hh: float = 999.0) -> void:
	var p: Dictionary = INDOOR if indoor else OUTDOOR
	ortho_size = p.size
	height = p.height
	back_distance = p.back
	size = ortho_size
	_bounded = indoor
	_room_hw = room_hw
	_room_hh = room_hh

func _ready() -> void:
	top_level = true          # Eltern-Transform ignorieren, Welt-Transform selbst setzen
	current = true
	projection = PROJECTION_ORTHOGONAL
	size = ortho_size
	_target = get_node_or_null(target_path) as Node3D
	if _target == null:
		_target = get_parent() as Node3D
	if _target != null:
		global_position = _desired_position()
	_apply_rotation()

func _physics_process(delta: float) -> void:
	if _target == null:
		return
	if _snap:
		global_position = _desired_position()
		_snap = false
	else:
		var t := clampf(follow_speed * delta, 0.0, 1.0)
		global_position = global_position.lerp(_desired_position(), t)
	_apply_rotation()

## Nach einem Warp/Map-Wechsel aufrufen, damit die Kamera nicht hinterherzieht.
func snap_now() -> void:
	_snap = true

func _desired_position() -> Vector3:
	var pos := _target.global_position + Vector3(0.0, height, back_distance)
	if _bounded:
		var margin := 0.7
		pos.x = clampf(pos.x, -_room_hw + margin, _room_hw - margin)
		pos.z = clampf(pos.z, -_room_hh + margin, _room_hh - margin)
	return pos

func _apply_rotation() -> void:
	# Nase nach unten kippen; kein Yaw/Roll.
	global_rotation = Vector3(-deg_to_rad(pitch_deg), 0.0, 0.0)
