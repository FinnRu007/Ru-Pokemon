class_name CharacterVisual
extends AnimatedSprite3D
## Steuert den Billboard-Sprite eines GridActor (Player / RemotePlayer / NPC).
## Waehlt anhand von Blickrichtung + Bewegung die passende Animation:
##   idle_down / idle_up / idle_left / idle_right
##   walk_down / walk_up / walk_left / walk_right
##
## Echte DS-Sprite-Sheets: SpriteFrames-Resource bauen (SpriteFrames-Editor ->
## "Aus Sprite-Sheet") und hier in `external_frames` eintragen. Ohne Sheet wird
## ein Platzhalter (icon.svg + Farbtoenung pro Richtung) erzeugt.

@export var external_frames: SpriteFrames
@export var walk_fps: float = 6.0
@export var static_facing: String = ""   ## fuer NPCs ohne GridActor: feste Blickrichtung

const PLACEHOLDER_TINT := {
	"down":  Color(1, 1, 1),
	"up":    Color(0.78, 0.82, 1.0),
	"left":  Color(1.0, 0.88, 0.72),
	"right": Color(0.80, 1.0, 0.86),
}

var _actor = null   # GridActor (untypisiert -> dynamischer Zugriff auf facing etc.)
var _using_placeholder := false

func _ready() -> void:
	# DS-Look: harte Pixel, kein Blur, kein Beleuchtungs-Einfluss.
	billboard = 2        # BILLBOARD_FIXED_Y
	texture_filter = 0   # TEXTURE_FILTER_NEAREST
	shaded = false
	double_sided = true
	alpha_cut = 1        # ALPHA_CUT_DISCARD – sauberer Alpha-Rand fuer Pixel-Art

	if external_frames != null:
		sprite_frames = external_frames
	else:
		sprite_frames = _build_placeholder()
		_using_placeholder = true

	_actor = get_parent()
	if _actor != null and _actor.has_signal("facing_changed"):
		_actor.facing_changed.connect(func(_f): _refresh())
		_actor.step_started.connect(func(_d): _refresh())
		_actor.step_finished.connect(_refresh)
	_refresh()

func set_frames(sf: SpriteFrames) -> void:
	external_frames = sf
	if sf != null:
		sprite_frames = sf
		_using_placeholder = false
		modulate = Color.WHITE
		_refresh()

func _process(_delta: float) -> void:
	# Platzhalter-"Laufen" andeuten: leichtes Wippen.
	if _using_placeholder and _is_moving():
		offset.y = sin(Time.get_ticks_msec() * 0.02) * 1.5
	else:
		offset.y = 0.0

func _facing() -> String:
	if static_facing != "":
		return static_facing
	if _actor != null:
		var f = _actor.get("facing")
		if f != null:
			return String(f)
	return "down"

func _is_moving() -> bool:
	return _actor != null and _actor.has_method("is_moving") and _actor.is_moving()

func _refresh() -> void:
	var f := _facing()
	if _using_placeholder:
		modulate = PLACEHOLDER_TINT.get(f, Color.WHITE)
	var key := ("walk_" if _is_moving() else "idle_") + f
	if sprite_frames != null and sprite_frames.has_animation(key):
		if animation != key or not is_playing():
			play(key)

func _build_placeholder() -> SpriteFrames:
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var tex: Texture2D = load("res://icon.svg")
	for dir in ["down", "up", "left", "right"]:
		for state in ["idle", "walk"]:
			var anim := "%s_%s" % [state, dir]
			sf.add_animation(anim)
			sf.set_animation_loop(anim, true)
			sf.set_animation_speed(anim, walk_fps if state == "walk" else 1.0)
			sf.add_frame(anim, tex)
			if state == "walk":
				sf.add_frame(anim, tex)
	return sf
