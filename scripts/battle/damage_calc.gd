class_name DamageCalc
extends RefCounted
## Gen-4-Schadensformel + Typ-Effektivitaet. Reine Mathematik.

## Typ-Multiplikator einer Attacke gegen ein (ggf. Doppel-)Typ-Ziel.
static func type_effectiveness(move_type: String, defender_types: Array) -> float:
	var mult := 1.0
	for dt in defender_types:
		mult *= GameData.type_multiplier(move_type, dt)
	return mult

## Ergebnis: { damage, effectiveness, crit, missed }
static func compute(attacker: PokemonInstance, defender: PokemonInstance, move: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var result := { "damage": 0, "effectiveness": 1.0, "crit": false, "missed": false, "category": move.get("category", "physical") }

	var category := String(move.get("category", "physical"))
	if category == "status":
		return result

	# Genauigkeit
	var acc := int(move.get("accuracy", 100))
	if acc < 100 and rng.randi_range(1, 100) > acc:
		result.missed = true
		return result

	var power := int(move.get("power", 0))
	if power <= 0:
		return result

	var atk_stat := "atk" if category == "physical" else "spa"
	var def_stat := "def" if category == "physical" else "spd"
	var a := attacker.battle_stat(atk_stat)
	var d := defender.battle_stat(def_stat)

	# Krit (Gen 4: Stufe 0 = 1/16, x2 Schaden; ignoriert negative Angreifer-Stufen)
	var crit_rates := [16, 8, 4, 3, 2]
	var cs: int = clampi(int(move.get("crit_stage", 0)), 0, 4)
	var crit := rng.randi_range(1, crit_rates[cs]) == 1
	if crit:
		result.crit = true
		if attacker.stat_stages.get(atk_stat, 0) < 0:
			a = attacker.stat(atk_stat)
		if defender.stat_stages.get(def_stat, 0) > 0:
			d = defender.stat(def_stat)

	var level := attacker.level
	var base_dmg := int(floor(floor(floor(2.0 * level / 5.0 + 2.0) * power * a / float(d)) / 50.0)) + 2

	if crit:
		base_dmg = int(base_dmg * 2)

	# STAB
	if String(move.get("type", "normal")) in attacker.types():
		base_dmg = int(floor(base_dmg * 1.5))

	# Typ-Effektivitaet
	var eff := type_effectiveness(String(move.get("type", "normal")), defender.types())
	result.effectiveness = eff
	base_dmg = int(floor(base_dmg * eff))

	# Brand (physisch bereits ueber battle_stat) – Zufallsfaktor 0.85..1.00
	if eff > 0.0:
		base_dmg = int(floor(base_dmg * rng.randi_range(85, 100) / 100.0))
		base_dmg = max(1, base_dmg)

	result.damage = base_dmg
	return result
