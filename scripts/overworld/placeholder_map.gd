class_name PlaceholderMap
extends MapBase
## Baut eine Map aus data/maps.json: gekacheltes Boden-Mesh (Sinnoh-Stil-Tileset),
## Bäume/Wände als Billboards, Warps, NPCs/Trainer mit echten DS-Sprites.
## Struktur ist final – nur die Tileset-Grafik (assets/spritesheets/tilesets/overworld.png)
## und die Charakter-Frames (resources/characters/*.tres) sind austauschbar.

const NPC_SCRIPT := preload("res://scripts/overworld/npc.gd")
const TRAINER_SCRIPT := preload("res://scripts/overworld/trainer.gd")
const WARP_SCRIPT := preload("res://scripts/overworld/warp.gd")
const GRASS_SCRIPT := preload("res://scripts/overworld/grass_zone.gd")
const SIGN_SCRIPT := preload("res://scripts/overworld/sign.gd")
const GATE_SCRIPT := preload("res://scripts/overworld/gate.gd")
const STARTER_SCRIPT := preload("res://scripts/overworld/starter_table.gd")
const PROF_SCRIPT := preload("res://scripts/overworld/professor.gd")
const SHOP_SCRIPT := preload("res://scripts/overworld/shopkeeper.gd")
const VISUAL_SCRIPT := preload("res://scripts/core/character_visual.gd")
const SMASH_ROCK_SCRIPT := preload("res://scripts/overworld/smash_rock.gd")
const ITEM_SCRIPT := preload("res://scripts/overworld/item_pickup.gd")
const TV_SCRIPT := preload("res://scripts/overworld/tv_news.gd")

const TILESET_PNG := "res://assets/spritesheets/tilesets/overworld.png"
const TILESET_META := "res://assets/spritesheets/tilesets/overworld.json"
const ROLES_JSON := "res://resources/characters/roles.json"

# Tile-Indizes (siehe tools/make_tileset.py)
const T_GRASS := 0
const T_TUFT := 1
const T_TALLGRASS := 2
const T_PATH := 3
const T_FLOWERS := 5
const T_TREE := 8
const T_FENCE := 11
const T_WATER := 14
const T_WALL := 17
const T_FLOOR_WOOD := 23
const T_FLOOR_TILE := 24
const T_TREE_TALL := 38
const T_HOUSE_ROOF := 32
const T_HOUSE_WALL := 33
const T_HOUSE_DOOR := 34
const T_CAVE_FLOOR := 40
const T_CAVE_WALL := 41
const T_CAVE_RUBBLE := 42
const T_BOULDER := 43
const T_GYM_WALL := 44
const T_GYM_ROOF := 45
const T_MINE_CART := 46
const T_ORE := 47
const T_TV := 48
const T_BED := 49
const T_DRESSER := 50
const T_ROOF_GREEN := 51
const T_BOOKSHELF := 52
const T_STAIRS_UP := 53
const T_RUG := 54
const T_TABLE := 27
const T_COUNTER := 26
const T_PC := 28

var _atlas_cols := 8
var _atlas_rows := 4
var _tile_solid := {}
var _shape := BoxShape3D.new()
var _roles := {}
var _hw := 10
var _hh := 8
var _indoor := false
var cave: bool = false      ## dunkle Höhle (Overworld dimmt das Licht danach)
var gym: bool = false       ## Arena-Innenraum (andere Wandtextur)
var _floor_override := {}   # Vector2i -> tile_index
var _tile_mat: StandardMaterial3D

var _tex_cache: Texture2D   ## einmal geladen, nicht bei jedem Baum/Zaun neu (Perf)

func _init() -> void:
	_shape.size = Vector3(1, 1, 1)
	_load_tileset_meta()
	_load_roles()
	_tex_cache = load(TILESET_PNG)
	_tile_mat = StandardMaterial3D.new()
	_tile_mat.albedo_texture = _tex_cache
	_tile_mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	_tile_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_tile_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

func _load_tileset_meta() -> void:
	if not FileAccess.file_exists(TILESET_META):
		return
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string(TILESET_META))
	if typeof(d) == TYPE_DICTIONARY:
		_atlas_cols = int(d.get("columns", 8))
		_atlas_rows = int(d.get("rows", 4))
		for t in d.get("tiles", []):
			_tile_solid[int(t.index)] = bool(t.solid)

