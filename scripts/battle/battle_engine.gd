class_name BattleEngine
extends RefCounted
## Rundenbasiertes Kampfsystem – REINE Logik, keine Nodes.
## resolve_turn() gibt eine Liste von "Events" zurueck, die der Battle-Screen
## nacheinander abspielt (Text, Schaden, K.o., Statuswechsel, ...).
##
## Deterministisch bei gesetztem Seed -> spaeter direkt fuer PvP uebers Netz
## nutzbar (Host wuerfelt, beide Seiten rechnen identisch).

enum Side { PLAYER, ENEMY }

var rng := RandomNumberGenerator.new()
var player_team: Array = []   # Array[PokemonInstance]
var enemy_team: Array = []
var is_wild: bool = true
var trainer_name: String = ""

var player_idx: int = 0
var enemy_idx: int = 0

var _finished: bool = false
var _winner: int = -1          # Side.PLAYER / Side.ENEMY / -1 offen / -2 geflohen / -3 gefangen
var awaiting_player_switch: bool = false
var caught_mon: PokemonInstance = null

func setup(p_team: Array, e_team: Array, wild: bool = true, trainer: String = "", seed_val: int = 0) -> void:
	player_team = p_team
	enemy_team = e_team
	is_wild = wild
	trainer_name = trainer
	if seed_val != 0:
		rng.seed = seed_val
	else:
		rng.randomize()
	for p in player_team:
		p.reset_battle_state()
	for p in enemy_team:
		p.reset_battle_state()
	player_idx = _first_alive(player_team)
	enemy_idx = _first_alive(enemy_team)

# --- Zugriff fuer den Battle-Screen ------------------------------------

func player_active() -> PokemonInstance:
	return player_team[player_idx]

func enemy_active() -> PokemonInstance:
	return enemy_team[enemy_idx]

func is_finished() -> bool:
	return _finished

func winner() -> int:
	return _winner

func move_list() -> Array:
	var out: Array = []
	for m in player_active().moves:
		var d: Dictionary = GameData.moves.get(String(m.id), {})
		out.append({
			"id": m.id, "name": d.get("name", m.id), "type": d.get("type", "normal"),
			"category": d.get("category", "physical"), "pp": m.pp, "pp_max": m.pp_max,
		})
	return out

func can_switch_to(idx: int) -> bool:
	return idx >= 0 and idx < player_team.size() and idx != player_idx and not player_team[idx].is_fainted()

# --- Rundenaufloesung -------------------------------------------------

## choice: { "action": "move"|"switch"|"run", "move_index": int, "switch_index": int }
func resolve_turn(choice: Dictionary) -> Array:
	var ev: Array = []
	if _finished or awaiting_player_switch:
		return ev

	var action := String(choice.get("action", "move"))
	var enemy_move_index := BattleAI.choose_move_index(self, rng)

	# Flucht (nur Wildkampf)
	if action == "run":
		if not is_wild:
			ev.append(_text("Vor einem Trainerkampf kann man nicht fliehen!"))
			return ev
		var pspe := player_active().battle_stat("spe")
		var espe: int = max(1, enemy_active().battle_stat("spe"))
		var odds := int(pspe * 128.0 / espe) + 30
		if pspe > espe or rng.randi_range(0, 255) < odds:
			ev.append({ "t": "run", "ok": true })
			_finished = true
			_winner = -2
			return ev
		ev.append({ "t": "run", "ok": false })

	# Spieler-Wechsel: passiert vor allen Attacken
	if action == "switch":
		var si := int(choice.get("switch_index", -1))
		if can_switch_to(si):
			_switch(Side.PLAYER, si, ev)

	# Item benutzen (Ball / Heilitem): kostet den Zug, Gegner greift danach an
	if action == "item":
		_use_item(String(choice.get("item", "")), ev)
		if _finished:
			return ev
		if enemy_move_index >= 0:
			_perform_move(Side.ENEMY, enemy_move_index, ev)
		if not _finished and not awaiting_player_switch:
			_end_of_turn(ev)
		return ev

	# Reihenfolge bestimmen und Aktionen ausfuehren
	var order := _turn_order(action, int(choice.get("move_index", 0)), enemy_move_index)
	for actor in order:
		if _finished or awaiting_player_switch:
			break
		if actor == Side.PLAYER:
			if action == "move":
				_perform_move(Side.PLAYER, int(choice.get("move_index", 0)), ev)
		else:
			if enemy_move_index < 0:
				ev.append(_text("%s kann nicht angreifen!" % enemy_active().display_name()))
			else:
				_perform_move(Side.ENEMY, enemy_move_index, ev)

	if not _finished and not awaiting_player_switch:
		_end_of_turn(ev)

	return ev

