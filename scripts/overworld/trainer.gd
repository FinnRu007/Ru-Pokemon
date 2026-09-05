class_name TrainerNPC
extends StaticBody3D
## Trainer auf der Overworld. Sichtlinie: blickt in `facing`-Richtung; betritt der
## Spieler diese Linie (bis `sight_range` Felder, frei von Hindernissen), erscheint
## ein "!" – der Trainer läuft heran und fordert dich heraus.

const DIRS := {
	"up": Vector3(0, 0, -1), "down": Vector3(0, 0, 1),
	"left": Vector3(-1, 0, 0), "right": Vector3(1, 0, 0),
}
const OPP := { "up": "down", "down": "up", "left": "right", "right": "left" }

@export var trainer_name: String = "Käfersammler Klaus"
@export var species_list: PackedStringArray = ["starly", "chimchar"]
@export var level_list: PackedInt32Array = [7, 8]
@export var prize_money: int = 400
@export var facing: String = "down"
@export var sight_range: int = 4
@export_multiline var pre_text: String = "Zeit für einen Kampf!"
@export_multiline var win_text: String = "Nicht schlecht ..."
@export var defeat_flag: String = ""
@export var badge_id: String = ""      ## gesetzt -> dieser Trainer ist ein Arenaleiter
@export var badge_name: String = ""

var _defeated: bool = false
var _busy: bool = false
var _player: Node = null

func _ready() -> void:
	add_to_group("trainers")

func bind_player(p: Node) -> void:
	_player = p
	if p != null and p.has_signal("step_finished") and not p.step_finished.is_connected(_on_player_step):
		p.step_finished.connect(_on_player_step)

func _beaten() -> bool:
	return _defeated or (defeat_flag != "" and GameState.has_flag(defeat_flag))

# --- Sichtlinie -----------------------------------------------------

func _on_player_step() -> void:
	if _busy or _beaten() or BattleManager.in_battle or DialogueManager.active:
		return
	if _player == null or not is_instance_valid(_player):
		return
	var dir: Vector3 = DIRS.get(facing, Vector3.FORWARD)
	var ox := roundi(global_position.x)
	var oz := roundi(global_position.z)
	var px := roundi(_player.global_position.x)
	var pz := roundi(_player.global_position.z)
	for step in range(1, sight_range + 1):
		var tx := ox + int(dir.x) * step
		var tz := oz + int(dir.z) * step
		if _tile_blocked(Vector3(tx, 0, tz)):
			return
		if tx == px and tz == pz:
			_busy = true
			await _spot(step)
			return

func _tile_blocked(tile: Vector3) -> bool:
	var params := PhysicsPointQueryParameters3D.new()
	params.position = Vector3(tile.x, 0.5, tile.z)
	params.collision_mask = 1
	var ex: Array[RID] = [get_rid()]
	if _player != null and _player.has_method("get_rid"):
		ex.append(_player.get_rid())
	params.exclude = ex
	var hits := get_world_3d().direct_space_state.intersect_point(params, 4)
	return hits.size() > 0

# --- Ausrufezeichen + Heranlaufen + Kampf -------------------------

func _spot(distance: int) -> void:
	if _player.has_method("set_input_locked"):
		_player.set_input_locked(true)
	var mark := Label3D.new()
	mark.text = "!"
	mark.font_size = 120
	mark.billboard = 1
	mark.modulate = Color(1, 0.9, 0.2)
	mark.position = Vector3(0, 1.9, 0)
	add_child(mark)
	await get_tree().create_timer(0.7).timeout
	mark.queue_free()

	var dir: Vector3 = DIRS.get(facing, Vector3.FORWARD)
	for i in max(0, distance - 1):
		var tw := create_tween()
		tw.tween_property(self, "global_position", global_position + dir, 0.18)
		await tw.finished

	if _player.has_method("set_facing"):
		_player.set_facing(OPP.get(facing, "down"))

	await DialogueManager.run(_pages(pre_text), trainer_name)

	var team: Array = []
	for i in species_list.size():
		var lvl := level_list[i] if i < level_list.size() else 5
		team.append(PokemonInstance.create(String(species_list[i]), lvl))
	if team.is_empty():
		team.append(PokemonInstance.create("bidoof", 5))

	BattleManager.battle_finished.connect(_on_battle_finished, CONNECT_ONE_SHOT)
	BattleManager.start_trainer_battle(team, trainer_name)

func interact(_p) -> void:
	if _busy or DialogueManager.active or BattleManager.in_battle:
		return
	if _beaten():
		await DialogueManager.run(["Du bist wirklich stark geworden!"], trainer_name)
		return
	_busy = true
	await _spot(1)

func _on_battle_finished(result: Dictionary) -> void:
	if _player != null and is_instance_valid(_player) and _player.has_method("set_input_locked"):
		if not DialogueManager.active:
			_player.set_input_locked(false)
	# kurze Sperre, damit man nach dem Kampf erst weglaufen kann
	await get_tree().create_timer(1.0).timeout
	_busy = false
	if not result.get("won", false):
		return
	_defeated = true
	if defeat_flag != "":
		GameState.set_flag(defeat_flag)
	GameState.add_money(prize_money)
	var lines := _pages(win_text) + ["Du erhältst %d ₽!" % prize_money]
	if badge_id != "":
		GameState.add_badge(badge_id, badge_name)
		lines.append("%s hat dir den %s verliehen!" % [trainer_name, GameState.badges.get(badge_id, badge_name)])
	await DialogueManager.run(lines, trainer_name)

func _pages(src: String) -> Array:
	var out: Array = []
	for line in src.split("\n"):
		var t := line.strip_edges()
		if t != "":
			out.append(t)
	return out