func _load_roles() -> void:
	if FileAccess.file_exists(ROLES_JSON):
		var d: Variant = JSON.parse_string(FileAccess.get_file_as_string(ROLES_JSON))
		if typeof(d) == TYPE_DICTIONARY:
			_roles = d

# ------------------------------------------------------------------

func build_from_data(id: String) -> void:
	map_id = id
	var d: Dictionary = GameData.maps.get(id, {})
	display_name = String(d.get("name", id))
	bgm = String(d.get("bgm", ""))
	var size: Array = d.get("size", [20, 16])
	_hw = int(size[0]) / 2
	_hh = int(size[1]) / 2
	_indoor = bool(d.get("indoor", false))
	cave = bool(d.get("cave", false))
	gym = bool(d.get("gym", false))

	_paint_paths(d)
	for rd in d.get("roads", []):
		_mark_road_tiles(rd)
	for wt in d.get("water", []):
		_mark_water_tiles(wt)
	for g in d.get("grass", []):
		_mark_grass_tiles(g)
	for fl in d.get("flowers", []):
		_mark_flower_tiles(fl)
	for st in d.get("stairs", []):
		_floor_override[Vector2i(int(st["at"][0]), int(st["at"][1]))] = T_STAIRS_UP
	for dc in d.get("objects", []):
		if String(dc.get("kind", "")) == "deco" and not bool(dc.get("solid", true)):
			_floor_override[Vector2i(int(dc["at"][0]), int(dc["at"][1]))] = int(dc.get("tile", T_RUG))
	_build_floor_mesh()
	_build_ceiling_mesh()

	_spawns(d.get("spawns", {}))
	var warp_tiles := []
	for w in d.get("warps", []):
		warp_tiles.append(Vector2(w["at"][0], w["at"][1]))
	_perimeter(warp_tiles)
	for w in d.get("walls", []):
		_wall_tile(int(w[0]), int(w[1]))
	for f in d.get("fences", []):
		_wall_tile(int(f[0]), int(f[1]), "fence")
	for b in d.get("buildings", []):
		_building(b)

	for w in d.get("warps", []):
		_warp(w, true)
	for door in d.get("doors", []):
		_door(door)
	for st in d.get("stairs", []):
		_warp(st, true)
	for g in d.get("grass", []):
		_grass_area(g)
	for n in d.get("npcs", []):
		_npc(n)
	for t in d.get("trainers", []):
		_trainer(t)
	for s in d.get("signs", []):
		_sign(s)
	for o in d.get("objects", []):
		_object(o)

# --- Boden -------------------------------------------------------

func _paint_paths(d: Dictionary) -> void:
	var warps: Array = d.get("warps", [])
	if _indoor or cave or warps.size() != 2:
		return
	var ax := int(warps[0]["at"][0])
	var az := int(warps[0]["at"][1])
	var bx := int(warps[1]["at"][0])
	var bz := int(warps[1]["at"][1])
	var x := ax
	var z := az
	while z != bz:
		_floor_override[Vector2i(x, z)] = T_PATH
		z += signi(bz - z)
	while x != bx:
		_floor_override[Vector2i(x, z)] = T_PATH
		x += signi(bx - x)
	_floor_override[Vector2i(bx, bz)] = T_PATH

func _mark_grass_tiles(g: Dictionary) -> void:
	if cave or _indoor:
		return   # Encounter-Zone bleibt funktional, Boden sieht aber wie Höhle/Innenraum aus
	var r: Array = g.get("rect", [0, 0, 4, 4])
	for dz in range(int(r[3])):
		for dx in range(int(r[2])):
			_floor_override[Vector2i(int(r[0]) + dx, int(r[1]) + dz)] = T_TALLGRASS

func _mark_water_tiles(g: Dictionary) -> void:
	if cave or _indoor:
		return
	var r: Array = g.get("rect", [0, 0, 3, 2])
	for dz in range(int(r[3])):
		for dx in range(int(r[2])):
			_floor_override[Vector2i(int(r[0]) + dx, int(r[1]) + dz)] = T_WATER

## Explizite Wege (Rechtecke), damit Straßen gezielt zu jedem Haus/Etwas hin
## verlaufen können statt nur automatisch zwischen 2 Kartenrand-Warps.
func _mark_road_tiles(g: Dictionary) -> void:
	if cave or _indoor:
		return
	var r: Array = g.get("rect", [0, 0, 1, 1])
	for dz in range(int(r[3])):
		for dx in range(int(r[2])):
			_floor_override[Vector2i(int(r[0]) + dx, int(r[1]) + dz)] = T_PATH

