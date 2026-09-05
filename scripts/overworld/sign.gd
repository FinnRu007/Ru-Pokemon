class_name Sign
extends StaticBody3D
## Schild / Objekt mit kurzem Text (kein Name).

@export_multiline var text: String = "Ein Schild."

func interact(_player) -> void:
	if DialogueManager.active:
		return
	var pages: Array = []
	for line in text.split("\n"):
		var t := line.strip_edges()
		if t != "":
			pages.append(t)
	if not pages.is_empty():
		await DialogueManager.run(pages)
