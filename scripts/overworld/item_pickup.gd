class_name ItemPickup
extends StaticBody3D
## Sichtbarer Gegenstand auf dem Boden (z. B. Beeren, verstecktes TM). Einmalig.

@export var item_id: String = "potion"
@export var amount: int = 1
@export var flag_id: String = ""

func _ready() -> void:
	if flag_id != "" and GameState.has_flag(flag_id):
		queue_free()

func interact(_player) -> void:
	if DialogueManager.active:
		return
	if flag_id != "" and GameState.has_flag(flag_id):
		queue_free()
		return
	GameState.add_item(item_id, amount)
	if flag_id != "":
		GameState.set_flag(flag_id)
	var iname := String(GameData.items.get(item_id, {}).get("name", item_id))
	var suffix := " x%d" % amount if amount > 1 else ""
	await DialogueManager.run(["Du hast %s%s gefunden!" % [iname, suffix]])
	queue_free()
