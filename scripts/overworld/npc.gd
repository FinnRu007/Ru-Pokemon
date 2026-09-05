class_name NPC
extends StaticBody3D
## Einfacher Gespraechs-NPC. Eine Textbox pro Zeile im Feld `lines`.
## Optional andere Zeilen, sobald ein Flag gesetzt ist.

@export var npc_name: String = ""
@export_multiline var lines: String = "Hallo!"
@export var flag_after: String = ""            ## wenn gesetzt -> `lines_after` benutzen
@export_multiline var lines_after: String = ""
@export var heal_party_on_talk: bool = false   ## z. B. Schwester im Pokémon-Center

func interact(_player) -> void:
	if DialogueManager.active or BattleManager.in_battle:
		return
	var src := lines
	if flag_after != "" and GameState.has_flag(flag_after) and lines_after.strip_edges() != "":
		src = lines_after
	var pages := _pages(src)
	if pages.is_empty():
		return
	await DialogueManager.run(pages, npc_name)
	if heal_party_on_talk:
		GameState.heal_party()
		await DialogueManager.run(["Deine Pokémon sind wieder topfit!"], npc_name)

func _pages(src: String) -> Array:
	var out: Array = []
	for line in src.split("\n"):
		var t := line.strip_edges()
		if t != "":
			out.append(t)
	return out
