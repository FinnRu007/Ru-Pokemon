// Nachrichtentypen zwischen Client und Server (JSON ueber WebSocket: { t: TYP, ...daten }).
export const C2S = {
  HELLO: 'hello',                 // { name, token?, runCode?, rules? }
  CHOOSE_STARTER: 'chooseStarter',// { speciesId }
  MOVE: 'move',                   // { dir, seq, running }
  FACE: 'face',                   // { dir }
  INTERACT: 'interact',           // {}
  CHAT: 'chat',                   // { text }
  BATTLE_ACTION: 'battleAction',  // { type: 'move'|'switch'|'ball'|'item'|'run', index?, ball?, item? }
  PARTY_SWAP: 'partySwap',        // { from, to }
  BOX_MOVE: 'boxMove',            // { pokemonId, to: 'party'|'box' }
  NICKNAME: 'nickname',           // { pokemonId, name }
  LEARN_MOVE: 'learnMove',        // { pokemonId, moveId, replaceIndex (-1 = verwerfen) }
  DIALOG_DONE: 'dialogDone',      // { token, choice? }
  BUY: 'buy',                     // { item, count }
  SHOP_CLOSE: 'shopClose',        // {}
  USE_ITEM: 'useItem',            // { item, pokemonId }
  EMOTE: 'emote',                 // { kind } kleine Sprechblase ueber der eigenen Figur
  FLY: 'fly',                     // { to? } Fliegen: Auswahl besuchter Orte, mit to direkt dorthin (Weltkarte)
  SAVE: 'save',                   // {} Spiel speichern (Menue)
  PING: 'ping'
};

export const S2C = {
  WELCOME: 'welcome',
  NEED_STARTER: 'needStarter',
  ERROR: 'error',
  NOTICE: 'notice',
  MOVE_ACK: 'moveAck',            // { seq, ok, map, x, y, dir }
  MAP_CHANGE: 'mapChange',        // { map, x, y, dir, players }
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  PLAYER_MOVED: 'playerMoved',
  PLAYER_STATE: 'playerState',
  CHAT: 'chat',
  PARTY: 'party',                 // { party, box, items }
  NUZLOCKE: 'nuzlocke',           // { rules, encounters, links }
  SOUL_DEATH: 'soulDeath',        // { pokemonName, playerName, partnerName, cause }
  BATTLE_START: 'battleStart',
  BATTLE_EVENTS: 'battleEvents',
  BATTLE_END: 'battleEnd',
  GAME_OVER: 'gameOver',
  DIALOG: 'dialog',               // { token, lines: [{ speaker, text }], choices?, face? }
  SCRIPT: 'script',               // { active }
  PROGRESS: 'progress',           // { flags, money, trainerId, playMs, dex: { seen, caught } }
  SAVED: 'saved',                 // { at, map, playMs, badges } Bestaetigung nach dem Speichern
  NPC_EMOTE: 'npcEmote',          // { id }
  SHOP: 'shop',                   // { stock: [{ id, name, price, locked }], money }
  ROSTER: 'roster',               // { players: [{ id, name, map, x, y, color, runId }] } alle online (Weltkarte)
  PLAYER_EMOTE: 'playerEmote',    // { id, kind }
  PONG: 'pong'
};

// Timing wie im Original: Gehen ca. 16 Frames pro Kachel, Rennen (Laufschuhe) ca. 8 Frames.
// Erlaubte Emotes (Taste 1 bis 6)
export const EMOTES = ['!', '?', '♥', '♪', '…', '☺'];

export const WALK_MS = 250;
export const RUN_MS = 125;
