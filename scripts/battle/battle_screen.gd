extends CanvasLayer
## Kampfbildschirm: spielt die Event-Liste der BattleEngine ab und nimmt die
## Eingaben des Spielers entgegen. Rundenlogik steckt komplett in der Engine.

signal closed(player_won: bool)
signal _forget_chosen(idx: int)

const ENEMY := 1   # BattleEngine.Side.ENEMY
const PLAYER := 0

const HIT_EFFECT_SCRIPT := preload("res://scripts/battle/hit_effect.gd")
const TYPE_COLORS := {
	"normal": Color(0.78, 0.78, 0.62), "fire": Color(0.93, 0.4, 0.25),
	"water": Color(0.3, 0.55, 0.95), "electric": Color(0.97, 0.82, 0.2),
	"grass": Color(0.4, 0.8, 0.35), "ice": Color(0.6, 0.9, 0.92),
	"fighting": Color(0.7, 0.25, 0.2), "poison": Color(0.6, 0.3, 0.65),
	"ground": Color(0.85, 0.7, 0.4), "flying": Color(0.6, 0.6, 0.95),
	"psychic": Color(0.95, 0.35, 0.55), "bug": Color(0.6, 0.7, 0.15),
	"rock": Color(0.7, 0.6, 0.3), "ghost": Color(0.4, 0.35, 0.6),
	"dragon": Color(0.45, 0.3, 0.95), "dark": Color(0.4, 0.35, 0.3),
	"steel": Color(0.7, 0.7, 0.78), "fairy": Color(0.93, 0.6, 0.8),
}

@onready var _root: Control = %Root
@onready var _msg: Label = %Message
@onready var _action_menu: Control = %ActionMenu
@onready var _move_menu: Control = %MoveMenu
@onready var _switch_menu: Control = %SwitchMenu
@onready var _bag_menu: Control = %BagMenu
@onready var _learn_menu: Control = %LearnMoveMenu
@onready var _move_buttons: VBoxContainer = %MoveButtons
@onready var _switch_buttons: VBoxContainer = %SwitchButtons
@onready var _bag_buttons: VBoxContainer = %BagButtons
@onready var _learn_buttons: VBoxContainer = %LearnButtons

@onready var _enemy_panel: PanelContainer = %EnemyPanel
@onready var _enemy_name: Label = %EnemyName
@onready var _enemy_lvl: Label = %EnemyLevel
@onready var _enemy_hp: ProgressBar = %EnemyHP
@onready var _enemy_sprite: TextureRect = %EnemySprite
@onready var _player_panel: PanelContainer = %PlayerPanel
@onready var _player_name: Label = %PlayerName
@onready var _player_lvl: Label = %PlayerLevel
@onready var _player_hp: ProgressBar = %PlayerHP
@onready var _player_hp_text: Label = %PlayerHPText
@onready var _player_exp: ProgressBar = %PlayerExp
@onready var _player_sprite: TextureRect = %PlayerSprite

var engine: BattleEngine
var _busy: bool = false
var _forced_switch: bool = false

var _enemy_home: Vector2
var _player_home: Vector2

func _ready() -> void:
	layer = 20
	_style_hud()
	_enemy_home = _enemy_sprite.position
	_player_home = _player_sprite.position
	_hide_all_menus()
	%FightButton.pressed.connect(_open_moves)
	%BagButton.pressed.connect(_open_bag)
	%PokemonButton.pressed.connect(func(): _open_switch(false))
	%RunButton.pressed.connect(_try_run)
	%MoveBack.pressed.connect(_open_action)
	%SwitchBack.pressed.connect(func(): if not _forced_switch: _open_action())
	%BagBack.pressed.connect(_open_action)

