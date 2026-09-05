extends CanvasLayer
## Vollbild-Sequenz fuer eine Pokémon-Entwicklung: Blitz-Flackern, Sprite-Tausch,
## Einflug-Skalierung, Schrei. Der Spieler kann per Ja/Nein abbrechen, bevor
## die eigentliche Verwandlung passiert (Ersatz fuer "B gedrueckt halten").
## Eigene Text-/Auswahl-UI statt DialogueManager: die Battle-CanvasLayer liegt
## ueber der DialogueBox, ein Dialog waere darunter also unsichtbar, wenn eine
## Entwicklung mitten im Kampf ausgeloest wird.

signal _choice_made(cancel: bool)

@onready var _root: Control = %Root
@onready var _sprite: TextureRect = %Sprite
@onready var _msg: Label = %Message
@onready var _choice_menu: Control = %ChoiceMenu

func _ready() -> void:
	layer = 25
	_root.hide()
	_choice_menu.hide()
	%No.pressed.connect(func(): _choice_made.emit(false))
	%Yes.pressed.connect(func(): _choice_made.emit(true))

## Fuehrt die komplette Sequenz aus. Gibt true zurueck, wenn tatsaechlich
## entwickelt wurde (mon.species_id ist dann bereits aktualisiert).
func run(mon: PokemonInstance, new_species_id: String) -> bool:
	var old_name := mon.display_name()
	var old_sprite := mon.front_sprite_path()
	_sprite.texture = load(old_sprite) if ResourceLoader.exists(old_sprite) else null
	_sprite.modulate = Color(1, 1, 1)
	_sprite.scale = Vector2.ONE
	_choice_menu.hide()
	_root.show()
	var p = SceneManager.get_player()
	if p != null:
		p.set_input_locked(true)

	_msg.text = "Ha? %s entwickelt sich gerade!" % old_name
	await _wait(1.1)
	_msg.text = "Entwicklung abbrechen?"
	_choice_menu.show()
	%No.grab_focus()
	var cancel: bool = await _choice_made
	_choice_menu.hide()
	if cancel:
		_msg.text = "...Die Entwicklung wurde abgebrochen."
		await _wait(1.2)
		_finish(p)
		return false

	await _flash(6)
	mon.species_id = new_species_id
	var new_sprite := mon.front_sprite_path()
	_sprite.texture = load(new_sprite) if ResourceLoader.exists(new_sprite) else null
	await _pop_in()
	AudioManager.play_cry(mon)
	_msg.text = "Und %s hat sich zu %s entwickelt!" % [old_name, mon.display_name()]
	await _wait(1.6)

	_finish(p)
	return true

func _finish(p) -> void:
	_root.hide()
	if p != null and not BattleManager.in_battle:
		p.set_input_locked(false)

func _flash(cycles: int) -> void:
	var tw := create_tween()
	for i in cycles:
		tw.tween_property(_sprite, "modulate", Color(2.6, 2.6, 2.6), 0.09)
		tw.tween_property(_sprite, "modulate", Color(0.2, 0.2, 0.2), 0.09)
	tw.tween_property(_sprite, "modulate", Color(1, 1, 1), 0.09)
	await tw.finished

func _pop_in() -> void:
	_sprite.pivot_offset = _sprite.size * 0.5
	_sprite.scale = Vector2(0.3, 0.3)
	var tw := create_tween()
	tw.tween_property(_sprite, "scale", Vector2(1.15, 1.15), 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(_sprite, "scale", Vector2(1, 1), 0.15)
	await tw.finished

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds).timeout