## Nach erzwungenem Wechsel (eigenes Pokémon K.o.).
func force_switch(idx: int) -> Array:
	var ev: Array = []
	if not awaiting_player_switch or not can_switch_to(idx):
		return ev
	awaiting_player_switch = false
	_switch(Side.PLAYER, idx, ev)
	if not _finished:
		_end_of_turn(ev)
	return ev

# --- interne Helfer --------------------------------------------------

func _first_alive(team: Array) -> int:
	for i in team.size():
		if not team[i].is_fainted():
			return i
	return 0

func _has_alive(team: Array) -> bool:
	for p in team:
		if not p.is_fainted():
			return true
	return false

func _text(s: String) -> Dictionary:
	return { "t": "text", "s": s }

func _other(side: int) -> int:
	return Side.ENEMY if side == Side.PLAYER else Side.PLAYER

func _actor_pkmn(side: int) -> PokemonInstance:
	return player_active() if side == Side.PLAYER else enemy_active()

func _target_pkmn(side: int) -> PokemonInstance:
	return enemy_active() if side == Side.PLAYER else player_active()

func _move_priority(pk: PokemonInstance, idx: int) -> int:
	if idx < 0 or idx >= pk.moves.size():
		return 0
	return int(GameData.moves.get(String(pk.moves[idx].id), {}).get("priority", 0))

func _turn_order(player_action: String, p_move_idx: int, e_move_idx: int) -> Array:
	if player_action != "move":
		return [Side.PLAYER, Side.ENEMY]   # Wechsel/Flucht zuerst
	var p_prio := _move_priority(player_active(), p_move_idx)
	var e_prio := _move_priority(enemy_active(), e_move_idx)
	if p_prio != e_prio:
		return [Side.PLAYER, Side.ENEMY] if p_prio > e_prio else [Side.ENEMY, Side.PLAYER]
	var ps := player_active().battle_stat("spe")
	var es := enemy_active().battle_stat("spe")
	if ps == es:
		return [Side.PLAYER, Side.ENEMY] if rng.randi_range(0, 1) == 0 else [Side.ENEMY, Side.PLAYER]
	return [Side.PLAYER, Side.ENEMY] if ps > es else [Side.ENEMY, Side.PLAYER]

