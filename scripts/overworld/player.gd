class_name Player
extends GridActor
## Lokaler Spieler. WASD / Pfeiltasten fuer Bewegung, E/Enter/Leertaste fuer
## Interaktion, ESC fuer Menue (Menue-Modul folgt spaeter).
##
## Das Aussehen (Sprite + Animation) macht der Kind-Knoten "Visual"
## (CharacterVisual). Nach jedem Schritt / Richtungswechsel wird die Position
## an den NetworkManager gemeldet.

var _input_locked: bool = false
var _held_release_required: String = ""   ## Action-Name, die erst losgelassen werden muss

func _ready() -> void:
	add_to_group("player")
	step_finished.connect(_on_step_finished)
	facing_changed.connect(_on_facing_changed)
	_apply_gender_frames()

## Wird auch nach der Geschlechtswahl im Intro erneut aufgerufen.
func _apply_gender_frames() -> void:
	var vis := get_node_or_null("Visual")
	if vis == null or not vis.has_method("set_frames"):
		return
	var frames_path := "res://resources/characters/dawn_frames.tres" if GameState.player_gender == "girl" \
		else "res://resources/characters/lucas_frames.tres"
	if ResourceLoader.exists(frames_path):
		vis.set_frames(load(frames_path))

func set_input_locked(locked: bool) -> void:
	_input_locked = locked

const WALK_TIME := 0.20
const BIKE_TIME := 0.10

func _physics_process(_delta: float) -> void:
	if _input_locked or is_moving():
		return
	if _held_release_required != "":
		if Input.is_action_pressed(_held_release_required):
			return   # Taste muss erst losgelassen werden (siehe block_held_move_input)
		_held_release_required = ""
	step_time = BIKE_TIME if GameState.has_bike() else WALK_TIME
	var dir := _read_move_input()
	if dir != "":
		try_step(dir)

func _read_move_input() -> String:
	if Input.is_action_pressed("move_up"):
		return "up"
	if Input.is_action_pressed("move_down"):
		return "down"
	if Input.is_action_pressed("move_left"):
		return "left"
	if Input.is_action_pressed("move_right"):
		return "right"
	return ""

## Nach einem Warp/Teleport (Treppe, Tür, ...) aufrufen: verhindert, dass eine
## noch gehaltene Bewegungstaste sofort einen weiteren Schritt auslöst – z.B.
## direkt zurück auf die gerade verlassene Treppe. Der Spieler muss die Taste
## erst loslassen, bevor die Bewegung in dieselbe Richtung weitergeht.
func block_held_move_input() -> void:
	match _read_move_input():
		"up": _held_release_required = "move_up"
		"down": _held_release_required = "move_down"
		"left": _held_release_required = "move_left"
		"right": _held_release_required = "move_right"
		_: _held_release_required = ""

func _unhandled_input(event: InputEvent) -> void:
	if _input_locked:
		return
	if event.is_action_pressed("interact"):
		_interact()
	# "menu" (ESC) wird vom PauseMenu global behandelt

func _interact() -> void:
	var origin := global_position + Vector3.UP * 0.5
	var to := origin + facing_vec * TILE
	var params := PhysicsRayQueryParameters3D.create(origin, to)
	params.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(params)
	if hit:
		var collider = hit.get("collider")
		if collider != null:
			print("[Player] Interaktion mit: %s" % collider.name)
			if collider.has_method("interact"):
				collider.call("interact", self)
	else:
		print("[Player] Nichts zum Interagieren Richtung %s" % facing)

func _on_step_finished() -> void:
	GameState.last_position = global_position
	GameState.last_facing = facing
	NetworkManager.send_move(global_position, facing, SceneManager.current_map)

func _on_facing_changed(new_facing: String) -> void:
	GameState.last_facing = new_facing
	NetworkManager.send_move(global_position, new_facing, SceneManager.current_map)