## Dunkelgrünes, abgerundetes Panel + weisser Fett-Text statt Godots generischem
## Standard-Panel – und eine Grün/Gelb/Rot-Füllung für die HP-Balken.
func _style_hud() -> void:
	for panel in [_enemy_panel, _player_panel]:
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(0.13, 0.22, 0.16, 0.92)
		sb.border_color = Color(0.85, 0.9, 0.75)
		sb.set_border_width_all(2)
		sb.set_corner_radius_all(10)
		sb.content_margin_left = 14
		sb.content_margin_right = 14
		sb.content_margin_top = 8
		sb.content_margin_bottom = 8
		panel.add_theme_stylebox_override("panel", sb)
	for lbl in [_enemy_name, _enemy_lvl, _player_name, _player_lvl, _player_hp_text]:
		lbl.add_theme_color_override("font_color", Color(1, 1, 1))
	for bar in [_enemy_hp, _player_hp]:
		var bg := StyleBoxFlat.new()
		bg.bg_color = Color(0.05, 0.05, 0.05, 0.6)
		bg.set_corner_radius_all(4)
		bar.add_theme_stylebox_override("background", bg)
	var exp_bg := StyleBoxFlat.new()
	exp_bg.bg_color = Color(0.05, 0.05, 0.05, 0.6)
	_player_exp.add_theme_stylebox_override("background", exp_bg)
	var exp_fill := StyleBoxFlat.new()
	exp_fill.bg_color = Color(0.25, 0.55, 0.95)
	_player_exp.add_theme_stylebox_override("fill", exp_fill)

func _hp_fill_style(ratio: float) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	if ratio > 0.5:
		sb.bg_color = Color(0.29, 0.78, 0.25)
	elif ratio > 0.2:
		sb.bg_color = Color(0.95, 0.78, 0.16)
	else:
		sb.bg_color = Color(0.88, 0.22, 0.2)
	sb.set_corner_radius_all(4)
	return sb

## Anteil der aktuellen Stufe, den das XP bereits erreicht hat (0..1) – für den
## blauen XP-Balken unter der Spieler-HP-Anzeige, analog zum Original.
func _exp_ratio(mon: PokemonInstance) -> float:
	if mon.level >= 100:
		return 1.0
	var rate := mon.growth_rate()
	var lo := StatCalc.exp_for_level(rate, mon.level)
	var hi := StatCalc.exp_for_level(rate, mon.level + 1)
	if hi <= lo:
		return 1.0
	return clampf(float(mon.exp - lo) / float(hi - lo), 0.0, 1.0)

func start(eng: BattleEngine) -> void:
	engine = eng
	_refresh_hud()
	var intro: Array = []
	if engine.is_wild:
		intro.append(_t("Ein wildes %s erscheint!" % engine.enemy_active().display_name()))
	else:
		intro.append(_t("%s fordert dich heraus!" % engine.trainer_name))
		intro.append(_t("%s schickt %s!" % [engine.trainer_name, engine.enemy_active().display_name()]))
	intro.append(_t("Los, %s!" % engine.player_active().display_name()))
	await _play(intro)
	_open_action()

# --- Menues -----------------------------------------------------------

func _hide_all_menus() -> void:
	_action_menu.hide()
	_move_menu.hide()
	_switch_menu.hide()
	_bag_menu.hide()
	_learn_menu.hide()

func _open_bag() -> void:
	_hide_all_menus()
	for c in _bag_buttons.get_children():
		c.queue_free()
	var ids := GameState.items_in_category("balls") + GameState.items_in_category("medicine") + GameState.items_in_category("berries")
	if ids.is_empty():
		var lbl := Label.new()
		lbl.text = "Dein Beutel ist leer."
		_bag_buttons.add_child(lbl)
	for item_id in ids:
		var id: String = item_id
		var idata: Dictionary = GameData.items.get(id, {})
		var b := Button.new()
		b.text = "%s   x%d" % [idata.get("name", id), GameState.item_count(id)]
		if engine.trainer_name != "" and String(idata.get("category", "")) == "balls":
			b.disabled = true
		b.pressed.connect(func(): _choose_item(id))
		_bag_buttons.add_child(b)
	_bag_menu.show()
	for c in _bag_buttons.get_children():
		if c is Button and not c.disabled:
			c.grab_focus()
			break

func _choose_item(item_id: String) -> void:
	if _busy:
		return
	if not GameState.remove_item(item_id, 1):
		return
	_hide_all_menus()
	await _play(engine.resolve_turn({ "action": "item", "item": item_id }))
	_post_turn()

func _open_action() -> void:
	_hide_all_menus()
	_forced_switch = false
	_msg.text = "Was soll %s tun?" % engine.player_active().display_name()
	_action_menu.show()
	%FightButton.grab_focus()

