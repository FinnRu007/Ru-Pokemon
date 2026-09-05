extends CanvasLayer
## Charakterauswahl: Junge (Lucius) oder Mädchen (Lucia).

signal chosen(gender: String)

@onready var _boy_btn: Button = %BoyButton
@onready var _girl_btn: Button = %GirlButton
@onready var _boy_portrait: TextureRect = %BoyPortrait
@onready var _girl_portrait: TextureRect = %GirlPortrait

func _ready() -> void:
	layer = 16
	process_mode = Node.PROCESS_MODE_ALWAYS
	_boy_btn.pressed.connect(func(): chosen.emit("boy"))
	_girl_btn.pressed.connect(func(): chosen.emit("girl"))
	_set_portrait(_boy_portrait, "res://assets/spritesheets/characters/clean/lucas.png")
	_set_portrait(_girl_portrait, "res://assets/spritesheets/characters/clean/dawn.png")
	_boy_btn.grab_focus()

func _set_portrait(rect: TextureRect, path: String) -> void:
	if not ResourceLoader.exists(path):
		return
	var tex: Texture2D = load(path)
	var atlas := AtlasTexture.new()
	atlas.atlas = tex
	atlas.region = Rect2(0, 0, 32, 32)   # Blick nach unten, erster Frame
	rect.texture = atlas
