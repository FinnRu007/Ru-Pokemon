class_name TvNews
extends StaticBody3D
## Fernseher im Kinderzimmer: zeigt beim ersten Ansehen eine kurze Nachrichten-
## Meldung (eigene, an die Serie angelehnte Kulisse – kein Originaltext).

@export var headline: String = ""
@export var flag_id: String = ""

const DEFAULT_LINES := [
	"... und jetzt zu den Nachrichten.",
	"Angler an einem See im Norden berichten von einem Pokémon in ungewöhnlich roter Farbe.",
	"Experten vermuten ein sehr seltenes, verfärbtes Exemplar. Weitere Berichte folgen.",
	"Nun aber zum Wetter ...",
]

func interact(_player) -> void:
	if DialogueManager.active:
		return
	var lines := DEFAULT_LINES
	if headline.strip_edges() != "":
		lines = [headline] + DEFAULT_LINES.slice(1)
	await DialogueManager.run(lines, "TV")
	if flag_id != "":
		GameState.set_flag(flag_id)