func _mark_flower_tiles(f: Dictionary) -> void:
	if cave or _indoor:
		return
	var r: Array = f.get("rect", [0, 0, 2, 2])
	for dz in range(int(r[3])):
		for dx in range(int(r[2])):
			_floor_override[Vector2i(int(r[0]) + dx, int(r[1]) + dz)] = T_FLOWERS

func _tile_uv(idx: int) -> Rect2:
	var c := idx % _atlas_cols
	var row := idx / _atlas_cols
	var uw := 1.0 / float(_atlas_cols)
	var uh := 1.0 / float(_atlas_rows)
	var inset := 0.001
	return Rect2(c * uw + inset, row * uh + inset, uw - 2 * inset, uh - 2 * inset)

func _base_tile(tx: int, tz: int) -> int:
	var h := int(abs(sin(float(tx) * 12.9898 + float(tz) * 78.233) * 43758.5453)) % 100
	if cave:
		return T_CAVE_RUBBLE if h < 6 else T_CAVE_FLOOR
	if _indoor:
		return T_FLOOR_WOOD
	if h < 3:
		return T_FLOWERS
	if h < 10:
		return T_TUFT
	return T_GRASS

func _build_floor_mesh() -> void:
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	var normals := PackedVector3Array()
	# Draussen bekommt der Boden einen Ring extra ueber die Waende hinaus (Horizont
	# wirkt bewachsen). Innenraeume/Hoehlen/Arenen enden EXAKT an der Wand – sonst
	# sieht man ueber die niedrigen Waende hinweg endlosen Boden ("riesige Halle").
	var pad := 0 if (_indoor or cave or gym) else 1
	for tz in range(-_hh - pad, _hh + pad + 1):
		for tx in range(-_hw - pad, _hw + pad + 1):
			var idx: int = _floor_override.get(Vector2i(tx, tz), _base_tile(tx, tz))
			var uv := _tile_uv(idx)
			var x0 := float(tx) - 0.5
			var x1 := float(tx) + 0.5
			var z0 := float(tz) - 0.5
			var z1 := float(tz) + 0.5
			var p00 := Vector3(x0, 0, z0)
			var p10 := Vector3(x1, 0, z0)
			var p11 := Vector3(x1, 0, z1)
			var p01 := Vector3(x0, 0, z1)
			var u00 := uv.position
			var u10 := Vector2(uv.end.x, uv.position.y)
			var u11 := uv.end
			var u01 := Vector2(uv.position.x, uv.end.y)
			for p in [p00, p11, p10, p00, p01, p11]:
				verts.append(p)
				normals.append(Vector3.UP)
			uvs.append_array([u00, u11, u10, u00, u01, u11])

	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_NORMAL] = normals
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)

	var mi := MeshInstance3D.new()
	mi.name = "Floor"
	mi.mesh = mesh
	mi.material_override = _tile_mat
	add_child(mi)

## Innenräume/Höhlen/Arenen brauchen eine Decke, sonst sieht man über die
## Wände hinweg den hellblauen Himmel-Hintergrund der WorldEnvironment
## ("Rand geht gar nicht"-Bug). Eine einfache abgedunkelte Fläche auf
## Wandhöhe schliesst den Raum nach oben.
func _build_ceiling_mesh() -> void:
	if not (_indoor or cave or gym):
		return
	# Deutlich höher als jede Kamera-Höhe ansetzen (siehe camera_rig.gd INDOOR-
	# Preset) – sonst schwebt die Kamera ÜBER der Decke und blickt von oben auf
	# die Deckenfläche statt auf den Raum darunter (Bug beim ersten Versuch).
	var h := 7.0
	var tile := T_CAVE_WALL if cave else (T_GYM_ROOF if gym else T_HOUSE_ROOF)
	var uv := _tile_uv(tile)
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	var normals := PackedVector3Array()
	for tz in range(-_hh, _hh + 1):
		for tx in range(-_hw, _hw + 1):
			var x0 := float(tx) - 0.5
			var x1 := float(tx) + 0.5
			var z0 := float(tz) - 0.5
			var z1 := float(tz) + 0.5
			_quad(verts, uvs, normals, Vector3(x0, h, z0), Vector3(x1, h, z0), Vector3(x1, h, z1), Vector3(x0, h, z1), uv, Vector3.DOWN)

	var mesh := _finish_mesh(verts, uvs, normals)
	var mi := MeshInstance3D.new()
	mi.name = "Ceiling"
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = load(TILESET_PNG)
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.albedo_color = Color(0.45, 0.45, 0.5)
	mi.material_override = mat
	add_child(mi)

