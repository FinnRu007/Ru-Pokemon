class_name BattleAI
extends RefCounted
## Einfache Gegner-KI: meist die Attacke mit dem hoechsten erwarteten Schaden,
## manchmal zufaellig (damit es nicht komplett vorhersehbar ist).

static func choose_move_index(engine, rng: RandomNumberGenerator) -> int:
	var user: PokemonInstance = engine.enemy_active()
	var target: PokemonInstance = engine.player_active()

	var usable: Array = []
	for i in user.moves.size():
		if int(user.moves[i].pp) > 0:
			usable.append(i)
	if usable.is_empty():
		return -1   # Verzweifler (spaeter); vorerst: nichts

	# 25 % rein zufaellig
	if rng.randi_range(1, 100) <= 25:
		return usable[rng.randi_range(0, usable.size() - 1)]

	var best_i: int = usable[0]
	var best_score := -1.0
	for i in usable:
		var mv: Dictionary = GameData.moves.get(String(user.moves[i].id), {})
		var score := 0.0
		if String(mv.get("category", "status")) == "status":
			score = 8.0   # Status-Moves selten, aber moeglich
		else:
			var sim := DamageCalc.compute(user, target, mv, _fixed_rng())
			score = float(sim.damage) * float(sim.effectiveness if sim.effectiveness > 0.0 else 0.01)
		if score > best_score:
			best_score = score
			best_i = i
	return best_i

static func _fixed_rng() -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = 1234567
	return r
