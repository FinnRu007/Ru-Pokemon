class_name StatCalc
extends RefCounted
## Gen-4-Statuswert-Berechnung. Reine Mathematik, keine Nodes.

const STATS := ["hp", "atk", "def", "spa", "spd", "spe"]

## 25 Naturen -> [erhoehter Stat, gesenkter Stat] (leer = neutral).
const NATURES := {
	"hardy": [], "lonely": ["atk", "def"], "brave": ["atk", "spe"], "adamant": ["atk", "spa"], "naughty": ["atk", "spd"],
	"bold": ["def", "atk"], "docile": [], "relaxed": ["def", "spe"], "impish": ["def", "spa"], "lax": ["def", "spd"],
	"timid": ["spe", "atk"], "hasty": ["spe", "def"], "serious": [], "jolly": ["spe", "spa"], "naive": ["spe", "spd"],
	"modest": ["spa", "atk"], "mild": ["spa", "def"], "quiet": ["spa", "spe"], "bashful": [], "rash": ["spa", "spd"],
	"calm": ["spd", "atk"], "gentle": ["spd", "def"], "sassy": ["spd", "spe"], "careful": ["spd", "spa"], "quirky": [],
}

static func nature_multiplier(nature: String, stat: String) -> float:
	var n: Array = NATURES.get(nature, [])
	if n.size() != 2:
		return 1.0
	if n[0] == stat:
		return 1.1
	if n[1] == stat:
		return 0.9
	return 1.0

## base = Basiswert der Spezies, iv 0..31, ev 0..252, level 1..100
static func calc_hp(base: int, iv: int, ev: int, level: int) -> int:
	if base == 1:
		return 1  # Wonder Guard / Shedinja-Sonderfall
	return int(floor((2 * base + iv + floor(ev / 4.0)) * level / 100.0)) + level + 10

static func calc_other(base: int, iv: int, ev: int, level: int, nature: String, stat: String) -> int:
	var raw := int(floor((2 * base + iv + floor(ev / 4.0)) * level / 100.0)) + 5
	return int(floor(raw * nature_multiplier(nature, stat)))

## Stat-Stufen -1..-6 / +1..+6 -> Multiplikator (Gen 3+).
static func stage_multiplier(stage: int) -> float:
	stage = clampi(stage, -6, 6)
	if stage >= 0:
		return (2.0 + stage) / 2.0
	return 2.0 / (2.0 - stage)

## Erfahrung fuer ein Level je nach Wachstumsrate.
static func exp_for_level(growth_rate: String, level: int) -> int:
	var n := float(level)
	match growth_rate:
		"fast":
			return int(0.8 * n * n * n)
		"slow":
			return int(1.25 * n * n * n)
		"medium_slow":
			return int(max(0.0, 1.2 * n * n * n - 15.0 * n * n + 100.0 * n - 140.0))
		_:  # medium_fast
			return int(n * n * n)
