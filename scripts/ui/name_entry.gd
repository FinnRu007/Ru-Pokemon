extends CanvasLayer
## Namenseingabe-Bildschirm mit Tastatur-Raster (wie im Original: Buchstaben
## antippen statt echter Tastatur – funktioniert aber auch mit der Tastatur).

signal confirmed(name_text: String)

const ROWS := [
	"ABCDEFGHIJ",
	"KLMNOPQRST",
	"UVWXYZÄÖÜ-",
]

@export var max_len: int = 7

@onready var _title: Label = %Title
@onready var _display: Label = %NameDisplay
@onready var _grid: GridContainer = %KeyGrid
@onready var _suggest_row: HBoxContainer = %SuggestRow
@onready var _confirm_btn: Button = %ConfirmButton
@onready var _back_btn: Button = %BackspaceButton

var _text: String = ""

func _ready() -> void:
	layer = 16
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build_keys()
	_back_btn.pressed.connect(_backspace)
	_confirm_btn.pressed.connect(_confirm)
	_refresh()

func setup(prompt: String, length_limit: int, suggestions: Array) -> void:
	_title.text = prompt
	max_len = length_limit
	_text = ""
	for c in _suggest_row.get_children():
		c.queue_free()
	for s in suggestions:
		var b := Button.new()
		b.text = String(s)
		b.pressed.connect(func(): _text = String(s); _refresh())
		_suggest_row.add_child(b)
	_refresh()

func _build_keys() -> void:
	for row in ROWS:
		for ch in row:
			var b := Button.new()
			b.text = ch
			b.custom_minimum_size = Vector2(40, 40)
			b.pressed.connect(func(): _type(ch))
			_grid.add_child(b)

func _type(ch: String) -> void:
	if _text.length() < max_len:
		_text += ch
		_refresh()

func _backspace() -> void:
	if _text.length() > 0:
		_text = _text.substr(0, _text.length() - 1)
		_refresh()

func _confirm() -> void:
	if _text.strip_edges() == "":
		return
	confirmed.emit(_text)

func _refresh() -> void:
	_display.text = _text if _text != "" else "_"
	_confirm_btn.disabled = _text.strip_edges() == ""

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_BACKSPACE:
			_backspace()
		elif event.keycode == KEY_ENTER:
			_confirm()
		elif event.unicode > 0 and _text.length() < max_len:
			var c := String.chr(event.unicode).to_upper()
			if c.length() == 1 and (c >= "A" and c <= "Z"):
				_type(c)
