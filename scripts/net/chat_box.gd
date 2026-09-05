extends Control
## Overworld-Chat. Standardmaessig nur das Log (unten links). Mit "chat" (T)
## oeffnet sich die Eingabezeile, Enter sendet, ESC bricht ab.

const MAX_LINES := 60

@onready var _log: RichTextLabel = %Log
@onready var _entry: LineEdit = %Entry

var _lines: int = 0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_entry.hide()
	_entry.text_submitted.connect(_on_submitted)
	NetworkManager.chat_received.connect(_on_chat_received)
	NetworkManager.player_joined.connect(func(id, info): _system("%s ist beigetreten." % info.get("name", "???")))
	NetworkManager.player_left.connect(func(id): _system("Spieler %d hat die Sitzung verlassen." % id))

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("chat") and not _entry.visible:
		_open_entry()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("menu") and _entry.visible:
		_close_entry()
		get_viewport().set_input_as_handled()

func _open_entry() -> void:
	_entry.show()
	_entry.clear()
	_entry.grab_focus()

func _close_entry() -> void:
	_entry.clear()
	_entry.hide()
	_entry.release_focus()

func _on_submitted(text: String) -> void:
	_close_entry()
	NetworkManager.send_chat(text)

func _on_chat_received(peer_id: int, text: String) -> void:
	_append("[b]%s:[/b] %s" % [NetworkManager.get_player_name(peer_id), text])

func _system(text: String) -> void:
	_append("[i][color=#88ccff]%s[/color][/i]" % text)

func _append(bbcode: String) -> void:
	_log.append_text(bbcode + "\n")
	_lines += 1
	if _lines > MAX_LINES:
		_log.remove_paragraph(0)
		_lines -= 1
