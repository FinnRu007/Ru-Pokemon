class_name GrassZone
extends Area3D
## Hohes Gras. Nach jedem Tile-Schritt im Gras kann ein wildes Pokémon
## erscheinen (Tabelle aus data/generated/encounters.json).

@export var table_id: String = "testmap"

var _player: Node = null

func _ready() -> void:
	collision_layer = 0
	collision_mask = 1          # Spieler ist auf Layer 1
	monitoring = true
	body_entered.connect(_on_entered)
	body_exited.connect(_on_exited)

func _on_entered(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player = body
	if body.has_signal("step_finished") and not body.step_finished.is_connected(_on_step):
		body.step_finished.connect(_on_step)

func _on_exited(body: Node) -> void:
	if body == _player:
		if body.step_finished.is_connected(_on_step):
			body.step_finished.disconnect(_on_step)
		_player = null

func _on_step() -> void:
	if BattleManager.in_battle or DialogueManager.active or MartManager.is_open:
		return
	if not GameState.party_has_usable():
		return   # ohne einsatzfähiges Pokémon keine wilden Kämpfe
	var table: Dictionary = GameData.encounters.get(table_id, {})
	if table.is_empty():
		return
	if randi() % 100 >= int(table.get("rate", 20)):
		return
	var mon := _roll(table.get("grass", []))
	if mon != null:
		GameState.register_seen(mon.species_id)
		BattleManager.start_wild_battle(mon)

func _roll(entries: Array) -> PokemonInstance:
	var total := 0
	for e in entries:
		total += int(e.get("weight", 1))
	if total <= 0:
		return null
	var r := randi() % total
	for e in entries:
		r -= int(e.get("weight", 1))
		if r < 0:
			var lvl := randi_range(int(e.get("min", 2)), int(e.get("max", 4)))
			return PokemonInstance.create(String(e.get("species", "bidoof")), lvl)
	return null