func _perform_move(side: int, move_index: int, ev: Array) -> void:
	var user := _actor_pkmn(side)
	var target := _target_pkmn(side)
	if user.is_fainted():
		return

	if user.volatile.get("flinch", false):
		user.volatile.erase("flinch")
		ev.append(_text("%s schreckt zurück!" % user.display_name()))
		return
	if user.status == "paralysis" and rng.randi_range(1, 100) <= 25:
		ev.append(_text("%s ist paralysiert und kann sich nicht bewegen!" % user.display_name()))
		return
	if user.status == "freeze":
		if rng.randi_range(1, 100) <= 20:
			user.status = ""
			ev.append(_text("%s ist aufgetaut!" % user.display_name()))
		else:
			ev.append(_text("%s ist eingefroren!" % user.display_name()))
			return
	if user.status == "sleep":
		user.status_counter -= 1
		if user.status_counter <= 0:
			user.status = ""
			ev.append(_text("%s ist aufgewacht!" % user.display_name()))
		else:
			ev.append(_text("%s schläft tief und fest." % user.display_name()))
			return

	if move_index < 0 or move_index >= user.moves.size():
		move_index = 0
	var slot: Dictionary = user.moves[move_index]
	var move: Dictionary = GameData.moves.get(String(slot.id), {})
	if int(slot.pp) <= 0:
		ev.append(_text("Keine AP mehr für diese Attacke!"))
		return
	slot.pp = int(slot.pp) - 1

	ev.append({ "t": "move", "side": side, "name": move.get("name", slot.id), "user": user.display_name() })

	var calc := DamageCalc.compute(user, target, move, rng)
	if calc.missed:
		ev.append(_text("Die Attacke ging daneben!"))
		return

	var category := String(move.get("category", "physical"))
	if category != "status" and int(move.get("power", 0)) > 0:
		if calc.effectiveness == 0.0:
			ev.append(_text("Es hat keine Wirkung auf %s ..." % target.display_name()))
			return
		target.current_hp = max(0, target.current_hp - int(calc.damage))
		ev.append({
			"t": "damage", "side": _other(side), "amount": calc.damage,
			"hp": target.current_hp, "max": target.max_hp(),
			"effectiveness": calc.effectiveness, "crit": calc.crit,
			"type": String(move.get("type", "normal")),
		})
		if calc.crit:
			ev.append(_text("Ein Volltreffer!"))
		if calc.effectiveness > 1.0:
			ev.append(_text("Das ist sehr effektiv!"))
		elif calc.effectiveness < 1.0:
			ev.append(_text("Das ist nicht sehr effektiv ..."))

		var effd: Dictionary = move.get("effect", {})
		var ekind := String(effd.get("kind", ""))
		if ekind == "drain":
			var healed: int = max(1, int(calc.damage * float(effd.get("ratio", 0.5))))
			user.current_hp = min(user.max_hp(), user.current_hp + healed)
			ev.append({ "t": "damage", "side": side, "amount": -healed, "hp": user.current_hp, "max": user.max_hp(), "effectiveness": 1.0, "crit": false })
			ev.append(_text("%s saugt Energie ab!" % target.display_name()))
		elif ekind == "recoil":
			var recoil: int = max(1, int(calc.damage * float(effd.get("ratio", 0.25))))
			user.current_hp = max(0, user.current_hp - recoil)
			ev.append({ "t": "damage", "side": side, "amount": recoil, "hp": user.current_hp, "max": user.max_hp(), "effectiveness": 1.0, "crit": false })
			ev.append(_text("%s wird durch Rückstoß getroffen!" % user.display_name()))

	_apply_effect(side, move, ev)

	if target.is_fainted():
		_on_faint(_other(side), ev)
	elif user.is_fainted():
		_on_faint(side, ev)

