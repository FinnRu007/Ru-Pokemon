extends Node
## Einstiegspunkt: zeigt das Multiplayer-Menue (Solo / Host / Beitreten),
## startet danach die Overworld im Low-Res-SubViewport (DS-Optik) und blendet
## die Chat-Box ein.

const MULTIPLAYER_MENU := preload("res://scenes/ui/MultiplayerMenu.tscn")
const CHAT_BOX := preload("res://scenes/ui/ChatBox.tscn")
const PAUSE_MENU := preload("res://scenes/ui/PauseMenu.tscn")
const GENDER_SELECT := preload("res://scenes/ui/GenderSelect.tscn")

## Vorschlagsnamen für die Namenseingabe (wie im Original: kurze Auswahlliste
## über der Tastatur, freie Eingabe bleibt möglich).
const BOY_NAMES := ["Lucius", "Julian", "Finn", "Noah"]
const GIRL_NAMES := ["Lucia", "Mia", "Lea", "Emma"]
const RIVAL_NAMES := ["Barry", "Ronja", "Mia", "Leon"]

## Fallback-Belegung, falls project.godot die Input-Actions nicht laedt.
const DEFAULT_KEYS := {
	"move_up":    [KEY_W, KEY_UP],
	"move_down":  [KEY_S, KEY_DOWN],
	"move_left":  [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"interact":   [KEY_E, KEY_ENTER, KEY_SPACE],
	"menu":       [KEY_ESCAPE],
	"chat":       [KEY_T],
}

@onready var _world: SubViewport = $WorldViewport/SubViewport
@onready var _ui: CanvasLayer = $UILayer

var _menu = null   # MultiplayerMenu-Instanz (untypisiert)
var _chat = null   # ChatBox-Instanz (untypisiert)
var _pause = null  # PauseMenu-Instanz
var _continue := false

func _ready() -> void:
	_ensure_input_map()
	SceneManager.world_root = _world

	NetworkManager.connection_succeeded.connect(_on_connected)
	NetworkManager.connection_failed.connect(_on_connection_failed)
	NetworkManager.server_disconnected.connect(_on_server_disconnected)

	_show_menu()

# --- Menue ---------------------------------------------------------------

func _show_menu(status: String = "") -> void:
	if _menu != null and is_instance_valid(_menu):
		_menu.queue_free()
	_menu = MULTIPLAYER_MENU.instantiate()
	_menu.process_mode = Node.PROCESS_MODE_ALWAYS
	_ui.add_child(_menu)
	_menu.play_solo_requested.connect(_start_solo)
	_menu.host_requested.connect(_start_host)
	_menu.join_requested.connect(_start_join)
	if _menu.has_signal("continue_requested"):
		_menu.continue_requested.connect(_start_continue)
		_menu.set_has_save(SaveSystem.has_save(0))
	_menu.set_name_text(GameState.player_name)
	if status != "":
		_menu.set_status(status)

func _start_solo(_player_name: String) -> void:
	await _run_intro()
	_continue = false
	_enter_world()

func _start_continue() -> void:
	if not SaveSystem.load_game(0):
		_menu.set_status("Kein Spielstand gefunden.")
		return
	_apply_name(GameState.player_name)
	_continue = true
	_enter_world()

func _start_host(player_name: String) -> void:
	if not SaveSystem.has_save(0):
		await _run_intro()
	else:
		SaveSystem.load_game(0)
		_apply_name(player_name)
	var err := NetworkManager.host_game(GameState.player_name)
	if err != OK:
		_menu.set_status("Host fehlgeschlagen (Fehler %d) – Port %d frei?" % [err, NetworkManager.PORT])
		return
	_enter_world()

func _start_join(player_name: String, address: String) -> void:
	# Design-Entscheidung: Client bringt sein eigenes Savegame mit.
	if SaveSystem.has_save(0):
		SaveSystem.load_game(0)
		_apply_name(player_name)
	else:
		await _run_intro()
	var err := NetworkManager.join_game(address, GameState.player_name)
	if err != OK:
		if _menu != null and is_instance_valid(_menu):
			_menu.set_status("Beitritt fehlgeschlagen (Fehler %d)" % err)
		return
	if _menu != null and is_instance_valid(_menu):
		_menu.set_status("Verbinde mit %s ..." % address)

# --- Intro-Sequenz (Charakterauswahl + Namenseingabe) -----------------

## Volle Original-Intro: Professor Eibe erklärt die Pokémon-Welt, fragt nach
## Geschlecht, Name und dem Namen des Rivalen/der Rivalin. Eigener Wortlaut
## (keine wörtliche Übernahme des Originalscripts).
func _run_intro() -> void:
	if _menu != null and is_instance_valid(_menu):
		_menu.queue_free()
		_menu = null

	await get_tree().process_frame
	await DialogueManager.run([
		"Hallo! Willkommen in der Welt der POKÉMON!",
		"Mein Name ist Eibe. Alle nennen mich nur den Pokémon-Professor.",
		"Diese Welt wird von Wesen namens Pokémon bevölkert.",
		"Wir Menschen leben, spielen und arbeiten Seite an Seite mit ihnen – manche als Freunde, manche als Partner in spannenden Wettkämpfen.",
		"Ich erforsche die Beziehung zwischen Menschen und Pokémon schon mein ganzes Leben lang.",
		"Aber genug von mir – bevor es losgeht, will ich mehr über dich erfahren.",
	], "Professor Eibe")

	var gender := await _ask_gender()
	var name_suggestions := BOY_NAMES if gender == "boy" else GIRL_NAMES

	var player_name: String = await NameEntryManager.ask("Wie soll dein Name sein?", 7, name_suggestions)
	player_name = player_name.strip_edges()
	if player_name == "":
		player_name = name_suggestions[0]

	await DialogueManager.run([
		"Aha, du heißt also %s! Ein guter Name für ein großes Abenteuer." % player_name,
		"Weißt du was? Genau in diesem Moment ist noch jemand hier im Dorf ganz aufgeregt.",
		"Er bzw. sie wohnt gleich nebenan und wird schon bald genau wie du als Trainer loslegen.",
		"Wie hieß die Person nochmal ...? Gib mir den Namen ein, dann fällt es mir bestimmt wieder ein.",
	], "Professor Eibe")

	var rival_name: String = await NameEntryManager.ask("Wie heißt dein Rivale?", 7, RIVAL_NAMES)
	rival_name = rival_name.strip_edges()
	if rival_name == "":
		rival_name = RIVAL_NAMES[0]

	await DialogueManager.run([
		"%s, richtig! Ich bin gespannt, was aus euch beiden wird." % rival_name,
		"%s, dein Abenteuer beginnt gleich zu Hause in Zweiblattdorf – du wohnst im Zimmer oben.",
		"Geh erst mal nach unten, sieh dich in Ruhe um und dann raus ins Dorf.",
		"Wenn du bereit bist, findest du mich auf Route 201, gleich nördlich vom Dorf.",
	], "Professor Eibe")

	GameState.new_game(player_name, gender, rival_name)
	GameState.set_flag("intro_done")
	_apply_name(player_name)

func _ask_gender() -> String:
	var gs := GENDER_SELECT.instantiate()
	gs.process_mode = Node.PROCESS_MODE_ALWAYS
	_ui.add_child(gs)
	var gender: String = await gs.chosen
	gs.queue_free()
	return gender

func _apply_name(player_name: String) -> void:
	player_name = player_name.strip_edges()
	if player_name == "":
		player_name = "Spieler"
	GameState.player_name = player_name
	NetworkManager.local_info["name"] = player_name

# --- Netzwerk-Callbacks -----------------------------------------------

func _on_connected() -> void:
	_enter_world()

func _on_connection_failed() -> void:
	_show_menu("Verbindung fehlgeschlagen – IP korrekt? Host online?")

func _on_server_disconnected() -> void:
	if SceneManager.get_player() != null:
		SceneManager.get_player().set_input_locked(true)
	if _chat != null and is_instance_valid(_chat):
		_chat.queue_free()
		_chat = null
	_show_menu("Host getrennt. Erneut beitreten.")

# --- Welt betreten ---------------------------------------------------

func _enter_world() -> void:
	if _menu != null and is_instance_valid(_menu):
		_menu.queue_free()
		_menu = null

	await SceneManager.load_map(GameState.last_map, GameState.last_spawn)
	var p = SceneManager.get_player()
	if p != null:
		NetworkManager.local_info["pos"] = p.global_position
		NetworkManager.local_info["facing"] = p.facing
		p.set_input_locked(false)
	NetworkManager.announce()

	if _chat == null or not is_instance_valid(_chat):
		_chat = CHAT_BOX.instantiate()
		_ui.add_child(_chat)

	if _pause == null or not is_instance_valid(_pause):
		_pause = PAUSE_MENU.instantiate()
		_ui.add_child(_pause)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("menu") and _pause != null and is_instance_valid(_pause):
		if not _pause.is_open and not DialogueManager.active and not BattleManager.in_battle:
			_pause.open()

# --- Input-Fallback -------------------------------------------------

func _ensure_input_map() -> void:
	for action in DEFAULT_KEYS.keys():
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		if InputMap.action_get_events(action).is_empty():
			for keycode in DEFAULT_KEYS[action]:
				var ev := InputEventKey.new()
				ev.physical_keycode = keycode
				InputMap.action_add_event(action, ev)
