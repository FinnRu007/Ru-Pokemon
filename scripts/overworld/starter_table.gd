class_name StarterTable
extends StaticBody3D
## Interaktion -> Starter-Pokémon auswählen (Chelast / Panflam / Plinfa).
## Setzt das Flag `got_starter`.

const STARTERS := ["turtwig", "chimchar", "piplup"]

@export var giver_name: String = "Professor Eibe"
@export var starter_level: int = 5

func interact(_player) -> void:
	if DialogueManager.active or BattleManager.in_battle:
		return
	if GameState.has_flag("got_starter"):
		await DialogueManager.run(["Kümmere dich gut um dein Pokémon!"], giver_name)
		return

	await DialogueManager.run([
		"Diese drei Pokémon stehen zur Wahl.",
		"Überleg dir gut, welches du nimmst!",
	], giver_name)

	while true:
		var names := STARTERS.map(func(s): return GameData.species_name(s))
		var pick: int = await DialogueManager.ask("Welches Pokémon möchtest du?", names, giver_name)
		var species: String = STARTERS[pick]
		var sname: String = GameData.species_name(species)
		var confirm: int = await DialogueManager.ask("Du nimmst %s?" % sname, ["Ja", "Nein"], giver_name)
		if confirm != 0:
			continue

		var mon := PokemonInstance.create(species, starter_level)
		GameState.add_to_party(mon)
		GameState.register_caught(species)
		GameState.set_flag("got_starter")
		await DialogueManager.run([
			"Du hast %s erhalten!" % sname,
			"Euer Abenteuer beginnt jetzt!",
		], giver_name)
		return
