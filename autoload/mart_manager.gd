extends Node
## MartManager (Autoload)
## Öffnet den Kauf-/Verkauf-Bildschirm. `await MartManager.closed` nach open().

signal closed()

const MENU := preload("res://scenes/ui/MartMenu.tscn")

var _menu: Node = null
var is_open: bool = false

func open(shop_name: String, stock: Array) -> void:
	if is_open:
		return
	is_open = true
	var p = SceneManager.get_player()
	if p != null:
		p.set_input_locked(true)
	_menu = MENU.instantiate()
	get_tree().root.add_child.call_deferred(_menu)
	await get_tree().process_frame
	await get_tree().process_frame
	if is_instance_valid(_menu):
		_menu.setup(shop_name, stock)
		_menu.done.connect(_close)

func _close() -> void:
	if is_instance_valid(_menu):
		_menu.queue_free()
	_menu = null
	is_open = false
	var p = SceneManager.get_player()
	if p != null and not DialogueManager.active and not BattleManager.in_battle:
		p.set_input_locked(false)
	closed.emit()
