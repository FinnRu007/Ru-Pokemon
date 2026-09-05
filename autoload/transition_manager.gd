extends Node
## TransitionManager (Autoload)
## Kurzes Abblenden bei JEDEM Kartenwechsel (Tür, Treppe, Route, Warp) – damit
## man nie einen Frame lang "ins Leere" läuft (alte Geometrie, Himmel-
## Hintergrund, Pop-in). Wird zentral von SceneManager.load_map() aufgerufen.

const FADE_OUT_TIME := 0.14
const FADE_IN_TIME := 0.18

var _layer: CanvasLayer
var _rect: ColorRect
var _ready_done: bool = false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_layer = CanvasLayer.new()
	_layer.layer = 100
	_rect = ColorRect.new()
	_rect.color = Color(0, 0, 0, 0)
	_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_layer.add_child(_rect)
	get_tree().root.add_child.call_deferred(_layer)
	await get_tree().process_frame
	_ready_done = true

func fade_out() -> void:
	if not _ready_done:
		await get_tree().process_frame
	var tw := create_tween()
	tw.tween_property(_rect, "color:a", 1.0, FADE_OUT_TIME)
	await tw.finished

func fade_in() -> void:
	var tw := create_tween()
	tw.tween_property(_rect, "color:a", 0.0, FADE_IN_TIME)
	await tw.finished
