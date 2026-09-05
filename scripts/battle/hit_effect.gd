extends Control
## Kurzer, typfarbener Trefferblitz (expandierender, verblassender Kreis) beim
## Attacken-Einschlag. Rein prozedural gezeichnet – kein Sprite-Asset noetig.

var _color: Color = Color.WHITE
var _progress: float = 0.0

func _draw() -> void:
	var r: float = size.x * 0.5 * (0.35 + 0.65 * _progress)
	draw_circle(size * 0.5, r, Color(_color.r, _color.g, _color.b, 1.0 - _progress))
	draw_arc(size * 0.5, r, 0.0, TAU, 24, Color(1, 1, 1, (1.0 - _progress) * 0.8), 3.0)

## Spielt die Blitz-Animation ab und entfernt sich danach selbst.
func play(effect_color: Color) -> void:
	_color = effect_color
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tw := create_tween()
	tw.tween_method(_set_progress, 0.0, 1.0, 0.3).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	await tw.finished
	queue_free()

func _set_progress(p: float) -> void:
	_progress = p
	queue_redraw()
