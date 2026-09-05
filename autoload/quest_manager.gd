extends Node
## QuestManager (Autoload)
## Leichtgewichtige Story-Fortschrittsanzeige. Nutzt GameState.story_flags.
## `current()` liefert das nächste offene Ziel (Text fürs ESC-Menü).

signal objective_changed(text: String)

# Reihenfolge der Story-Beats. done = Flag gesetzt.
const BEATS := [
	{ "flag": "visited_zweiblattdorf", "text": "Verlass dein Haus und geh nach draußen." },
	{ "flag": "got_starter",           "text": "Geh auf Route 201 (Norden) und nimm dir ein Pokémon aus dem Koffer." },
	{ "flag": "visited_sandgemme",     "text": "Folge Route 201 nach Norden bis Sandgemme." },
	{ "flag": "got_pokedex",           "text": "Besuch Professor Eibe im Labor von Sandgemme (Pokédex holen)." },
	{ "flag": "beat_logan",            "text": "Route 202: besiege Jungspund Logan und übe das Fangen." },
	{ "flag": "visited_jubelstadt",    "text": "Erreiche die Jubelstadt." },
	{ "flag": "beat_max",              "text": "Route 203: besiege Schulkind Max auf dem Weg zum Tunnel." },
	{ "flag": "got_hm_rock_smash",     "text": "Erkunde den Erzelingen-Tunnel nach Gegenständen." },
	{ "flag": "visited_erzbingen",     "text": "Folge dem Tunnel bis nach Erzelingen." },
	{ "flag": "beat_roark",            "text": "Fordere Arenaleiter Veit in der Erzelingen-Arena heraus." },
]

func _ready() -> void:
	GameState.flag_changed.connect(_on_flag_changed)

func _on_flag_changed(_flag: String, _value: bool) -> void:
	objective_changed.emit(current_text())

func current() -> Dictionary:
	for b in BEATS:
		if not GameState.has_flag(b.flag):
			return b
	return { "flag": "", "text": "Erkunde die Welt von Ru-Pokémon!" }

func current_text() -> String:
	return String(current().text)

func complete(flag: String) -> void:
	GameState.set_flag(flag)