func _apply_effect(side: int, move: Dictionary, ev: Array) -> void:
	var eff: Dictionary = move.get("effect", {})
	if eff.is_empty():
		return
	var kind := String(eff.get("kind", ""))
	var user := _actor_pkmn(side)
	var target := _target_pkmn(side)

	match kind:
		"stat", "stat_chance":
			if kind == "stat_chance" and rng.randi_range(1, 100) > int(eff.get("chance", 100)):
				return
			var who := user if String(eff.get("target", "opponent")) == "self" else target
			if who.is_fainted():
				return
			var changes: Array = eff.get("stat_changes", [])
			if changes.is_empty() and eff.has("stat"):
				changes = [{ "stat": eff.get("stat", "atk"), "stages": eff.get("stages", -1) }]
			for ch in changes:
				var st := String(ch.get("stat", "atk"))
				if not who.stat_stages.has(st):
					continue
				var delta := int(ch.get("stages", -1))
				var cur := int(who.stat_stages.get(st, 0))
				var nw: int = clampi(cur + delta, -6, 6)
				if nw == cur:
					ev.append(_text("%s von %s ändert sich nicht mehr." % [st.to_upper(), who.display_name()]))
				else:
					who.stat_stages[st] = nw
					ev.append({ "t": "stat", "who": who.display_name(), "stat": st, "delta": delta })
					ev.append(_text("%s von %s %s!" % [st.to_upper(), who.display_name(), "steigt" if delta > 0 else "sinkt"]))
		"heal":
			if user.is_fainted():
				return
			var amt: int = max(1, int(user.max_hp() * float(eff.get("ratio", 0.5))))
			var before := user.current_hp
			user.current_hp = min(user.max_hp(), user.current_hp + amt)
			if user.current_hp > before:
				ev.append({ "t": "damage", "side": side, "amount": before - user.current_hp, "hp": user.current_hp, "max": user.max_hp(), "effectiveness": 1.0, "crit": false })
				ev.append(_text("%s heilt sich!" % user.display_name()))
		"status_chance":
			if target.is_fainted() or target.status != "":
				return
			if rng.randi_range(1, 100) > int(eff.get("chance", 100)):
				return
			var s := String(eff.get("status", "burn"))
			target.status = s
			if s == "sleep":
				target.status_counter = rng.randi_range(2, 4)
			ev.append({ "t": "status", "who": target.display_name(), "status": s })
			ev.append(_text("%s %s!" % [target.display_name(), _status_word(s)]))
		"flinch_chance":
			if not target.is_fainted() and rng.randi_range(1, 100) <= int(eff.get("chance", 0)):
				target.volatile["flinch"] = true

func _status_word(s: String) -> String:
	match s:
		"burn": return "wurde verbrannt"
		"paralysis": return "wurde paralysiert"
		"poison": return "wurde vergiftet"
		"sleep": return "ist eingeschlafen"
		"freeze": return "wurde eingefroren"
	return s

func _on_faint(side: int, ev: Array) -> void:
	var pk := _actor_pkmn(side)
	ev.append({ "t": "faint", "side": side, "name": pk.display_name() })

	if side == Side.ENEMY:
		var learner := player_active()
		if not learner.is_fainted():
			var xp := _exp_yield(pk)
			var level_before := learner.level
			var leveled := learner.gain_exp(xp)
			ev.append({ "t": "exp", "who": learner.display_name(), "amount": xp, "leveled": leveled, "level": learner.level })
			if leveled:
				ev.append(_text("%s erreicht Level %d!" % [learner.display_name(), learner.level]))
				for lvl in range(level_before + 1, learner.level + 1):
					for mid in learner.moves_at_level(lvl):
						if not learner.knows_move(mid):
							ev.append({ "t": "learn_move", "mon": learner, "move": mid })
				ev.append({ "t": "evolve_check", "mon": learner })
		if not _has_alive(enemy_team):
			_finished = true
			_winner = Side.PLAYER
			ev.append({ "t": "win", "side": Side.PLAYER, "wild": is_wild, "trainer": trainer_name })
		else:
			enemy_idx = _first_alive(enemy_team)
			ev.append({ "t": "send", "side": Side.ENEMY, "name": enemy_active().display_name(), "trainer": trainer_name })
	else:
		if not _has_alive(player_team):
			_finished = true
			_winner = Side.ENEMY
			ev.append({ "t": "win", "side": Side.ENEMY, "wild": is_wild, "trainer": trainer_name })
		else:
			awaiting_player_switch = true
			ev.append({ "t": "request_switch", "side": Side.PLAYER })

func _end_of_turn(ev: Array) -> void:
	for side in [Side.PLAYER, Side.ENEMY]:
		var pk := _actor_pkmn(side)
		if pk.is_fainted():
			continue
		if pk.status == "burn" or pk.status == "poison":
			var dmg: int = max(1, int(pk.max_hp() / 8.0))
			pk.current_hp = max(0, pk.current_hp - dmg)
			ev.append({ "t": "damage", "side": side, "amount": dmg, "hp": pk.current_hp, "max": pk.max_hp(), "effectiveness": 1.0, "crit": false })
			ev.append(_text("%s leidet unter seinem Statusproblem!" % pk.display_name()))
			if pk.is_fainted():
				_on_faint(side, ev)

