extends Node
## EvolutionManager (Autoload)
## Prueft `data/generated/evolutions.json` gegen den Level-Up-Trigger und spielt
## bei Treffer die volle Entwicklungssequenz (EvolutionScreen) ab. Andere
## Trigger (Tausch, Steine, Sonderbedingungen) gibt es in diesem Remake noch
## nicht – siehe TODO in PROJEKTSTATUS.md.

const SCREEN_SCENE := preload("res://scenes/ui/EvolutionScreen.tscn")

var _screen: Node = null

func _ready() -> void:
	_screen = SCREEN_SCENE.instantiate()
	add_child(_screen)

## Nach einem Level-Up aufrufen. Entwickelt ggf. mehrfach hintereinander
## (z. B. bei einem grossen Level-Sprung ueber zwei Entwicklungsstufen).
func maybe_evolve_on_level_up(mon: PokemonInstance) -> void:
	while true:
		var target := GameData.evolution_target(mon.species_id, mon.level)
		if target == "":
			return
		var evolved: bool = await _screen.run(mon, target)
		if not evolved:
			return
