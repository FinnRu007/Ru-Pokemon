class_name Shopkeeper
extends StaticBody3D
## Verkäufer im Pokémon-Markt.

@export var shop_name: String = "Pokémon-Markt"
@export var stock: PackedStringArray = ["poke-ball", "potion", "antidote", "paralyze-heal"]

func interact(_player) -> void:
	if DialogueManager.active or BattleManager.in_battle or MartManager.is_open:
		return
	await DialogueManager.run(["Hallo! Womit kann ich dienen?"], shop_name)
	await MartManager.open(shop_name, Array(stock))
	await MartManager.closed
	await DialogueManager.run(["Schau bald wieder rein!"], shop_name)
