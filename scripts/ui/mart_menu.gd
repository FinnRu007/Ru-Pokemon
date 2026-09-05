extends CanvasLayer
## Pokémon-Markt: Kaufen / Verkaufen, jeweils 1 Stück pro Klick.

signal done()

@onready var _title: Label = %Title
@onready var _money: Label = %Money
@onready var _list: VBoxContainer = %List
@onready var _hint: Label = %Hint
@onready var _buy_tab: Button = %BuyTab
@onready var _sell_tab: Button = %SellTab

var _shop_name: String = ""
var _stock: Array = []
var _mode: String = "buy"

func _ready() -> void:
	layer = 14
	process_mode = Node.PROCESS_MODE_ALWAYS
	_buy_tab.pressed.connect(func(): _mode = "buy"; _refresh())
	_sell_tab.pressed.connect(func(): _mode = "sell"; _refresh())
	%ExitBtn.pressed.connect(func(): done.emit())
	GameState.money_changed.connect(func(_m): _update_money())

func setup(shop_name: String, stock: Array) -> void:
	_shop_name = shop_name
	_stock = stock
	_title.text = shop_name
	_mode = "buy"
	_refresh()

func _update_money() -> void:
	_money.text = "Geld: %d ₽" % GameState.money

func _refresh() -> void:
	_update_money()
	for c in _list.get_children():
		c.queue_free()
	if _mode == "buy":
		_hint.text = "KAUFEN – Preis pro Stück"
		for item_id in _stock:
			var id: String = item_id
			var idata: Dictionary = GameData.items.get(id, {})
			var price := int(idata.get("price", 0))
			var b := Button.new()
			b.text = "%s   %d ₽" % [idata.get("name", id), price]
			b.disabled = price <= 0 or GameState.money < price
			b.pressed.connect(func(): _buy(id, price))
			_list.add_child(b)
	else:
		_hint.text = "VERKAUFEN – halber Preis"
		var any := false
		for id in GameState.inventory:
			var idata: Dictionary = GameData.items.get(id, {})
			if String(idata.get("category", "items")) == "key":
				continue
			any = true
			var sell := int(idata.get("price", 0)) / 2
			var b := Button.new()
			b.text = "%s  x%d   +%d ₽" % [idata.get("name", id), GameState.item_count(id), sell]
			b.disabled = sell <= 0
			var sid: String = id
			b.pressed.connect(func(): _sell(sid, sell))
			_list.add_child(b)
		if not any:
			var l := Label.new()
			l.text = "Nichts zu verkaufen."
			_list.add_child(l)
	for c in _list.get_children():
		if c is Button and not c.disabled:
			c.grab_focus()
			break

func _buy(id: String, price: int) -> void:
	if GameState.money < price:
		return
	GameState.add_money(-price)
	GameState.add_item(id, 1)
	_refresh()

func _sell(id: String, price: int) -> void:
	if GameState.remove_item(id, 1):
		GameState.add_money(price)
	_refresh()

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("menu"):
		get_viewport().set_input_as_handled()
		done.emit()
