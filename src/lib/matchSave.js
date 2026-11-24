// Firestore persistence: match scorecards, career stats, head-to-head, leaderboards.
import {
  doc, getDoc, setDoc, runTransaction, collection, query, where, limit, getDocs, orderBy, increment,
} from 'firebase/firestore';
import { db } from '../firebaseConfig.js';
import { applyLine, matchLines, emptyStats } from './stats.js';
import { sanitize } from './engine.js';

export const matchId = (code, g) => `${code}-${g.startedAt}`;

/** Written once per match by the room authority (host, or first online player) */
export async function saveMatchDoc(code, g) {
  const id = matchId(code, g);
  const ref = doc(db, 'matches', id);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) return;
    const data = sanitize({
      id,
      roomCode: code,
      startedAt: g.startedAt,
      endedAt: g.endedAt,
      settings: g.settings,
      matchNo: g.matchNo,
      seriesId: g.seriesId,
      series: { A: g.series.A, B: g.series.B, T: g.series.T },
      seriesDone: !!g.seriesDone,
      seriesWinner: g.seriesWinner ?? null,
      mos: g.mos ?? null,
      teams: {
        A: { name: g.teams.A.name, players: g.teams.A.players, captain: g.teams.A.captain },
        B: { name: g.teams.B.name, players: g.teams.B.players, captain: g.teams.B.captain },
      },
      names: g.names,
      result: g.result,
      mom: g.mom,
      mvp: g.mvp,
      toss: { winner: g.toss.winner, decision: g.toss.decision },
      innings: g.innings.map((i) => ({
        bat: i.bat, bowl: i.bowl, super: !!i.super, runs: i.runs, wkts: i.wkts, balls: i.balls,
        maxBalls: i.maxBalls, target: i.target, order: i.order || [], batting: i.batting, bowling: i.bowling,
        log: i.log,
      })),
      lines: matchLines(g),
      playerUids: [...g.teams.A.players, ...g.teams.B.players],
    });
    await setDoc(ref, data);
  } catch (e) {
    console.warn('saveMatchDoc', e);
  }
}

/** Apply my stat line once (guarded by the processed list on my user doc) */
export async function applyMyLine(uid, id, line) {
  if (!line) return false;
  const ref = doc(db, 'users', uid);
  let applied = false;
  try {
    applied = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return false;
      const d = snap.data();
      const processed = d.processed || [];
      if (processed.includes(id)) return false;
      const badges = { ...(d.badges || {}) };
      (line.badges || []).forEach((b) => {
        if (!badges[b]) badges[b] = Date.now();
      });
      tx.update(ref, { stats: applyLine(d.stats || emptyStats(), line), badges, processed: [...processed, id].slice(-100) });
      return true;
    });
  } catch (e) {
    console.warn('applyMyLine', e);
    return false;
  }
  if (applied) {
    await Promise.all(
      Object.entries(line.h2h || {}).map(([bowler, p]) =>
        setDoc(
          doc(db, 'h2h', `${uid}_${bowler}`),
          { batter: uid, bowler, runs: increment(p.runs), balls: increment(p.balls), outs: increment(p.outs) },
          { merge: true },
        ).catch((e) => console.warn('h2h', e)),
      ),
    );
  }
  return applied;
}

export async function processGameForMe(code, g, uid) {
  const lines = matchLines(g);
  if (!lines[uid]) return false;
  return applyMyLine(uid, matchId(code, g), lines[uid]);
}

/** Auto-reconnect for stats: apply any finished matches I missed while offline */
export async function syncPendingMatches(uid, processed = []) {
  try {
    const snap = await getDocs(query(collection(db, 'matches'), where('playerUids', 'array-contains', uid), limit(50)));
    for (const d of snap.docs) {
      if (processed.includes(d.id)) continue;
      await applyMyLine(uid, d.id, d.data().lines?.[uid]);
    }
  } catch (e) {
    console.warn('syncPendingMatches', e);
  }
}

export async function getH2H(batter, bowler) {
  try {
    const s = await getDoc(doc(db, 'h2h', `${batter}_${bowler}`));
    return s.exists() ? s.data() : null;
  } catch {
    return null;
  }
}

export async function listPlayers() {
  const s = await getDocs(query(collection(db, 'users'), limit(500)));
  return s.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function listMatches(n = 40) {
  const s = await getDocs(query(collection(db, 'matches'), orderBy('endedAt', 'desc'), limit(n)));
  return s.docs.map((d) => d.data());
}

export async function listMatchesFor(uid, n = 20) {
  const s = await getDocs(query(collection(db, 'matches'), where('playerUids', 'array-contains', uid), limit(n)));
  return s.docs.map((d) => d.data()).sort((a, b) => b.endedAt - a.endedAt);
}

export async function getMatch(id) {
  const s = await getDoc(doc(db, 'matches', id));
  return s.exists() ? s.data() : null;
}

export async function getUser(uid) {
  const s = await getDoc(doc(db, 'users', uid));
  return s.exists() ? { uid, ...s.data() } : null;
}
