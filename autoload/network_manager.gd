extends Node
## NetworkManager (Autoload)
## Modul B: Client-Server-Multiplayer ueber ENet.
##
## Verantwortung: Peer-Verwaltung, Spielerliste (peer_id -> info), Replikation
## von Position / Status / Chat. KEINE Spielmechanik, KEINE Kampf-Regeln.
##
## Topologie: Stern. Godot relayt RPCs von Clients ueber den Host an alle
## anderen (multiplayer.server_relay = true, Standard). Der Host ist immer
## peer_id == 1 und autoritativ fuer PvP-Kaempfe / Tausch (spaeteres Modul).

signal player_joined(peer_id: int, info: Dictionary)
signal player_left(peer_id: int)
signal remote_moved(peer_id: int, pos: Vector3, facing: String, map: String)
signal remote_status_changed(peer_id: int, status: String)
signal chat_received(peer_id: int, text: String)
signal connection_succeeded()
signal connection_failed()
signal server_disconnected()
signal hosted()

const PORT := 7777
const MAX_CLIENTS := 8

# ENet-Kanaele: 0 = zuverlaessige Events, 1 = Bewegung, 2 = Chat
enum Channel { EVENTS = 0, MOVEMENT = 1, CHAT = 2 }

var players: Dictionary = {}   # peer_id -> { name, map, pos, facing, status }
var local_info: Dictionary = {
	"name": "Spieler", "map": "", "pos": Vector3.ZERO, "facing": "down", "status": "idle"
}
var is_online: bool = false

# --- Info-Helfer --------------------------------------------------------------

func my_id() -> int:
	return multiplayer.get_unique_id() if multiplayer.has_multiplayer_peer() else 1

func is_host() -> bool:
	return not is_online or multiplayer.is_server()

func get_player_name(peer_id: int) -> String:
	if peer_id == my_id():
		return String(local_info.get("name", "Spieler"))
	return String(players.get(peer_id, {}).get("name", "???"))

func peer_count() -> int:
	return players.size()

# --- Verbindung aufbauen / abbauen ------------------------------------------

func host_game(player_name: String) -> Error:
	local_info["name"] = player_name
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_server(PORT, MAX_CLIENTS)
	if err != OK:
		return err
	multiplayer.multiplayer_peer = peer
	_bind_multiplayer_signals()
	is_online = true
	players.clear()
	hosted.emit()
	return OK

func join_game(address: String, player_name: String) -> Error:
	local_info["name"] = player_name
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(address, PORT)
	if err != OK:
		return err
	multiplayer.multiplayer_peer = peer
	_bind_multiplayer_signals()
	is_online = true
	return OK

func disconnect_from_game() -> void:
	if multiplayer.has_multiplayer_peer():
		multiplayer.multiplayer_peer.close()
		multiplayer.multiplayer_peer = null
	is_online = false
	for id in players.keys():
		if id != my_id():
			player_left.emit(id)
	players.clear()

func _bind_multiplayer_signals() -> void:
	if multiplayer.peer_connected.is_connected(_on_peer_connected):
		return
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)

# --- Wird nach dem Laden der ersten Map aufgerufen -------------------------
## Traegt uns lokal ein und meldet uns (als Client) beim Rest der Sitzung an.
func announce() -> void:
	players[my_id()] = local_info.duplicate(true)
	player_joined.emit(my_id(), players[my_id()])
	if is_online and not multiplayer.is_server():
		_register.rpc(local_info)

# --- Multiplayer-Callbacks -------------------------------------------------

func _on_peer_connected(_id: int) -> void:
	pass  # Wir warten, bis sich der Client per _register meldet.

func _on_peer_disconnected(id: int) -> void:
	if players.erase(id):
		player_left.emit(id)

func _on_connected_to_server() -> void:
	connection_succeeded.emit()

func _on_connection_failed() -> void:
	is_online = false
	multiplayer.multiplayer_peer = null
	connection_failed.emit()

func _on_server_disconnected() -> void:
	is_online = false
	multiplayer.multiplayer_peer = null
	var ids := players.keys()
	players.clear()
	for id in ids:
		if id != my_id():
			player_left.emit(id)
	server_disconnected.emit()

# --- Registrierung / Listen-Sync -----------------------------------------

@rpc("any_peer", "reliable", "call_remote", 0)
func _register(info: Dictionary) -> void:
	var id := multiplayer.get_remote_sender_id()
	if not players.has(id):
		players[id] = info.duplicate(true)
		player_joined.emit(id, players[id])
	else:
		players[id].merge(info, true)
	# Der Host schickt dem Neuen die komplette Liste (inkl. sich selbst).
	if multiplayer.is_server():
		_sync_list.rpc_id(id, players)

@rpc("authority", "reliable", "call_remote", 0)
func _sync_list(all_players: Dictionary) -> void:
	for id in all_players:
		if id == my_id() or players.has(id):
			continue
		players[id] = (all_players[id] as Dictionary).duplicate(true)
		player_joined.emit(id, players[id])

# --- Positions-Replikation ----------------------------------------------

## Vom lokalen Player nach jedem Tile-Schritt / Richtungswechsel aufgerufen.
func send_move(pos: Vector3, facing: String, map: String) -> void:
	local_info["pos"] = pos
	local_info["facing"] = facing
	local_info["map"] = map
	if players.has(my_id()):
		players[my_id()].merge({"pos": pos, "facing": facing, "map": map}, true)
	if not is_online:
		return
	_recv_move.rpc(pos, facing, map)

@rpc("any_peer", "unreliable_ordered", "call_remote", 1)
func _recv_move(pos: Vector3, facing: String, map: String) -> void:
	var id := multiplayer.get_remote_sender_id()
	if not players.has(id):
		players[id] = {"name": "???"}
	players[id].merge({"pos": pos, "facing": facing, "map": map}, true)
	remote_moved.emit(id, pos, facing, map)

# --- Status (Kampf / Tausch) -------------------------------------------

func send_status(status: String) -> void:
	local_info["status"] = status
	if players.has(my_id()):
		players[my_id()]["status"] = status
	if not is_online:
		return
	_recv_status.rpc(status)

@rpc("any_peer", "reliable", "call_remote", 0)
func _recv_status(status: String) -> void:
	var id := multiplayer.get_remote_sender_id()
	if players.has(id):
		players[id]["status"] = status
	remote_status_changed.emit(id, status)

# --- Chat --------------------------------------------------------------

func send_chat(text: String) -> void:
	text = text.strip_edges()
	if text == "":
		return
	if not is_online:
		chat_received.emit(my_id(), text)   # Solo: nur lokal anzeigen
		return
	_recv_chat.rpc(text)

@rpc("any_peer", "reliable", "call_local", 2)
func _recv_chat(text: String) -> void:
	var id := multiplayer.get_remote_sender_id()
	if id == 0:
		id = my_id()   # eigene (call_local) Nachricht
	chat_received.emit(id, text)
