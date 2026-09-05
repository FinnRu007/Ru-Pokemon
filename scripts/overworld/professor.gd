class_name ProfessorNPC
extends StaticBody3D
## Professor Eibe im Labor: übergibt den Pokédex + Startkapital an Pokébällen.

@export var prof_name: String = "Professor Eibe"

func interact(_player) -> void:
	if DialogueManager.active or BattleManager.in_battle:
		return

	if not GameState.has_flag("got_starter"):
		await DialogueManager.run([
			"Ah, du bist noch ohne Pokémon!",
			"Auf Route 201 – südlich von hier – liegt mein Koffer.",
			"Nimm dir dort eines der drei Pokémon heraus!",
		], prof_name)
		return

	if not GameState.has_flag("got_pokedex"):
		await DialogueManager.run([
			"Da bist du ja! Und schon mit einem Pokémon an deiner Seite.",
			"Nimm diesen POKéDEX – er zeichnet jedes Pokémon auf, das du siehst.",
		], prof_name)
		GameState.set_flag("got_pokedex")
		GameState.set_flag("reached_sandgem")
		GameState.add_item("poke-ball", 5)
		await DialogueManager.run([
			"Hier sind außerdem 5 Pokébälle für den Anfang.",
			"Nach Norden führt Route 202 zur Jubelstadt. Viel Erfolg!",
		], prof_name)
		return

	await DialogueManager.run([
		"Der POKéDEX füllt sich langsam, was?",
		"Fang weiter fleißig Pokémon!",
	], prof_name)
