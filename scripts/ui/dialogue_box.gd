extends CanvasLayer
## Textbox mit Schreibmaschineneffekt + Auswahlmenue – im Look der klassischen
## Pokémon-Platin-Textbox (abgerundete Box, dunkelblauer Rahmen, cremeweisser
## Innenraum, Namensschild oben links, hüpfender "Weiter"-Pfeil). Eigene,
## prozedural erzeugte Grafik (siehe tools/make_dialogue_box.py) – kein Rip.
## Wird nur vom DialogueManager gesteuert.

signal _advanced
signal _chosen(index: int)

const BOX_TEX := preload("res://assets/ui/dialogue_box.png")
const NAME_TEX := preload("res://assets/ui/name_tag.png")
const CHOICE_TEX := preload("res://assets/ui/choice_box.png")
const ARROW_TEX := preload("res://assets/ui/arrow_indicator.png")
const BOX_MARGIN := 16
const NAME_MARGIN := 10
const CHOICE_MARGIN := 10

@onready var _panel: Control = %Panel
@onready var _name_tag: Control = %NameTag
@onready var _speaker: Label = %Speaker
@onready var _text: RichTextLabel = %Text
@onready var _choices: VBoxContainer = %Choices
@onready var _indicator: TextureRect = %Indicator

var _typing: bool = false
var _skip: bool = false
var _bob_tween: Tween = null

func _ready() -> void:
	layer = 15
	process_mode = Node.PROCESS_MODE_ALWAYS
	_style_panel(_panel, BOX_TEX, BOX_MARGIN)
	_style_panel(_name_tag, NAME_TEX, NAME_MARGIN)
	_indicator.texture = ARROW_TEX
	hide_box()

## Baut aus der pixeligen 9-Slice-Grafik eine StyleBoxTexture (Ecken bleiben
## scharf, Kanten/Mitte werden gestreckt) statt eines nackten Godot-Panels.
func _style_panel(ctrl: Control, tex: Texture2D, margin: int) -> void:
	var sb := StyleBoxTexture.new()
	sb.texture = tex
	sb.texture_margin_left = margin
	sb.texture_margin_right = margin
	sb.texture_margin_top = margin
	sb.texture_margin_bottom = margin
	ctrl.add_theme_stylebox_override("panel", sb)

func hide_box() -> void:
	_panel.hide()
	_name_tag.hide()
	_stop_bob()

func show_line(speaker: String, txt: String) -> void:
	_panel.show()
	_choices.hide()
	_name_tag.visible = speaker != ""
	_speaker.text = speaker
	_indicator.hide()
	_stop_bob()
	await _typewriter(txt)
	_indicator.show()
	_start_bob()
	await _advanced
	_stop_bob()

func show_choice(speaker: String, prompt: String, options: Array) -> int:
	_panel.show()
	_name_tag.visible = speaker != ""
	_speaker.text = speaker
	_indicator.hide()
	_stop_bob()
	await _typewriter(prompt)
	for c in _choices.get_children():
		c.queue_free()
	for i in options.size():
		var b := Button.new()
		b.text = str(options[i])
		b.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		b.add_theme_stylebox_override("normal", _choice_style())
		b.add_theme_stylebox_override("hover", _choice_style())
		b.add_theme_stylebox_override("pressed", _choice_style())
		b.add_theme_stylebox_override("focus", _choice_style())
		b.add_theme_color_override("font_color", Color(0.11, 0.13, 0.24))
		b.add_theme_color_override("font_hover_color", Color(0.28, 0.4, 0.78))
		b.add_theme_color_override("font_focus_color", Color(0.11, 0.13, 0.24))
		b.add_theme_color_override("font_pressed_color", Color(0.28, 0.4, 0.78))
		b.add_theme_color_override("font_hover_pressed_color", Color(0.28, 0.4, 0.78))
		var idx := i
		b.pressed.connect(func(): _chosen.emit(idx))
		_choices.add_child(b)
	_choices.show()
	if _choices.get_child_count() > 0:
		_choices.get_child(0).grab_focus()
	var picked: int = await _chosen
	_choices.hide()
	return picked

func _choice_style() -> StyleBoxTexture:
	var sb := StyleBoxTexture.new()
	sb.texture = CHOICE_TEX
	sb.texture_margin_left = CHOICE_MARGIN
	sb.texture_margin_right = CHOICE_MARGIN
	sb.texture_margin_top = CHOICE_MARGIN
	sb.texture_margin_bottom = CHOICE_MARGIN
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb

## Kleines Hüpfen des "Weiter"-Pfeils, solange eine Seite fertig getippt ist –
## typisches Gen4-Detail statt eines starren "▼".
func _start_bob() -> void:
	_stop_bob()
	_bob_tween = create_tween().set_loops()
	var base_y := _indicator.position.y
	_bob_tween.tween_property(_indicator, "position:y", base_y + 4, 0.35).set_trans(Tween.TRANS_SINE)
	_bob_tween.tween_property(_indicator, "position:y", base_y, 0.35).set_trans(Tween.TRANS_SINE)

func _stop_bob() -> void:
	if _bob_tween != null and _bob_tween.is_valid():
		_bob_tween.kill()
	_bob_tween = null

func _typewriter(txt: String) -> void:
	_typing = true
	_skip = false
	_text.text = txt
	_text.visible_ratio = 0.0
	var total := _text.get_total_character_count()
	var shown := 0
	while shown < total:
		if _skip:
			break
		shown += 1
		_text.visible_characters = shown
		await get_tree().create_timer(0.018).timeout
	_text.visible_characters = -1
	_typing = false

func _input(event: InputEvent) -> void:
	if not _panel.visible:
		return
	if event.is_action_pressed("interact") or event.is_action_pressed("menu"):
		if _choices.visible:
			return  # Buttons regeln das selbst
		get_viewport().set_input_as_handled()
		if _typing:
			_skip = true
		else:
			_advanced.emit()