# --- Mesh-Hilfsfunktionen (echte 3D-Geometrie, keine Billboards) -------

## Quad aus 4 Eckpunkten (im Uhrzeigersinn: unten-links, unten-rechts,
## oben-rechts, oben-links relativ zur Blickrichtung `normal`).
static func _quad(verts: PackedVector3Array, uvs: PackedVector2Array, normals: PackedVector3Array,
		p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, uv: Rect2, normal: Vector3) -> void:
	var u00 := uv.position
	var u10 := Vector2(uv.end.x, uv.position.y)
	var u11 := uv.end
	var u01 := Vector2(uv.position.x, uv.end.y)
	for p in [p0, p1, p2]:
		verts.append(p); normals.append(normal)
	uvs.append_array([u00, u10, u11])
	for p in [p0, p2, p3]:
		verts.append(p); normals.append(normal)
	uvs.append_array([u00, u11, u01])

## Dreieck (für Giebel).
static func _tri(verts: PackedVector3Array, uvs: PackedVector2Array, normals: PackedVector3Array,
		p0: Vector3, p1: Vector3, p2: Vector3, uv: Rect2, normal: Vector3) -> void:
	verts.append(p0); verts.append(p1); verts.append(p2)
	normals.append(normal); normals.append(normal); normals.append(normal)
	uvs.append(uv.position)
	uvs.append(Vector2(uv.end.x, uv.position.y))
	uvs.append(Vector2((uv.position.x + uv.end.x) * 0.5, uv.end.y))

func _finish_mesh(verts: PackedVector3Array, uvs: PackedVector2Array, normals: PackedVector3Array) -> ArrayMesh:
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_NORMAL] = normals
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return mesh

func _mesh_instance(mesh: ArrayMesh) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = _tile_mat
	return mi

## Baut eine rechteckige Fläche aus mehreren ~1x1-Kacheln statt EINER über die
## ganze Fläche gestreckten Textur – sonst wirkt die Wand wie eine verzerrte,
## flachgedrückte Textur statt wie echtes Mauerwerk. `origin` = untere linke
## Ecke, `right`/`up` = normierte Basisvektoren der Fläche.
static func _tiled_wall(verts: PackedVector3Array, uvs: PackedVector2Array, normals: PackedVector3Array,
		origin: Vector3, right: Vector3, up: Vector3, width: float, height: float,
		uv: Rect2, normal: Vector3) -> void:
	var cols: int = maxi(1, roundi(width))
	var rows: int = maxi(1, roundi(height))
	var cw := width / float(cols)
	var rh := height / float(rows)
	for row in rows:
		for col in cols:
			var p0 := origin + right * (float(col) * cw) + up * (float(row) * rh)
			var p1 := origin + right * (float(col + 1) * cw) + up * (float(row) * rh)
			var p2 := origin + right * (float(col + 1) * cw) + up * (float(row + 1) * rh)
			var p3 := origin + right * (float(col) * cw) + up * (float(row + 1) * rh)
			_quad(verts, uvs, normals, p0, p1, p2, p3, uv, normal)

## Eine feste (nicht kamera-drehende) Wandfläche, die zur Rauminnenseite zeigt –
## für Innenraum-/Höhlen-/Arena-Wände statt Billboard-Pappaufsteller. Kachelt
## vertikal (rows = height in ganzen Kacheln), damit die Textur nicht gestreckt wirkt.
func _wall_quad(tile_idx: int, normal: Vector3, height: float) -> MeshInstance3D:
	var right: Vector3 = Vector3(0, 0, 1) if abs(normal.x) > 0.5 else Vector3(1, 0, 0)
	var origin := -right * 0.5
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	var normals := PackedVector3Array()
	_tiled_wall(verts, uvs, normals, origin, right, Vector3.UP, 1.0, height, _tile_uv(tile_idx), normal)
	return _mesh_instance(_finish_mesh(verts, uvs, normals))

