extends CanvasLayer
## ESC-Menue: Pokémon / Beutel / Pokédex / Speichern.
## Platzhalter-Optik – wird ersetzt, sobald UI-Sheets da sind.

signal opened()
signal closed()

@onready var _root: Control = %Root
@onready var _main_list: Control = %MainList
@onready var _detail: Control = %Detail
@onready var _detail_text: RichTextLabel = %DetailText
@onready var _detail_title: Label = %DetailTitle
@onready var _save_row: HBoxContainer = %SaveRow
@onready var _item_buttons: VBoxContainer = %ItemButtons

var is_open: bool = false

func _ready() -> void:
	layer = 12
	process_mode = Node.PROCESS_MODE_ALWAYS
	_root.hide()
	%PartyBtn.pressed.connect(_show_party)
	%BagBtn.pressed.connect(_show_bag)
	%DexBtn.pressed.connect(_show_dex)
	%SaveBtn.pressed.connect(_show_save)
	%CloseBtn.pressed.connect(close)
	%DetailBack.pressed.connect(_to_main)
	for i in SaveSystem.SLOTS:
		var b := Button.new()
		b.custom_minimum_size = Vector2(150, 0)
		var slot := i
		b.pressed.connect(func(): _do_save(slot))
		_save_row.add_child(b)

func toggle() -> void:
	if is_open:
		close()
	else:
		open()

func open() -> void:
	if is_open or DialogueManager.active or BattleManager.in_battle:
		return
	is_open = true
	_root.show()
	_to_main()
	var p = SceneManager.get_player()
	if p != null:
		p.set_input_locked(true)
	opened.emit()

func close() -> void:
	if not is_open:
		return
	is_open = false
	_root.hide()
	var p = SceneManager.get_player()
	if p != null and not DialogueManager.active and not BattleManager.in_battle:
		p.set_input_locked(false)
	closed.emit()

func _input(event: InputEvent) -> void:
	if not is_open:
		return
	if event.is_action_pressed("menu"):
		get_viewport().set_input_as_handled()
		if _main_list.visible:
			close()
		else:
			_to_main()

func _to_main() -> void:
	_detail.hide()
	_main_list.show()
	%Objective.text = "Ziel: %s\nOrden: %d/8" % [QuestManager.current_text(), GameState.badge_count()]
	%PartyBtn.grab_focus()

func _open_detail(title: String) -> void:
	_main_list.hide()
	_detail_title.text = title
	_detail_text.show()
	_save_row.hide()
	_item_buttons.hide()
	_detail.show()
	%DetailBack.grab_focus()

func _show_party() -> void:
	_open_detail("POKéMON")
	var s := ""
	if GameState.party.is_empty():
		s = "Noch kein Pokémon im Team."
	for p in GameState.party:
		var st := "" if p.status == "" else "  [%s]" % p.status.to_upper()
		s += "[b]%s[/b]   L%d%s\n   KP %d/%d   EP %d\n   %s\n\n" % [
			p.display_name(), p.level, st, p.current_hp, p.max_hp(), p.exp,
			", ".join(p.moves.map(func(m): return GameData.moves.get(String(m.id), {}).get("name", m.id)))]
	_detail_text.text = s

func _show_bag() -> void:
	_open_detail("BEUTEL")
	var s := ""
	for cat in ["balls", "medicine", "berries", "items", "tm", "key"]:
		var ids := GameState.items_in_category(cat)
		if ids.is_empty():
			continue
		s += "[b]%s[/b]\n" % cat.to_upper()
		for id in ids:
			s += "   %s  x%d\n" % [GameData.items.get(id, {}).get("name", id), GameState.item_count(id)]
		s += "\n"
	if s == "":
		s = "Dein Beutel ist leer."
	s += "\nGeld: %d ₽" % GameState.money
	_detail_text.text = s

	for c in _item_buttons.get_children():
		c.queue_free()
	var tms := GameState.items_in_category("tm")
	if not tms.is_empty():
		_item_buttons.show()
		for item_id in tms:
			var id: String = item_id
			var b := Button.new()
			b.text = "%s beibringen" % String(GameData.items.get(id, {}).get("name", id))
			b.pressed.connect(func(): _use_tm(id))
			_item_buttons.add_child(b)

## Beim Anwenden einer VM/TM: Pokémon auswählen, dann Attacke lernen/tauschen lassen.
func _use_tm(item_id: String) -> void:
	var move_id := String(GameData.items.get(item_id, {}).get("teaches", ""))
	if move_id == "" or GameState.party.is_empty():
		return
	var names: Array = []
	for p in GameState.party:
		names.append("%s (L%d)" % [p.display_name(), p.level])
	names.append("Abbrechen")
	var idx: int = await DialogueManager.ask("Wem soll die VM beigebracht werden?", names)
	if idx < 0 or idx >= GameState.party.size():
		return
	var mon: PokemonInstance = GameState.party[idx]
	var move_name := String(GameData.moves.get(move_id, {}).get("name", move_id))
	if mon.knows_move(move_id):
		await DialogueManager.run(["%s kennt %s bereits." % [mon.display_name(), move_name]])
		return
	if mon.moves.size() < 4:
		mon.learn_move(move_id)
		await DialogueManager.run(["%s hat %s gelernt!" % [mon.display_name(), move_name]])
		return
	await DialogueManager.run(["%s will %s lernen, kennt aber schon 4 Attacken." % [mon.display_name(), move_name]])
	var move_names: Array = []
	for m in mon.moves:
		move_names.append(String(GameData.moves.get(String(m.id), {}).get("name", m.id)))
	move_names.append("Abbrechen")
	var forget: int = await DialogueManager.ask("Welche Attacke soll vergessen werden?", move_names)
	if forget < 0 or forget >= mon.moves.size():
		await DialogueManager.run(["%s hat %s nicht gelernt." % [mon.display_name(), move_name]])
		return
	var old_name := String(GameData.moves.get(String(mon.moves[forget].id), {}).get("name", mon.moves[forget].id))
	mon.replace_move(forget, move_id)
	await DialogueManager.run(["%s hat %s vergessen und %s gelernt!" % [mon.display_name(), old_name, move_name]])

func _show_dex() -> void:
	_open_detail("POKéDEX")
	var s := "Gesehen: %d     Gefangen: %d\n\n" % [GameState.seen_count(), GameState.caught_count()]
	var ids := GameData.species_by_dex()
	for id in ids:
		if GameState.pokedex_seen.has(id):
			var mark := "●" if GameState.pokedex_caught.has(id) else "○"
			s += "%s  Nr.%03d  %s\n" % [mark, int(GameData.species[id].get("dex", 0)), GameData.species_name(id)]
	_detail_text.text = s

func _show_save() -> void:
	_main_list.hide()
	_detail_title.text = "SPEICHERN"
	_detail_text.hide()
	_item_buttons.hide()
	_save_row.show()
	_detail.show()
	_refresh_save_buttons()
	if _save_row.get_child_count() > 0:
		_save_row.get_child(0).grab_focus()

func _refresh_save_buttons() -> void:
	for i in _save_row.get_child_count():
		var info := SaveSystem.slot_summary(i)
		var b: Button = _save_row.get_child(i)
		if info.is_empty():
			b.text = "Slot %d\n(leer)" % (i + 1)
		else:
			b.text = "Slot %d\n%s  T%d\n%s  %s" % [i + 1, info.name, info.party, info.map, info.time]

func _do_save(slot: int) -> void:
	if SaveSystem.save_game(slot):
		_refresh_save_buttons()
		_detail_title.text = "In Slot %d gespeichert!" % (slot + 1)
