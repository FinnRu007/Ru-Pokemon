class_name Warp
extends Area3D
## Übergang zu einer anderen Map. `auto` = beim Betreten, sonst per Interaktion
## (Türen: zusätzlich `require_facing`).

@export var target_map: String = ""
@export var target_spawn: String = "SpawnPoint"
@export var auto: bool = true
@export var require_facing: String = ""

var _used: bool = false

func _ready() -> void:
	collision_layer = 0
	collision_mask = 1
	# Kurze Schonfrist: eine frisch erzeugte Area3D kann den Physik-Server dazu
	# bringen, noch im selben/naechsten Frame ein "body_entered" fuer einen Koerper
	# zu melden, der geometrisch gar nicht mehr ueberlappt (Treppen-/Tuer-Wechsel:
	# der Spieler steht bereits auf dem Nachbarfeld) – ohne die Verzoegerung
	# entsteht ein sofortiger Rueck-Warp-Loop. Monitoring daher erst nach 2
	# Physik-Frames aktivieren.
	monitoring = false
	if auto:
		body_entered.connect(_on_body_entered)
	await get_tree().physics_frame
	await get_tree().physics_frame
	if is_instance_valid(self):
		monitoring = true

func _on_body_entered(body: Node) -> void:
	if body.is_in_group("player"):
		_go(body)

func interact(player) -> void:
	if not auto:
		if require_facing != "" and player != null and player.facing != require_facing:
			return
		_go(player)

func _go(who = null) -> void:
	if _used or target_map == "":
		return
	_used = true
	# Eingabe sofort sperren – sonst könnte man während der Abblende-Zeit noch
	# ein Stück auf der alten Karte weiterlaufen (siehe TransitionManager).
	if who != null and who.has_method("set_input_locked"):
		who.set_input_locked(true)
	SceneManager.warp.call_deferred(target_map, target_spawn)