func _open_moves() -> void:
	_hide_all_menus()
	for c in _move_buttons.get_children():
		c.queue_free()
	var list := engine.move_list()
	for i in list.size():
		var m: Dictionary = list[i]
		var b := Button.new()
		b.text = "%s   %s   AP %d/%d" % [m.name, String(m.type).to_upper(), m.pp, m.pp_max]
		b.disabled = int(m.pp) <= 0
		var idx := i
		b.pressed.connect(func(): _choose_move(idx))
		_move_buttons.add_child(b)
	_move_menu.show()
	if _move_buttons.get_child_count() > 0:
		_move_buttons.get_child(0).grab_focus()

func _open_switch(forced: bool) -> void:
	_hide_all_menus()
	_forced_switch = forced
	%SwitchBack.visible = not forced
	for c in _switch_buttons.get_children():
		c.queue_free()
	for i in engine.player_team.size():
		var p: PokemonInstance = engine.player_team[i]
		var b := Button.new()
		b.text = "%s   L%d   HP %d/%d%s" % [p.display_name(), p.level, p.current_hp, p.max_hp(), "  (K.O.)" if p.is_fainted() else ""]
		b.disabled = not engine.can_switch_to(i)
		var idx := i
		b.pressed.connect(func(): _choose_switch(idx))
		_switch_buttons.add_child(b)
	if forced:
		_msg.text = "Welches Pokémon einwechseln?"
	_switch_menu.show()
	for c in _switch_buttons.get_children():
		if not c.disabled:
			c.grab_focus()
			break

# --- Aktionen -------------------------------------------------------

func _choose_move(idx: int) -> void:
	if _busy:
		return
	_hide_all_menus()
	await _play(engine.resolve_turn({ "action": "move", "move_index": idx }))
	_post_turn()

func _choose_switch(idx: int) -> void:
	if _busy:
		return
	_hide_all_menus()
	if _forced_switch:
		await _play(engine.force_switch(idx))
	else:
		await _play(engine.resolve_turn({ "action": "switch", "switch_index": idx }))
	_post_turn()

func _try_run() -> void:
	if _busy:
		return
	_hide_all_menus()
	await _play(engine.resolve_turn({ "action": "run" }))
	_post_turn()

func _post_turn() -> void:
	_refresh_hud()
	if engine.is_finished():
		await _finish()
	elif engine.awaiting_player_switch:
		_open_switch(true)
	else:
		_open_action()

## Lehrt mon die per Level-Up erreichte Attacke move_id – falls schon 4
## Attacken bekannt sind, fragt es (wie im Original) welche vergessen werden soll.
func _try_learn_move(mon: PokemonInstance, move_id: String) -> void:
	if mon.knows_move(move_id):
		return
	var move_name := String(GameData.moves.get(move_id, {}).get("name", move_id))
	if mon.moves.size() < 4:
		mon.learn_move(move_id)
		_msg.text = "%s lernt %s!" % [mon.display_name(), move_name]
		await _wait(1.1)
		return
	_msg.text = "%s will %s lernen." % [mon.display_name(), move_name]
	await _wait(1.0)
	_msg.text = "%s kennt aber schon 4 Attacken!" % mon.display_name()
	await _wait(1.0)
	var idx := await _ask_forget_move(mon)
	if idx < 0:
		_msg.text = "%s hat %s nicht gelernt." % [mon.display_name(), move_name]
		await _wait(1.0)
		return
	var old_name := String(GameData.moves.get(String(mon.moves[idx].id), {}).get("name", mon.moves[idx].id))
	mon.replace_move(idx, move_id)
	_msg.text = "%s hat %s vergessen und %s gelernt!" % [mon.display_name(), old_name, move_name]
	await _wait(1.2)