## Echtes 3D-Haus: 4 feste Wände + Satteldach (First + 2 Giebel) + Kollisionsbox.
## Ersetzt die alte Billboard-Fassade – kein "Pappaufsteller" mehr.
func _build_house(local_pos: Vector3, w: float, depth: float, wall_h: float, roof_h: float,
		wall_tile: int, roof_tile: int, door_tile: int) -> Node3D:
	var node := Node3D.new()
	node.position = local_pos
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	var normals := PackedVector3Array()
	var hw2 := w * 0.5
	var wall_uv := _tile_uv(wall_tile)
	var roof_uv := _tile_uv(roof_tile)

	# Vorderseite (Süden, zur Tür/zum Spieler hin) bei lokal z=0, Rückseite bei z=-depth.
	# Jede Fläche wird aus ~1x1-Kacheln gebaut statt einer gestreckten Textur (siehe _tiled_wall).
	_tiled_wall(verts, uvs, normals, Vector3(-hw2, 0, 0), Vector3(1, 0, 0), Vector3(0, 1, 0), w, wall_h, wall_uv, Vector3(0, 0, 1))
	_tiled_wall(verts, uvs, normals, Vector3(hw2, 0, -depth), Vector3(-1, 0, 0), Vector3(0, 1, 0), w, wall_h, wall_uv, Vector3(0, 0, -1))
	_tiled_wall(verts, uvs, normals, Vector3(-hw2, 0, -depth), Vector3(0, 0, 1), Vector3(0, 1, 0), depth, wall_h, wall_uv, Vector3(-1, 0, 0))
	_tiled_wall(verts, uvs, normals, Vector3(hw2, 0, 0), Vector3(0, 0, -1), Vector3(0, 1, 0), depth, wall_h, wall_uv, Vector3(1, 0, 0))

	# Tür als eigenes, leicht vorgezogenes Quad auf der Vorderseite.
	var door_w: float = minf(0.95, w * 0.35)
	var door_h: float = minf(1.3, wall_h * 0.85)
	var door_uv := _tile_uv(door_tile)
	_quad(verts, uvs, normals, Vector3(-door_w * 0.5, 0, 0.02), Vector3(door_w * 0.5, 0, 0.02),
		Vector3(door_w * 0.5, door_h, 0.02), Vector3(-door_w * 0.5, door_h, 0.02), door_uv, Vector3(0, 0, 1))

	# Satteldach: First entlang X, mittig über der Tiefe.
	var ridge_y := wall_h + roof_h
	var ridge_z := -depth * 0.5
	_quad(verts, uvs, normals, Vector3(-hw2, wall_h, 0), Vector3(hw2, wall_h, 0), Vector3(hw2, ridge_y, ridge_z), Vector3(-hw2, ridge_y, ridge_z), roof_uv, Vector3(0, 0.6, 0.8).normalized())
	_quad(verts, uvs, normals, Vector3(hw2, wall_h, -depth), Vector3(-hw2, wall_h, -depth), Vector3(-hw2, ridge_y, ridge_z), Vector3(hw2, ridge_y, ridge_z), roof_uv, Vector3(0, 0.6, -0.8).normalized())
	_tri(verts, uvs, normals, Vector3(hw2, wall_h, 0), Vector3(hw2, wall_h, -depth), Vector3(hw2, ridge_y, ridge_z), roof_uv, Vector3(1, 0, 0))
	_tri(verts, uvs, normals, Vector3(-hw2, wall_h, -depth), Vector3(-hw2, wall_h, 0), Vector3(-hw2, ridge_y, ridge_z), roof_uv, Vector3(-1, 0, 0))

	node.add_child(_mesh_instance(_finish_mesh(verts, uvs, normals)))

	var body := StaticBody3D.new()
	body.position = Vector3(0, wall_h * 0.5, -depth * 0.5)
	var cs := CollisionShape3D.new()
	var shp := BoxShape3D.new()
	shp.size = Vector3(w, wall_h, depth)
	cs.shape = shp
	body.add_child(cs)
	node.add_child(body)
	return node

# --- Spawns / Wände --------------------------------------------

func _spawns(spawns: Dictionary) -> void:
	for key in spawns:
		var m := Marker3D.new()
		m.name = key
		var p: Array = spawns[key]
		m.position = Vector3(p[0], 0, p[1])
		add_child(m)

func _perimeter(warp_tiles: Array) -> void:
	for x in range(-_hw, _hw + 1):
		for z in [-_hh, _hh]:
			if not _near(x, z, warp_tiles):
				_wall_tile(x, z)
	for z in range(-_hh + 1, _hh):
		for x in [-_hw, _hw]:
			if not _near(x, z, warp_tiles):
				_wall_tile(x, z)

func _near(x: int, z: int, warps: Array) -> bool:
	for w in warps:
		if abs(w.x - x) <= 1 and abs(w.y - z) <= 1:
			return true
	return false

