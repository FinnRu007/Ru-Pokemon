extends Control
## Titel-/Multiplayer-Menue: Spielername, Solo spielen, Server hosten,
## einem Server beitreten (IP). Sendet die Auswahl an Main.

signal play_solo_requested(player_name: String)
signal host_requested(player_name: String)
signal join_requested(player_name: String, address: String)
signal continue_requested()

@onready var _name_edit: LineEdit = %NameEdit
@onready var _ip_edit: LineEdit = %IpEdit
@onready var _status: Label = %StatusLabel
@onready var _solo_btn: Button = %SoloButton
@onready var _host_btn: Button = %HostButton
@onready var _join_btn: Button = %JoinButton
@onready var _continue_btn: Button = %ContinueButton

func _ready() -> void:
	_continue_btn.pressed.connect(func(): continue_requested.emit())
	_solo_btn.pressed.connect(func(): play_solo_requested.emit(_name()))
	_host_btn.pressed.connect(func(): host_requested.emit(_name()))
	_join_btn.pressed.connect(func(): join_requested.emit(_name(), _ip_edit.text.strip_edges()))
	_status.text = ""
	_continue_btn.hide()
	_name_edit.grab_focus()

func set_has_save(has: bool) -> void:
	if not is_node_ready():
		await ready
	_continue_btn.visible = has

func _name() -> String:
	var n := _name_edit.text.strip_edges()
	return n if n != "" else "Spieler"

func set_name_text(value: String) -> void:
	if is_node_ready():
		_name_edit.text = value
	else:
		await ready
		_name_edit.text = value

func set_status(text: String) -> void:
	if not is_node_ready():
		await ready
	_status.text = text
