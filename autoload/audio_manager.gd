extends Node
## AudioManager (Autoload)
## Spielt Hintergrundmusik pro Karte + Kampf sowie Pokémon-Schreie. Nutzt die
## bereits im Projekt vorhandenen Original-Tracks (assets/audio/bgm) und
## -Schreie (assets/audio/cries) – rein privater Gebrauch (siehe Projektnotizen).
##
## ACHTUNG: die BGM-Dateien liegen mit WÖRTLICH prozent-kodierten Namen auf der
## Platte (z.B. "10_%20Twinleaf%20Town%20%28Day%29.mp3" – das %20/%28/%29 ist
## Teil des echten Dateinamens, keine URL-Kodierung, die noch decodiert werden
## müsste). Deshalb hier exakt so übernehmen wie `ls` sie zeigt.

const BGM_DIR := "res://assets/audio/bgm/"

const T_TWINLEAF := "10_%20Twinleaf%20Town%20%28Day%29.mp3"
const T_RIVAL := "11_%20Rival.mp3"
const T_ROUTE201 := "12_%20Route%20201%20%28Day%29.mp3"
const T_BATTLE_WILD := "15_%20Battle%21%20%28Wild%20Pok%C3%A9mon%29.mp3"
const T_VICTORY_WILD := "16_%20Victory%21%20%28Wild%20Pok%C3%A9mon%29.mp3"
const T_DAWN := "17_%20Dawn.mp3"
const T_SANDGEM := "19_%20Sandgem%20Town%20%28Day%29.mp3"
const T_LAB := "20_%20The%20Pok%C3%A9mon%20Lab.mp3"
const T_HURRY := "21_%20Hurry%20Along.mp3"
const T_CENTER := "22_%20Pok%C3%A9mon%20Center%20%28Day%29.mp3"
const T_TRAINER_EYES := "24_%20Trainers%27%20Eyes%20Meet%20%28Youngster%29.mp3"
const T_BATTLE_TRAINER := "26_%20Battle%21%20%28Trainer%20Battle%29.mp3"
const T_VICTORY_TRAINER := "27_%20Victory%21%20%28Trainer%20Battle%29.mp3"
const T_JUBILIFE := "28_%20Jubilife%20City%20%28Day%29.mp3"

## Karten-ID -> Dateiname. Nicht jede Karte hat einen passenden Original-Track
## im vorhandenen Fundus (nur früher Diamant/Perl-Spielverlauf) – für den Rest
## bleibt es beim jeweils thematisch nächsten Track statt Stille.
const MAP_BGM := {
	"player_house_1f": T_DAWN,
	"player_house_2f": T_DAWN,
	"rival_house": T_DAWN,
	"zweiblattdorf": T_TWINLEAF,
	"route201": T_ROUTE201,
	"sandgemme": T_SANDGEM,
	"proflab": T_LAB,
	"pokemart": T_CENTER,
	"pokecenter": T_CENTER,
	"route202": T_ROUTE201,
	"jubelstadt": T_JUBILIFE,
	"route203": T_ROUTE201,
	"oreburgh_gate": T_HURRY,
	"erzbingen": T_SANDGEM,
	"erzbingen_gym": T_TRAINER_EYES,
	"coal_mine": T_HURRY,
}

var _bgm: AudioStreamPlayer
var _cry: AudioStreamPlayer
var _current_key: String = ""
var _stream_cache: Dictionary = {}   # Dateiname -> AudioStream (verhindert Ruckler bei erstem Abspielen)

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_bgm = AudioStreamPlayer.new()
	_bgm.volume_db = -8.0
	add_child(_bgm)
	_cry = AudioStreamPlayer.new()
	_cry.volume_db = -4.0
	add_child(_cry)
	_preload_all_bgm()

## Alle BGM-Dateien im Hintergrund-Thread vorladen, damit `_play()` beim
## Kartenwechsel nie synchron von der Platte lesen/dekodieren muss (Ruckler-
## Vermeidung, siehe Finn-Feedback "nicht erst laden, direkt da sein").
func _preload_all_bgm() -> void:
	var files := {}
	for f in MAP_BGM.values():
		files[f] = true
	for f in [T_BATTLE_WILD, T_BATTLE_TRAINER, T_VICTORY_WILD, T_VICTORY_TRAINER]:
		files[f] = true
	for f in files.keys():
		ResourceLoader.load_threaded_request(BGM_DIR + f)

func _get_stream(filename: String) -> AudioStream:
	if _stream_cache.has(filename):
		return _stream_cache[filename]
	var path := BGM_DIR + filename
	var stream: AudioStream = null
	if ResourceLoader.has_cached(path) or ResourceLoader.load_threaded_get_status(path) == ResourceLoader.THREAD_LOAD_LOADED:
		stream = ResourceLoader.load_threaded_get(path)
	else:
		stream = load(path)   # noch nicht vorgeladen (z.B. Schnellstart) -> synchron nachladen
	_stream_cache[filename] = stream
	return stream

func play_map_bgm(map_id: String) -> void:
	_play(MAP_BGM.get(map_id, ""), "map_" + map_id, true)

func play_battle_bgm(is_wild: bool) -> void:
	_play(T_BATTLE_WILD if is_wild else T_BATTLE_TRAINER, "battle", true)

func play_victory_bgm(is_wild: bool) -> void:
	_play(T_VICTORY_WILD if is_wild else T_VICTORY_TRAINER, "victory", false)

func resume_map_bgm() -> void:
	play_map_bgm(SceneManager.current_map)

func stop_bgm() -> void:
	_bgm.stop()
	_current_key = ""

func _play(filename: String, key: String, loop: bool) -> void:
	if filename == "":
		return
	if key == _current_key and _bgm.playing:
		return
	if not ResourceLoader.exists(BGM_DIR + filename):
		push_warning("AudioManager: BGM nicht gefunden: %s" % filename)
		return
	var stream: AudioStream = _get_stream(filename)
	if stream is AudioStreamMP3:
		stream.loop = loop
	_bgm.stream = stream
	_bgm.play()
	_current_key = key

## Pokémon-Schrei abspielen (z.B. beim Einwechseln im Kampf).
func play_cry(mon) -> void:
	if mon == null:
		return
	var path: String = mon.cry_path()
	if ResourceLoader.exists(path):
		_cry.stream = load(path)
		_cry.play()