func _wall_tile(x: int, z: int, force_type: String = "") -> void:
	var body := StaticBody3D.new()
	body.position = Vector3(x, 0.5, z)
	var cs := CollisionShape3D.new()
	cs.shape = _shape
	body.add_child(cs)
	if cave or gym or _indoor:
		# Feste, raumeinwärts gerichtete Wandfläche statt Billboard – kein Pappaufsteller.
		var tile := T_CAVE_WALL if cave else (T_GYM_WALL if gym else T_WALL)
		var normal := _inward_normal(x, z)
		var wq := _wall_quad(tile, normal, 2.2 if not cave else 2.0)
		wq.position = Vector3(0, -0.5, 0)
		body.add_child(wq)
	elif force_type == "fence" or (force_type == "" and (x + z) % 7 == 0):
		body.add_child(_flat_sprite(T_FENCE, 1.0, 1.0, 0.1))
	else:
		body.add_child(_flat_sprite(T_TREE_TALL, 1.6, 2.1, 0.7))
	add_child(body)

## Rein dekoratives Gebäude ohne Tür/Warp (Nachbarhäuser fürs Ortsbild).
func _building(b: Dictionary) -> void:
	var x := int(b["at"][0])
	var z := int(b["at"][1])
	var style := String(b.get("style", "green"))
	var wall_tile := T_HOUSE_WALL
	var roof_tile := T_HOUSE_ROOF
	if style == "green":
		roof_tile = T_ROOF_GREEN
	var house := _build_house(Vector3(x, 0, z - 0.5), 3.0, 3.0, 2.0, 1.3, wall_tile, roof_tile, T_HOUSE_DOOR)
	add_child(house)

## Blickrichtung von einem Rand-Tile zur Raummitte (für feste Wandflächen).
func _inward_normal(x: int, z: int) -> Vector3:
	if x <= -_hw:
		return Vector3(1, 0, 0)
	if x >= _hw:
		return Vector3(-1, 0, 0)
	if z <= -_hh:
		return Vector3(0, 0, 1)
	return Vector3(0, 0, -1)

## Billboard-Quad mit einem Tile aus dem Atlas.
func _flat_sprite(tile_idx: int, width: float, height: float, y_base: float) -> Sprite3D:
	var s := Sprite3D.new()
	var tex: Texture2D = _tex_cache
	s.texture = tex
	s.region_enabled = true
	var tw := float(tex.get_width())
	var th := float(tex.get_height())
	# echte Pixel-Zellen (16x16) direkt aus dem Atlas
	var cw := tw / float(_atlas_cols)
	var ch := th / float(_atlas_rows)
	var col := tile_idx % _atlas_cols
	var row := tile_idx / _atlas_cols
	s.region_rect = Rect2(col * cw, row * ch, cw, ch)
	s.pixel_size = height / 16.0
	s.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
	s.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	s.shaded = false
	s.double_sided = true
	s.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	s.position = Vector3(0, y_base, 0)
	return s

# --- Charaktere -------------------------------------------------

func _role_frames(role: String) -> SpriteFrames:
	var path := String(_roles.get(role, ""))
	if path != "" and ResourceLoader.exists(path):
		return load(path)
	return null

func _make_actor(x: int, z: int, script: Script, role := "", facing := "down") -> StaticBody3D:
	var body := StaticBody3D.new()
	body.set_script(script)
	body.position = Vector3(x, 0.5, z)
	if "facing" in body:
		body.set("facing", facing)
	var cs := CollisionShape3D.new()
	cs.shape = _shape
	cs.name = "CollisionShape3D"
	body.add_child(cs)

	var vis := AnimatedSprite3D.new()
	vis.name = "Visual"
	vis.set_script(VISUAL_SCRIPT)
	vis.pixel_size = 0.045
	vis.position = Vector3(0, 0.28, 0)
	var sf := _role_frames(role)
	if sf != null:
		vis.set("external_frames", sf)
		vis.set("static_facing", facing)
	body.add_child(vis)
	return body

func _npc(n: Dictionary) -> void:
	var role := "npc_" + String(n.get("role", "villager_m"))
	var b := _make_actor(int(n["at"][0]), int(n["at"][1]), NPC_SCRIPT, role, n.get("facing", "down"))
	b.set("npc_name", n.get("name", ""))
	b.set("lines", n.get("lines", "..."))
	b.set("flag_after", n.get("flag_after", ""))
	b.set("lines_after", n.get("lines_after", ""))
	b.set("heal_party_on_talk", n.get("heal", false))
	add_child(b)

