extends Node
## NameEntryManager (Autoload)
## await NameEntryManager.ask("Wie heißt du?", 7, ["Lucius", "Julian"]) -> String

const SCENE := preload("res://scenes/ui/NameEntry.tscn")

var active: bool = false

func ask(prompt: String, max_len: int = 7, suggestions: Array = []) -> String:
	active = true
	var ui := SCENE.instantiate()
	get_tree().root.add_child.call_deferred(ui)
	await get_tree().process_frame
	await get_tree().process_frame
	ui.setup(prompt, max_len, suggestions)
	var result: String = await ui.confirmed
	ui.queue_free()
	active = false
	return result
