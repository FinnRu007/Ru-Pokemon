extends Node
## BattleManager (Autoload)
## Startet/beendet Kaempfe. Der Kampf ist PRIVAT (eigener Bildschirm), nach
## aussen wird nur der Status "battle" gesetzt, damit andere Spieler das
## ⚔-Icon ueber dem Kopf sehen.

signal battle_started()
signal battle_finished(result: Dictionary)   # { won, caught, fled, whiteout, mon }

const BATTLE_SCENE := preload("res://scenes/battle/Battle.tscn")

var in_battle: bool = false
var _screen: Node = null
var _engine: BattleEngine = null

func start_trainer_battle(enemy_team: Array, trainer_name: String, seed_val: int = 0) -> void:
	_begin(enemy_team, false, trainer_name, seed_val)

func start_wild_battle(enemy: PokemonInstance, seed_val: int = 0) -> void:
	_begin([enemy], true, "", seed_val)

func _begin(enemy_team: Array, wild: bool, trainer_name: String, seed_val: int) -> void:
	if in_battle:
		return
	var party := _player_party()
	if party.is_empty() or not GameState.party_has_usable():
		push_warning("BattleManager: kein kampffaehiges Pokémon – Kampf abgebrochen")
		return

	in_battle = true
	for foe in enemy_team:
		GameState.register_seen(foe.species_id)

	var player = SceneManager.get_player()
	if player != null:
		player.set_input_locked(true)
	NetworkManager.send_status("battle")
	AudioManager.play_battle_bgm(wild)

	_engine = BattleEngine.new()
	_engine.setup(party, enemy_team, wild, trainer_name, seed_val)

	_screen = BATTLE_SCENE.instantiate()
	_screen.closed.connect(_on_screen_closed)
	get_tree().root.add_child.call_deferred(_screen)
	await get_tree().process_frame
	await get_tree().process_frame
	if is_instance_valid(_screen):
		_screen.start(_engine)
		battle_started.emit()

func _on_screen_closed(_player_won: bool) -> void:
	var eng := _engine
	if is_instance_valid(_screen):
		_screen.queue_free()
	_screen = null
	_engine = null
	in_battle = false
	NetworkManager.send_status("idle")

	var result := { "won": false, "caught": false, "fled": false, "whiteout": false, "mon": null }
	if eng != null:
		match eng.winner():
			BattleEngine.Side.PLAYER:
				result.won = true
			BattleEngine.Side.ENEMY:
				result.whiteout = true
			-2:
				result.fled = true
			-3:
				result.caught = true
				if eng.caught_mon != null:
					var m: PokemonInstance = eng.caught_mon
					m.reset_battle_state()
					GameState.register_caught(m.species_id)
					GameState.add_to_party(m)
					result.mon = m

	var player = SceneManager.get_player()
	if player != null:
		player.set_input_locked(false)
	AudioManager.resume_map_bgm()

	if result.whiteout:
		_handle_whiteout()

	battle_finished.emit(result)

func _handle_whiteout() -> void:
	await get_tree().create_timer(0.2).timeout
	await DialogueManager.run(["Dir gehen die Pokémon aus ...", "Schnell zurück zum letzten Pokémon-Center!"])
	GameState.heal_party()
	GameState.add_money(-int(GameState.money * 0.3))
	await SceneManager.load_map(GameState.last_map, GameState.last_spawn)

func _player_party() -> Array:
	return GameState.party