func _trainer(t: Dictionary) -> void:
	var role := "npc_" + String(t.get("role", "hiker"))
	var b := _make_actor(int(t["at"][0]), int(t["at"][1]), TRAINER_SCRIPT, role, t.get("facing", "down"))
	var species := PackedStringArray()
	var levels := PackedInt32Array()
	for m in t.get("team", []):
		species.append(String(m[0]))
		levels.append(int(m[1]))
	b.set("trainer_name", t.get("name", "Trainer"))
	b.set("species_list", species)
	b.set("level_list", levels)
	b.set("prize_money", int(t.get("prize", 300)))
	b.set("pre_text", t.get("text", "Kämpfen wir!"))
	b.set("win_text", t.get("win_text", "Gut gemacht."))
	b.set("defeat_flag", t.get("flag", ""))
	b.set("sight_range", int(t.get("sight", 4)))
	b.set("badge_id", t.get("badge_id", ""))
	b.set("badge_name", t.get("badge_name", ""))
	add_child(b)

func _sign(s: Dictionary) -> void:
	var body := StaticBody3D.new()
	body.set_script(SIGN_SCRIPT)
	body.position = Vector3(int(s["at"][0]), 0.5, int(s["at"][1]))
	var cs := CollisionShape3D.new()
	cs.shape = _shape
	body.add_child(cs)
	body.add_child(_flat_sprite(12, 1.0, 1.0, 0.1))   # sign-Tile
	body.set("text", s.get("text", "Ein Schild."))
	add_child(body)

func _grass_area(g: Dictionary) -> void:
	var r: Array = g.get("rect", [0, 0, 4, 4])
	var w: float = float(r[2])
	var h: float = float(r[3])
	var cx: float = float(r[0]) + w / 2.0 - 0.5
	var cz: float = float(r[1]) + h / 2.0 - 0.5
	var area := Area3D.new()
	area.set_script(GRASS_SCRIPT)
	area.position = Vector3(cx, 0, cz)
	area.set("table_id", g.get("table", map_id))
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(w, 2, h)
	cs.shape = box
	cs.position = Vector3(0, 0.5, 0)
	area.add_child(cs)
	add_child(area)

func _warp(w: Dictionary, auto: bool) -> void:
	var area := Area3D.new()
	area.set_script(WARP_SCRIPT)
	area.position = Vector3(w["at"][0], 0.4, w["at"][1])
	area.set("target_map", w.get("to", ""))
	area.set("target_spawn", w.get("spawn", "SpawnPoint"))
	area.set("auto", auto)
	area.set("require_facing", w.get("facing", ""))
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.9, 1.6, 0.9)
	cs.shape = box
	area.add_child(cs)
	add_child(area)

func _door(door: Dictionary) -> void:
	var x := int(door["at"][0])
	var z := int(door["at"][1])
	var style := String(door.get("style", "house"))
	var wall_tile := T_HOUSE_WALL
	var roof_tile := T_HOUSE_ROOF
	match style:
		"gym": wall_tile = T_GYM_WALL; roof_tile = T_GYM_ROOF
		"shop": roof_tile = 35   # shop_roof
		"center": roof_tile = 36 # center_roof
		"lab": wall_tile = 37    # lab_wall
		"green": roof_tile = T_ROOF_GREEN

	# Echtes 3D-Haus (4 feste Wände + Satteldach), Front direkt hinter der Türkachel.
	var house := _build_house(Vector3(x, 0, z - 0.5), 3.0, 3.0, 2.0, 1.3, wall_tile, roof_tile, T_HOUSE_DOOR)
	add_child(house)
	# Begehbarer Warp im Türfeld davor. AUTO (wie im Original: reinlaufen genügt,
	# kein Interact nötig) – vorher "false", aber der Interact-Raycast trifft nur
	# PhysicsBody3D, nicht Area3D (Warp), Türen waren dadurch nicht begehbar.
	_warp(door, true)

