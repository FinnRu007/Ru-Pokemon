class_name GridActor
extends CharacterBody3D
## Basis fuer alles, was sich tile-basiert (4 Richtungen, 1 Feld = 1 Weltmeter)
## ueber die Overworld bewegt: Player, RemotePlayer, NPC.
##
## Bewegung laeuft NICHT ueber Physik/Gravitation, sondern ueber einen Tween.
## Kollision wird vor dem Schritt mit test_move() geprueft.

signal step_started(direction: Vector3)
signal step_finished()
signal facing_changed(facing: String)

const TILE := 1.0

const DIRS := {
	"up":    Vector3(0, 0, -1),
	"down":  Vector3(0, 0, 1),
	"left":  Vector3(-1, 0, 0),
	"right": Vector3(1, 0, 0),
}

@export var step_time: float = 0.20

var facing: String = "down"
var facing_vec: Vector3 = Vector3(0, 0, 1)
var _moving: bool = false
var _move_tween: Tween = null

func is_moving() -> bool:
	return _moving

func set_facing(dir_name: String) -> void:
	if not DIRS.has(dir_name) or facing == dir_name:
		return
	facing = dir_name
	facing_vec = DIRS[dir_name]
	facing_changed.emit(facing)

## Versucht einen Schritt in dir_name. Gibt true zurueck, wenn der Schritt
## gestartet wurde, false wenn blockiert oder bereits in Bewegung.
func try_step(dir_name: String) -> bool:
	if _moving or not DIRS.has(dir_name):
		return false
	set_facing(dir_name)
	var motion: Vector3 = DIRS[dir_name] * TILE
	var target := global_position + motion
	var target_cell := Vector2i(roundi(target.x), roundi(target.z))
	var ledge := SceneManager.ledge_dir(target_cell)
	if ledge != "" and ledge != dir_name:
		return false   # Kante: nur aus der erlaubten Richtung begehbar (nicht hochklettern)
	if test_move(global_transform, motion):
		return false  # Feld blockiert
	_moving = true
	step_started.emit(DIRS[dir_name])
	var final_target := target
	if ledge == dir_name:
		# Original-Verhalten: von der Kante "runterhüpfen" – ein Feld weiter, wenn frei.
		var hop_transform := global_transform
		hop_transform.origin = target
		if not test_move(hop_transform, motion):
			final_target = target + motion
	_move_tween = create_tween()
	var hop_time := step_time * 1.6 if final_target != target else step_time
	_move_tween.tween_property(self, "global_position", final_target, hop_time)
	_move_tween.tween_callback(_finish_step)
	return true

func _finish_step() -> void:
	# Auf ganze Feld-Koordinaten runden, damit sich kein Drift aufbaut.
	global_position = global_position.round()
	_moving = false
	step_finished.emit()

## Sofortversetzung (Warp/Spawn): laufende Bewegung hart abbrechen.
func teleport(pos: Vector3) -> void:
	if _move_tween != null and _move_tween.is_valid():
		_move_tween.kill()
	_move_tween = null
	_moving = false
	global_position = pos.round()
