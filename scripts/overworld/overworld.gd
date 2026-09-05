extends Node3D
## Overworld-Container: haelt die aktuelle Map, den lokalen Player und alle
## sichtbaren RemotePlayer. Reagiert auf NetworkManager-Signale.

const MAP_PATH := "res://scenes/overworld/maps/%s.tscn"
const PLACEHOLDER_MAP := preload("res://scenes/overworld/maps/PlaceholderMap.tscn")

var _player_scene: PackedScene = preload("res://scenes/overworld/Player.tscn")
var _remote_scene: PackedScene = preload("res://scenes/overworld/RemotePlayer.tscn")

@onready var _map_container: Node3D = $MapContainer
@onready var _world_env: WorldEnvironment = get_node_or_null("WorldEnvironment")

var _player = null              # Player-Instanz (untypisiert -> dynamischer Zugriff)
var _current_map = null         # MapBase / PlaceholderMap (untypisiert)
var _remotes: Dictionary = {}   # peer_id -> RemotePlayer

func _ready() -> void:
	# Lichtrichtung per Skript setzen (Editor/Import verdreht .tscn-Rotationen).
	var sun := get_node_or_null("Sun")
	if sun != null:
		sun.rotation = Vector3(deg_to_rad(-50.0), deg_to_rad(-35.0), 0.0)

	NetworkManager.player_joined.connect(_on_player_joined)
	NetworkManager.player_left.connect(_on_player_left)
	NetworkManager.remote_moved.connect(_on_remote_moved)
	NetworkManager.remote_status_changed.connect(_on_remote_status_changed)

func get_local_player():
	return _player

## Innen/Höhle/Arena: neutrale, dunkle Flächenfarbe statt Himmel – sonst blitzt
## an Kanten/Ecken hellblauer "Himmel" durch die Wände (Bug-Report Finn).
## Draussen: der richtige Himmel (siehe Environment in Overworld.tscn).
func _update_sky(indoor: bool) -> void:
	if _world_env == null or _world_env.environment == null:
		return
	var env := _world_env.environment
	if indoor:
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color(0.08, 0.08, 0.1)
	else:
		env.background_mode = Environment.BG_SKY

func load_map(map_id: String, spawn_name: String = "SpawnPoint") -> void:
	if _current_map != null and is_instance_valid(_current_map):
		_current_map.queue_free()
		_current_map = null

	var scene_path := MAP_PATH % map_id
	var packed: PackedScene = load(scene_path) if ResourceLoader.exists(scene_path) else null
	if packed != null:
		_current_map = packed.instantiate()
		_map_container.add_child(_current_map)
	elif GameData.maps.has(map_id):
		_current_map = PLACEHOLDER_MAP.instantiate()
		_map_container.add_child(_current_map)
		_current_map.build_from_data(map_id)
	else:
		push_error("Overworld: weder Szene noch Daten fuer Map: " + map_id)
		return

	if _player == null or not is_instance_valid(_player):
		_player = _player_scene.instantiate()
		add_child(_player)
	_player.teleport(_current_map.get_spawn(spawn_name))
	_player.set_facing(GameState.last_facing)
	_player.set_input_locked(false)
	if _player.has_method("block_held_move_input"):
		_player.call("block_held_move_input")
	AudioManager.play_map_bgm(map_id)
	var is_indoor := bool(_current_map.get("_indoor")) or bool(_current_map.get("cave")) or bool(_current_map.get("gym"))
	var cam = _player.get_node_or_null("Camera3D")
	if cam != null and cam.has_method("snap_now"):
		if cam.has_method("set_context"):
			var raw_hw = _current_map.get("_hw")
			var raw_hh = _current_map.get("_hh")
			var room_hw: float = float(raw_hw) if raw_hw != null else 999.0
			var room_hh: float = float(raw_hh) if raw_hh != null else 999.0
			cam.call("set_context", is_indoor, room_hw, room_hh)
		cam.snap_now()
	_update_sky(is_indoor)

	# Trainer dieser Map an den Spieler binden (Sichtlinie).
	for tr in get_tree().get_nodes_in_group("trainers"):
		if tr.has_method("bind_player"):
			tr.bind_player(_player)

	# Beim Map-Wechsel alle Remotes entfernen; sie melden sich per Signal neu.
	for r in _remotes.values():
		if is_instance_valid(r):
			r.queue_free()
	_remotes.clear()

	# Bereits bekannte Spieler auf dieser Map (wieder) einblenden.
	for peer_id in NetworkManager.players.keys():
		if peer_id == NetworkManager.my_id():
			continue
		var info: Dictionary = NetworkManager.players[peer_id]
		if info.get("map", "") == map_id:
			_spawn_remote(peer_id, info)

# --- NetworkManager-Signale --------------------------------------------

func _on_player_joined(peer_id: int, info: Dictionary) -> void:
	if peer_id == NetworkManager.my_id():
		return
	if info.get("map", "") == SceneManager.current_map:
		_spawn_remote(peer_id, info)

func _on_player_left(peer_id: int) -> void:
	if _remotes.has(peer_id):
		if is_instance_valid(_remotes[peer_id]):
			_remotes[peer_id].queue_free()
		_remotes.erase(peer_id)

func _on_remote_moved(peer_id: int, pos: Vector3, facing: String, map: String) -> void:
	if peer_id == NetworkManager.my_id():
		return
	if map == SceneManager.current_map:
		if not _remotes.has(peer_id):
			var info: Dictionary = NetworkManager.players.get(peer_id, {"name": "???", "pos": pos})
			_spawn_remote(peer_id, info)
		_remotes[peer_id].network_move_to(pos, facing)
	elif _remotes.has(peer_id):
		if is_instance_valid(_remotes[peer_id]):
			_remotes[peer_id].queue_free()
		_remotes.erase(peer_id)

func _on_remote_status_changed(peer_id: int, status: String) -> void:
	if _remotes.has(peer_id) and is_instance_valid(_remotes[peer_id]):
		_remotes[peer_id].set_status_icon(status)

func _spawn_remote(peer_id: int, info: Dictionary) -> void:
	if _remotes.has(peer_id):
		return
	var r: RemotePlayer = _remote_scene.instantiate()
	_map_container.add_child(r)
	r.setup(peer_id, info)
	_remotes[peer_id] = r