func _object(o: Dictionary) -> void:
	var kind := String(o.get("kind", ""))
	var x := int(o["at"][0])
	var z := int(o["at"][1])
	match kind:
		"starter_table":
			var b := _make_actor(x, z, STARTER_SCRIPT, "", "down")
			var t := _flat_sprite(27, 1.0, 0.8, 0.15)   # table-Tile
			b.get_node("Visual").queue_free()
			b.add_child(t)
			b.set("giver_name", o.get("name", "Professor Eibe"))
			add_child(b)
		"professor":
			var b := _make_actor(x, z, PROF_SCRIPT, "professor", o.get("facing", "down"))
			b.set("prof_name", o.get("name", "Professor Eibe"))
			add_child(b)
		"shop":
			var b := _make_actor(x, z, SHOP_SCRIPT, "npc_gent", o.get("facing", "down"))
			b.set("shop_name", o.get("name", "Pokémon-Markt"))
			if o.has("stock"):
				b.set("stock", PackedStringArray(o["stock"]))
			add_child(b)
		"gate":
			var body := StaticBody3D.new()
			body.set_script(GATE_SCRIPT)
			body.position = Vector3(x, 0.5, z)
			var cs := CollisionShape3D.new()
			cs.shape = _shape
			cs.name = "CollisionShape3D"
			body.add_child(cs)
			var mesh := AnimatedSprite3D.new()
			mesh.name = "Mesh"
			mesh.set_script(VISUAL_SCRIPT)
			mesh.pixel_size = 0.045
			mesh.position = Vector3(0, 0.28, 0)
			var sf := _role_frames("professor")
			if sf != null:
				mesh.set("external_frames", sf)
				mesh.set("static_facing", o.get("facing", "down"))
			body.add_child(mesh)
			body.set("open_flag", o.get("open_flag", ""))
			body.set("npc_name", o.get("name", ""))
			body.set("block_text", o.get("block_text", "Da geht es gerade nicht weiter."))
			body.set("open_text", o.get("open_text", ""))
			add_child(body)
		"smash_rock":
			var body := StaticBody3D.new()
			body.set_script(SMASH_ROCK_SCRIPT)
			body.position = Vector3(x, 0.5, z)
			var cs := CollisionShape3D.new()
			cs.shape = _shape
			cs.name = "CollisionShape3D"
			body.add_child(cs)
			var spr := _flat_sprite(T_BOULDER, 1.0, 1.0, 0.05)
			spr.name = "Mesh"
			body.add_child(spr)
			body.set("required_badge", o.get("badge", "coal"))
			body.set("required_item", o.get("item", "hm06-rock-smash"))
			body.set("reward_item", o.get("reward_item", ""))
			body.set("reward_amount", int(o.get("reward_amount", 1)))
			body.set("flag_id", o.get("flag", "smashed_%s_%d_%d" % [map_id, x, z]))
			add_child(body)
		"item":
			var body := StaticBody3D.new()
			body.set_script(ITEM_SCRIPT)
			body.position = Vector3(x, 0.5, z)
			var cs := CollisionShape3D.new()
			cs.shape = _shape
			cs.name = "CollisionShape3D"
			body.add_child(cs)
			var mark := Label3D.new()
			mark.text = "●"
			mark.modulate = Color(1, 0.85, 0.2)
			mark.billboard = 1
			mark.fixed_size = true
			mark.pixel_size = 0.001
			mark.font_size = 48
			mark.position = Vector3(0, 0.25, 0)
			body.add_child(mark)
			body.set("item_id", o.get("item", "potion"))
			body.set("amount", int(o.get("amount", 1)))
			body.set("flag_id", o.get("flag", "picked_%s_%d_%d" % [map_id, x, z]))
			add_child(body)
		"deco":
			# rein optische Einrichtung (Bett, Kommode, Regal, Teppich ...)
			var tile := int(o.get("tile", T_TABLE))
			var solid := bool(o.get("solid", true))
			if solid:
				var body := StaticBody3D.new()
				body.position = Vector3(x, 0.5, z)
				var cs := CollisionShape3D.new()
				cs.shape = _shape
				body.add_child(cs)
				body.add_child(_flat_sprite(tile, float(o.get("w", 1.0)), float(o.get("h", 0.9)), float(o.get("y", 0.15))))
				add_child(body)
			# nicht-solide Deko (Teppich etc.) wird schon vor dem Boden-Mesh als
			# Bodentextur eingetragen (siehe build_from_data) – hier nichts weiter zu tun.
		"tv":
			var b := StaticBody3D.new()
			b.set_script(TV_SCRIPT)
			b.position = Vector3(x, 0.5, z)
			var cs := CollisionShape3D.new()
			cs.shape = _shape
			b.add_child(cs)
			b.add_child(_flat_sprite(T_TV, 0.9, 0.8, 0.2))
			b.set("headline", o.get("headline", ""))
			b.set("flag_id", o.get("flag", "watched_tv_" + map_id))
			add_child(b)
