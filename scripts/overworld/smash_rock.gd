class_name SmashRock
extends StaticBody3D
## Zertrümmerbarer Felsbrocken (VM Zertrümmerer). Braucht einen Orden + ein
## Team-Pokémon, dem die VM beigebracht wurde (echte HM-Mechanik, siehe
## PauseMenu._use_tm()). Nach dem Zertrümmern verschwindet der Fels
## dauerhaft (Flag) und gibt optional eine Belohnung frei.

@export var required_badge: String = "coal"
@export var required_item: String = "hm06-rock-smash"
@export var reward_item: String = ""
@export var reward_amount: int = 1
@export var flag_id: String = ""

func _ready() -> void:
	if flag_id != "" and GameState.has_flag(flag_id):
		queue_free()

func interact(_player) -> void:
	if DialogueManager.active:
		return
	if not GameState.has_badge(required_badge):
		await DialogueManager.run(["Dieser Fels ist zu hart, um ihn zu zertrümmern.",
			"Vielleicht hilft ein Orden und die passende VM."])
		return
	var move_id := String(GameData.items.get(required_item, {}).get("teaches", ""))
	if not GameState.party_knows_move(move_id):
		var iname := String(GameData.items.get(required_item, {}).get("name", required_item))
		if GameState.has_item(required_item):
			await DialogueManager.run(["Eines deiner Pokémon müsste zuerst %s beherrschen." % iname,
				"Öffne den Beutel und bring es einem Pokémon bei."])
		else:
			await DialogueManager.run(["Du bräuchtest %s, um Felsen zu zertrümmern." % iname])
		return
	await DialogueManager.run(["Du benutzt Zertrümmerer!", "Der Felsen zerbricht in Stücke!"])
	if flag_id != "":
		GameState.set_flag(flag_id)
	if reward_item != "":
		GameState.add_item(reward_item, reward_amount)
		var iname := String(GameData.items.get(reward_item, {}).get("name", reward_item))
		await DialogueManager.run(["Du hast %s gefunden!" % iname])
	queue_free()
