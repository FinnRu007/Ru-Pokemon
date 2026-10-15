// Nachrichtentypen zwischen Client und Server (JSON ueber WebSocket: { t: TYP, ...daten }).
export const C2S = {
  HELLO: 'hello',                 // { name, token?, runCode?, rules? }
  CHOOSE_STARTER: 'chooseStarter',// { speciesId }
  MOVE: 'move',                   // { dir, seq, running }
  FACE: 'face',                   // { dir }
  INTERACT: 'interact',           // {}
  CHAT: 'chat',                   // { text }
  BATTLE_ACTION: 'battleAction',  // { type: 'move'|'switch'|'ball'|'run', index?, ball? }
  PARTY_SWAP: 'partySwap',        // { from, to }
  BOX_MOVE: 'boxMove',            // { pokemonId, to: 'party'|'box' }
  NICKNAME: 'nickname',           // { pokemonId, name }
  LEARN_MOVE: 'learnMove',        // { pokemonId, moveId, replaceIndex (-1 = verwerfen) }
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
  PONG: 'pong'
};

// Timing wie im Original: Gehen ca. 16 Frames pro Kachel, Rennen (Laufschuhe) ca. 8 Frames.
export const WALK_MS = 250;
export const RUN_MS = 125;
