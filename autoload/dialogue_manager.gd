extends Node
## DialogueManager (Autoload)
## Zeigt Dialog-Textboxen + Auswahlmenues. Awaitable API:
##   await DialogueManager.run(["Zeile 1", "Zeile 2"], "NPC-Name")
##   var idx := await DialogueManager.ask("Frage?", ["Ja", "Nein"])
## Sperrt waehrenddessen die Spielerbewegung.

const BOX_SCENE := preload("res://scenes/ui/DialogueBox.tscn")

var active: bool = false
var _box: Node = null

func _ready() -> void:
	_box = BOX_SCENE.instantiate()
	add_child(_box)

func run(pages: Array, speaker: String = "") -> void:
	if pages.is_empty():
		return
	_begin()
	for page in pages:
		var txt: String = page if page is String else String(page.get("text", ""))
		var spk: String = speaker if page is String else String(page.get("speaker", speaker))
		await _box.show_line(spk, txt)
	_box.hide_box()
	_end()

func ask(prompt: String, options: Array, speaker: String = "") -> int:
	_begin()
	var idx: int = await _box.show_choice(speaker, prompt, options)
	_box.hide_box()
	_end()
	return idx

func _begin() -> void:
	active = true
	var p = SceneManager.get_player()
	if p != null:
		p.set_input_locked(true)

func _end() -> void:
	active = false
	var p = SceneManager.get_player()
	if p != null and not BattleManager.in_battle:
		p.set_input_locked(false)
