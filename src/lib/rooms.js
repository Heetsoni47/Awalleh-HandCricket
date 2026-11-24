// Realtime Database room actions: create/join/leave, teams, settings, game transactions, chat.
import { ref, get, set, update, remove, push, runTransaction, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebaseConfig.js';
import { createGame, normalize, sanitize } from './engine.js';
import { serverNow } from './time.js';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const roomRef = (code, path = '') => ref(rtdb, `rooms/${code}${path ? `/${path}` : ''}`);

export const DEFAULT_SETTINGS = { teamSize: 1, overs: 2, innings: 2, series: 1 };

function genCode() {
  let c = '';
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

export async function createRoom(user) {
  let code;
  for (let i = 0; i < 6; i++) {
    code = genCode();
    const snap = await get(roomRef(code, 'meta'));
    if (!snap.exists()) break;
  }
  const now = serverNow();
  // multi-path update: each part is checked against its own security rule
  // (a single set() on rooms/{code} would be refused, there is no rule at that level)
  await update(roomRef(code), {
    meta: { hostUid: user.uid, createdAt: now, status: 'lobby' },
    settings: DEFAULT_SETTINGS,
    [`players/${user.uid}`]: { name: user.username, team: 'A', joinedAt: now, online: true },
    teams: { A: { name: 'Team A', captain: user.uid }, B: { name: 'Team B', captain: null } },
  });
  localStorage.setItem('hc:lastRoom', code);
  return code;
}

/** Join or rejoin. New players get a team with space, otherwise spectator. */
export async function joinRoom(code, user) {
  const [metaS, playersS, settingsS, teamsS] = await Promise.all([
    get(roomRef(code, 'meta')),
    get(roomRef(code, 'players')),
    get(roomRef(code, 'settings')),
    get(roomRef(code, 'teams')),
  ]);
  if (!metaS.exists()) throw new Error('Room not found');
  const meta = metaS.val();
  const players = playersS.val() || {};
  const settings = settingsS.val() || DEFAULT_SETTINGS;
  const teams = teamsS.val() || {};
  const me = players[user.uid];

  if (me) {
    await update(roomRef(code, `players/${user.uid}`), { online: true, name: user.username });
  } else {
    const count = (t) => Object.values(players).filter((p) => p.team === t).length;
    let team = 'spec';
    if (meta.status === 'lobby') {
      const a = count('A');
      const b = count('B');
      if (a <= b && a < settings.teamSize) team = 'A';
      else if (b < settings.teamSize) team = 'B';
      else if (a < settings.teamSize) team = 'A';
    }
    await set(roomRef(code, `players/${user.uid}`), { name: user.username, team, joinedAt: serverNow(), online: true });
    if (team !== 'spec' && !teams[team]?.captain) await update(roomRef(code, `teams/${team}`), { captain: user.uid });
  }
  onDisconnect(roomRef(code, `players/${user.uid}/online`)).set(false);
  localStorage.setItem('hc:lastRoom', code);
}

export async function leaveRoom(code, uid, room) {
  localStorage.removeItem('hc:lastRoom');
  const p = room?.players?.[uid];
  if (room?.meta?.status === 'lobby' && room?.meta?.hostUid !== uid) {
    await remove(roomRef(code, `players/${uid}`));
    if (p && room.teams?.[p.team]?.captain === uid) {
      const next = Object.entries(room.players).find(([u, q]) => u !== uid && q.team === p.team)?.[0] || null;
      await update(roomRef(code, `teams/${p.team}`), { captain: next });
    }
  } else {
    await update(roomRef(code, `players/${uid}`), { online: false });
  }
}

export async function setTeam(code, room, uid, team) {
  const players = room.players || {};
  const size = room.settings.teamSize;
  if (team !== 'spec' && Object.entries(players).filter(([u, p]) => p.team === team && u !== uid).length >= size) {
    throw new Error('That team is full');
  }
  const prev = players[uid]?.team;
  const updates = { [`players/${uid}/team`]: team };
  if (prev && prev !== 'spec' && room.teams?.[prev]?.captain === uid) {
    updates[`teams/${prev}/captain`] = Object.entries(players).find(([u, p]) => u !== uid && p.team === prev)?.[0] || null;
  }
  if (team !== 'spec' && !room.teams?.[team]?.captain) updates[`teams/${team}/captain`] = uid;
  await update(roomRef(code), updates);
}

export async function autoBalance(code, room) {
  const ids = Object.entries(room.players || {})
    .filter(([, p]) => p.online !== false)
    .map(([u]) => u)
    .sort(() => Math.random() - 0.5);
  const size = room.settings.teamSize;
  const updates = {};
  const A = [];
  const B = [];
  ids.forEach((u, i) => {
    let team = i % 2 === 0 ? 'A' : 'B';
    if (team === 'A' && A.length >= size) team = B.length < size ? 'B' : 'spec';
    if (team === 'B' && B.length >= size) team = A.length < size ? 'A' : 'spec';
    if (team === 'A') A.push(u);
    if (team === 'B') B.push(u);
    updates[`players/${u}/team`] = team;
  });
  updates['teams/A/captain'] = A[0] || null;
  updates['teams/B/captain'] = B[0] || null;
  await update(roomRef(code), updates);
}

// --------------------------------------------------------------------------- bots

const BOT_NAMES = ['Yorker Bot', 'Googly Bot', 'Bouncer Bot', 'Spin Bot', 'Swing Bot', 'Doosra Bot', 'Slog Bot', 'Seam Bot', 'Flipper Bot', 'Helicopter Bot'];

/** Host adds a computer player to a team. Bots play on the host's device. */
export async function addBot(code, room, team) {
  const players = room.players || {};
  const size = room.settings.teamSize;
  if (Object.values(players).filter((p) => p.team === team).length >= size) throw new Error('That team is full');
  const used = new Set(Object.values(players).map((p) => p.name));
  const name = BOT_NAMES.find((n) => !used.has(n)) || `Bot ${Object.keys(players).length + 1}`;
  const uid = `bot_${Math.random().toString(36).slice(2, 10)}`;
  const updates = { [`players/${uid}`]: { name, team, joinedAt: serverNow(), online: true, bot: true } };
  if (!room.teams?.[team]?.captain) updates[`teams/${team}/captain`] = uid;
  await update(roomRef(code), updates);
}

export async function removeBot(code, room, uid) {
  const p = room.players?.[uid];
  if (!p?.bot) return;
  const updates = { [`players/${uid}`]: null };
  if (room.teams?.[p.team]?.captain === uid) {
    updates[`teams/${p.team}/captain`] = Object.entries(room.players).find(([u, q]) => u !== uid && q.team === p.team && !q.bot)?.[0]
      || Object.entries(room.players).find(([u, q]) => u !== uid && q.team === p.team)?.[0] || null;
  }
  await update(roomRef(code), updates);
}

/** Solo practice: a 1v1 room against a bot, ready to start */
export async function createBotRoom(user) {
  const code = await createRoom(user);
  const botId = `bot_${Math.random().toString(36).slice(2, 10)}`;
  await update(roomRef(code), {
    [`players/${botId}`]: { name: 'Yorker Bot', team: 'B', joinedAt: serverNow(), online: true, bot: true },
    'teams/A/name': user.username,
    'teams/B': { name: 'Bots XI', captain: botId },
  });
  return code;
}

export const setCaptain = (code, team, uid) => update(roomRef(code, `teams/${team}`), { captain: uid });
export const setTeamName = (code, team, name) => update(roomRef(code, `teams/${team}`), { name: name.slice(0, 24) });
export const updateSettings = (code, patch) => update(roomRef(code, 'settings'), patch);

export function canStart(room) {
  const size = room.settings?.teamSize || 1;
  const count = (t) => Object.values(room.players || {}).filter((p) => p.team === t).length;
  if (count('A') !== size || count('B') !== size) return `Both teams need ${size} player${size > 1 ? 's' : ''}`;
  return null;
}

export async function startMatch(code, room, prev = null) {
  const game = createGame({ room, now: serverNow(), prev });
  await update(roomRef(code), { game: sanitize(game), 'meta/status': 'live', ball: null });
  await postSystem(code, prev ? `Match ${game.matchNo} is on` : `${game.teams.A.name} vs ${game.teams.B.name}. Match on`);
}

export async function backToLobby(code) {
  await update(roomRef(code), { game: null, ball: null, 'meta/status': 'lobby' });
}

/**
 * Run an engine function inside an RTDB transaction on the game node.
 * fn(game, now) returns the new game or null to abort.
 * Resolves to { committed, sys } where sys are chat announcements from the applied change.
 */
export async function gameTx(code, fn) {
  let sys = [];
  const res = await runTransaction(
    roomRef(code, 'game'),
    (cur) => {
      if (!cur) return undefined;
      const g = normalize(cur);
      delete g._sys;
      const next = fn(g, serverNow());
      if (!next) return undefined;
      sys = next._sys || [];
      delete next._sys;
      return sanitize(next);
    },
    { applyLocally: false },
  );
  if (res.committed && sys.length) {
    for (const t of sys) await postSystem(code, t);
  }
  return { committed: res.committed, sys };
}

// --------------------------------------------------------------------------- chat & reactions

export function postSystem(code, text) {
  return push(roomRef(code, 'chat/all'), { system: true, text, channel: 'all', timestamp: serverTimestamp() });
}

export function postChat(code, { uid, name, team, channel, text }) {
  const path = channel === 'team' && (team === 'A' || team === 'B') ? `chat/${team}` : 'chat/all';
  return push(roomRef(code, path), {
    uid,
    senderName: name,
    team: team || 'spec',
    teamColor: team === 'A' ? 'teamA' : team === 'B' ? 'teamB' : 'spec',
    channel: channel === 'team' ? 'team' : 'all',
    text: text.slice(0, 400),
    timestamp: serverTimestamp(),
  });
}

export async function sendReaction(code, { uid, name, emoji }) {
  await push(roomRef(code, 'reactions'), { uid, name, emoji, at: serverTimestamp() });
}