## Zeigt die 4 aktuellen Attacken + Abbrechen, gibt den gewaehlten Index
## zurueck (-1 bei Abbrechen).
func _ask_forget_move(mon: PokemonInstance) -> int:
	_hide_all_menus()
	for c in _learn_buttons.get_children():
		c.queue_free()
	for i in mon.moves.size():
		var mid := String(mon.moves[i].id)
		var b := Button.new()
		b.text = String(GameData.moves.get(mid, {}).get("name", mid))
		var idx := i
		b.pressed.connect(func(): _forget_chosen.emit(idx))
		_learn_buttons.add_child(b)
	var cancel := Button.new()
	cancel.text = "Abbrechen"
	cancel.pressed.connect(func(): _forget_chosen.emit(-1))
	_learn_buttons.add_child(cancel)
	_msg.text = "Welche Attacke soll vergessen werden?"
	_learn_menu.show()
	_learn_buttons.get_child(0).grab_focus()
	var picked: int = await _forget_chosen
	_learn_menu.hide()
	return picked

func _finish() -> void:
	if engine.winner() == -3:
		_msg.text = "%s wurde gefangen!" % engine.enemy_active().display_name()
		await _wait(1.4)
	await _wait(0.3)
	closed.emit(engine.winner() == PLAYER)

# --- Event-Wiedergabe ---------------------------------------------

func _play(events: Array) -> void:
	_busy = true
	for e in events:
		await _handle(e)
	_busy = false

func _handle(e: Dictionary) -> void:
	match String(e.get("t", "")):
		"text":
			_msg.text = e.s
			await _wait(0.95)
		"move":
			_msg.text = "%s setzt %s ein!" % [e.user, e.name]
			await _lunge(int(e.side))
		"damage":
			_refresh_hud()
			if e.has("type"):
				_spawn_hit_effect(int(e.side), String(e.type))
			await _flash(e.side)
			await _shake(e.side)
			await _wait(0.35)
		"stat", "status":
			_refresh_hud()
			await _wait(0.4)
		"ball":
			if String(e.get("phase", "")) == "throw":
				_msg.text = "Du wirfst einen %s!" % e.get("item", "Ball")
				await _wait(0.8)
			else:
				var shakes := int(e.get("shakes", 0))
				for i in shakes:
					_msg.text = ". ".repeat(i + 1)
					await _wait(0.5)
				if not bool(e.get("caught", false)):
					await _wait(0.3)
		"faint":
			_msg.text = "%s wurde besiegt!" % e.name
			await _faint_drop(int(e.side))
			_refresh_hud()
			await _wait(0.6)
		"exp":
			_refresh_hud()
			if e.leveled:
				_msg.text = "%s erreicht Level %d!" % [e.who, e.level]
				await _wait(0.9)
		"learn_move":
			await _try_learn_move(e.mon, String(e.move))
		"evolve_check":
			await EvolutionManager.maybe_evolve_on_level_up(e.mon)
			_refresh_hud()
		"send":
			_refresh_hud()
			_msg.text = "%s schickt %s!" % [engine.trainer_name, e.name]
			await _wait(0.9)
		"switch":
			_refresh_hud()
			if String(e.get("out", "")) != "":
				_msg.text = "%s, komm zurück!  Los, %s!" % [e.out, e["in"]]
			else:
				_msg.text = "Los, %s!" % e["in"]
			await _wait(0.9)
		"win":
			if int(e.side) == PLAYER:
				AudioManager.play_victory_bgm(bool(e.get("wild", true)))
			if int(e.side) == PLAYER and not bool(e.get("wild", true)):
				_msg.text = "Du hast %s besiegt!" % String(e.get("trainer", "den Trainer"))
			elif int(e.side) == PLAYER:
				_msg.text = "Kampf gewonnen!"
			else:
				_msg.text = "Du hast keine kampffähigen Pokémon mehr ..."
			await _wait(1.2)
		"run":
			_msg.text = "Flucht gelungen!" if e.ok else "Flucht gescheitert!"
			await _wait(0.9)
		_:
			pass

# --- HUD ----------------------------------------------------------

var _shown_enemy_id: String = ""
var _shown_player_id: String = ""