func _exp_yield(defeated: PokemonInstance) -> int:
	var base_exp := int(defeated.species().get("base_exp", 50))
	var factor := 1.5 if not is_wild else 1.0
	return max(1, int(base_exp * defeated.level / 7.0 * factor))

func _use_item(item_id: String, ev: Array) -> void:
	var idata: Dictionary = GameData.items.get(item_id, {})
	var cat := String(idata.get("category", "items"))
	if cat == "balls":
		if not is_wild:
			ev.append(_text("Du kannst das Pokémon eines Trainers nicht fangen!"))
			return
		_attempt_catch(item_id, idata, ev)
		return
	# Heilitem auf das aktive Pokémon
	var mon := player_active()
	var eff: Dictionary = idata.get("effect", {})
	var kind := String(eff.get("kind", ""))
	ev.append(_text("Du setzt %s ein." % idata.get("name", item_id)))
	match kind:
		"heal_hp":
			var before := mon.current_hp
			mon.current_hp = min(mon.max_hp(), mon.current_hp + int(eff.get("amount", 20)))
			if String(eff.get("cure_status", "")) == "all":
				mon.status = ""
			ev.append({ "t": "damage", "side": Side.PLAYER, "amount": before - mon.current_hp, "hp": mon.current_hp, "max": mon.max_hp(), "effectiveness": 1.0, "crit": false })
			ev.append(_text("%s wurde geheilt." % mon.display_name()))
		"cure_status":
			mon.status = ""
			ev.append(_text("%s geht es wieder besser." % mon.display_name()))
		"revive":
			pass  # im Kampf auf aktives (nicht K.o.) Pokémon nicht sinnvoll – UI verhindert das
		_:
			ev.append(_text("Es passiert nichts."))

func _attempt_catch(item_id: String, idata: Dictionary, ev: Array) -> void:
	var foe := enemy_active()
	ev.append({ "t": "ball", "phase": "throw", "item": idata.get("name", item_id) })
	var rate := float(foe.species().get("catch_rate", 45))
	var bonus := float(idata.get("ball_bonus", 1.0))
	var sb := 1.0
	if foe.status == "sleep" or foe.status == "freeze":
		sb = 2.0
	elif foe.status != "":
		sb = 1.5
	var a := (3.0 * foe.max_hp() - 2.0 * foe.current_hp) * rate * bonus / (3.0 * foe.max_hp()) * sb
	var shakes := 0
	var caught := false
	if a >= 255.0:
		caught = true
		shakes = 3
	else:
		var b := int(1048560.0 / sqrt(sqrt(16711680.0 / a)))
		caught = true
		for i in 3:
			if rng.randi_range(0, 65535) >= b:
				caught = false
				break
			shakes += 1
		if caught and rng.randi_range(0, 65535) < b:
			shakes = 3
		elif caught:
			caught = false
	ev.append({ "t": "ball", "phase": "result", "shakes": shakes, "caught": caught, "name": foe.display_name() })
	if caught:
		_finished = true
		_winner = -3
		caught_mon = foe
	else:
		ev.append(_text("Mist! So nah dran!"))

func _switch(side: int, idx: int, ev: Array) -> void:
	if side == Side.PLAYER:
		var outp := player_active().display_name()
		player_active().reset_battle_state()
		player_idx = idx
		ev.append({ "t": "switch", "side": side, "out": outp, "in": player_active().display_name() })
	else:
		enemy_active().reset_battle_state()
		enemy_idx = idx
		ev.append({ "t": "switch", "side": side, "out": "", "in": enemy_active().display_name() })
