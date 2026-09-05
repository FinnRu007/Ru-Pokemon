class_name Gate
extends StaticBody3D
## Blockade, die verschwindet, sobald `open_flag` gesetzt ist. Solange sie steht,
## gibt sie bei Interaktion `block_text` aus (z. B. Rivale/NPC, der den Weg
## versperrt).

@export var open_flag: String = ""
@export var npc_name: String = ""
@export_multiline var block_text: String = "Da geht es gerade nicht weiter."
@export_multiline var open_text: String = ""

@onready var _mesh: Node3D = get_node_or_null("Mesh")
@onready var _col: CollisionShape3D = get_node_or_null("CollisionShape3D")

func _ready() -> void:
	GameState.flag_changed.connect(func(_f, _v): _refresh())
	_refresh()

func _blocking() -> bool:
	return open_flag != "" and not GameState.has_flag(open_flag)

func _refresh() -> void:
	var blocking := _blocking()
	collision_layer = 1 if blocking else 0
	if _mesh:
		_mesh.visible = blocking
	if _col:
		_col.disabled = not blocking

func interact(_player) -> void:
	if DialogueManager.active:
		return
	if _blocking():
		await DialogueManager.run(_pages(block_text), npc_name)
	elif open_text.strip_edges() != "":
		await DialogueManager.run(_pages(open_text), npc_name)

func _pages(src: String) -> Array:
	var out: Array = []
	for line in src.split("\n"):
		var t := line.strip_edges()
		if t != "":
			out.append(t)
	return out