func _refresh_hud() -> void:
	var pa := engine.player_active()
	var ea := engine.enemy_active()
	_enemy_name.text = ea.display_name()
	_enemy_lvl.text = "L%d" % ea.level
	_enemy_hp.max_value = ea.max_hp()
	_enemy_hp.value = ea.current_hp
	_enemy_hp.add_theme_stylebox_override("fill", _hp_fill_style(float(ea.current_hp) / float(ea.max_hp())))
	_player_name.text = pa.display_name()
	_player_lvl.text = "L%d" % pa.level
	_player_hp.max_value = pa.max_hp()
	_player_hp.value = pa.current_hp
	_player_hp.add_theme_stylebox_override("fill", _hp_fill_style(float(pa.current_hp) / float(pa.max_hp())))
	_player_hp_text.text = "%d/%d" % [pa.current_hp, pa.max_hp()]
	_player_exp.value = _exp_ratio(pa)
	_enemy_sprite.modulate.a = 0.25 if ea.is_fainted() else 1.0
	_player_sprite.modulate.a = 0.25 if pa.is_fainted() else 1.0
	_update_sprite(_enemy_sprite, ea, false, "_shown_enemy_id")
	_update_sprite(_player_sprite, pa, true, "_shown_player_id")

## Setzt das Pokémon-Sprite nur neu, wenn sich das aktive Pokémon geändert hat
## (eigenes vom Rücken, Gegner von vorn – wie im Original) + spielt den Schrei.
func _update_sprite(rect: TextureRect, mon: PokemonInstance, back: bool, shown_var: String) -> void:
	var key := "%s_%d" % [mon.species_id, mon.dex_num()]
	if get(shown_var) == key:
		return
	set(shown_var, key)
	var path := mon.back_sprite_path() if back else mon.front_sprite_path()
	rect.texture = load(path) if ResourceLoader.exists(path) else null
	AudioManager.play_cry(mon)
	await _pop_in(rect)

## Skalier-Einflug beim Erscheinen/Einwechseln eines Pokémon.
func _pop_in(rect: TextureRect) -> void:
	var home: Vector2 = _enemy_home if rect == _enemy_sprite else _player_home
	rect.position = home
	rect.pivot_offset = rect.size * 0.5
	rect.scale = Vector2(0.2, 0.2)
	var tw := create_tween()
	tw.tween_property(rect, "scale", Vector2(1, 1), 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	await tw.finished

func _side_node(side: int) -> Control:
	return _enemy_sprite if int(side) == ENEMY else _player_sprite

## Kurzer Ausfallschritt Richtung Gegner beim Attackeneinsatz.
func _lunge(side: int) -> void:
	var node := _side_node(side)
	var home: Vector2 = _enemy_home if node == _enemy_sprite else _player_home
	var toward: Vector2 = Vector2(-40, 20) if node == _enemy_sprite else Vector2(40, -20)
	var tw := create_tween()
	tw.tween_property(node, "position", home + toward, 0.12).set_trans(Tween.TRANS_SINE)
	tw.tween_property(node, "position", home, 0.18).set_trans(Tween.TRANS_SINE)
	await tw.finished

## Kurzer, typfarbener Kreis-Blitz mittig auf dem getroffenen Pokémon.
func _spawn_hit_effect(side: int, move_type: String) -> void:
	var target := _side_node(side)
	var fx := Control.new()
	fx.set_script(HIT_EFFECT_SCRIPT)
	fx.size = Vector2(100, 100)
	fx.position = target.position + target.size * 0.5 - fx.size * 0.5
	_root.add_child(fx)
	fx.play(TYPE_COLORS.get(move_type, Color.WHITE))

## Weisses Aufblitzen beim Treffer.
func _flash(side: int) -> void:
	var node := _side_node(side)
	var tw := create_tween()
	tw.tween_property(node, "modulate", Color(3, 3, 3), 0.05)
	tw.tween_property(node, "modulate", Color(1, 1, 1), 0.08)
	await tw.finished

## Absacken + Ausblenden beim K.O.
func _faint_drop(side: int) -> void:
	var node := _side_node(side)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(node, "position:y", node.position.y + 40, 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_property(node, "modulate:a", 0.0, 0.5)
	await tw.finished

func _shake(side: int) -> void:
	var node: Control = _side_node(side)
	var base := node.position
	var tw := create_tween()
	for i in 3:
		tw.tween_property(node, "position", base + Vector2(6, 0), 0.04)
		tw.tween_property(node, "position", base - Vector2(6, 0), 0.04)
	tw.tween_property(node, "position", base, 0.04)
	await tw.finished

func _flash_msg(s: String) -> void:
	_msg.text = s

func _t(s: String) -> Dictionary:
	return { "t": "text", "s": s }

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds).timeout
