// ---------------------------------------------------------------------------
// Hand Cricket match engine.
//
// Pure functions over a plain `game` object stored at rooms/{code}/game in the
// Realtime Database. Every state change runs inside an RTDB transaction, so
// whichever client applies it first wins and everyone else sees the same result.
//
// Phases:  toss → setup → ball ⇄ setup (bowler change / next innings) → matchOver
// ---------------------------------------------------------------------------

import { ballLine, milestoneLine, sysForBall } from './commentary.js';

export const SHOT_MS = 10000; // anti-AFK shot clock per ball
export const REVEAL_MS = 2400; // 3-2-1 countdown (1500) + result on screen
export const COUNTDOWN_MS = 1500; // the next ball can be picked as soon as this ends
export const GRACE_MS = 3000; // extra wait before the host forces a timed-out ball
export const BALLS_PER_OVER = 6;

export const other = (t) => (t === 'A' ? 'B' : 'A');
export const oversStr = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
export const sanitize = (o) => JSON.parse(JSON.stringify(o ?? null));

const emptyBat = () => ({ runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, out: false, firstBallOut: false, autoOut: false, outBy: null });
const emptyBowl = () => ({ balls: 0, runs: 0, wkts: 0, maidens: 0, dots: 0 });

// RTDB drops empty arrays/objects and nulls, so restore defaults after every read
export function normalize(g) {
  if (!g) return g;
  g.innings = g.innings || [];
  g.commentary = g.commentary || [];
  g.series = g.series || { A: 0, B: 0, T: 0 };
  g.series.results = g.series.results || [];
  g.series.mvp = g.series.mvp || {};
  g.toss = g.toss || {};
  g.toss.throws = g.toss.throws || {};
  g.names = g.names || {};
  g.mvp = g.mvp || {};
  g.bots = g.bots || [];
  for (const t of ['A', 'B']) {
    g.teams[t].players = g.teams[t].players || [];
  }
  g.innings.forEach((inn) => {
    inn.over = inn.over || [];
    inn.lastOver = inn.lastOver || [];
    inn.log = inn.log || [];
    inn.batting = inn.batting || {};
    inn.bowling = inn.bowling || {};
    inn.order = inn.order || null;
    inn.bowler = inn.bowler || null;
    inn.lastBowler = inn.lastBowler || null;
    if (inn.target === undefined) inn.target = null;
  });
  return g;
}

const teamName = (g, t) => g.teams[t]?.name || `Team ${t}`;
const nm = (g, uid) => g.names[uid] || 'Player';

function say(g, text, sys = false) {
  g.commentary.unshift({ t: text, k: g.ballSeq });
  g.commentary = g.commentary.slice(0, 30);
  if (sys) (g._sys = g._sys || []).push(sys === true ? text : sys);
}

// --------------------------------------------------------------------------- creation

export function createGame({ room, now, prev }) {
  const players = room.players || {};
  const byTeam = (t) =>
    Object.entries(players)
      .filter(([, p]) => p.team === t)
      .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0))
      .map(([uid]) => uid);
  const names = {};
  Object.entries(players).forEach(([uid, p]) => (names[uid] = p.name));
  const A = byTeam('A');
  const B = byTeam('B');
  const teams = room.teams || {};
  const bots = Object.entries(players).filter(([, p]) => p.bot).map(([uid]) => uid);
  // a human captains whenever the team has one; a bot only captains an all-bot team
  const cap = (t, list) => {
    const humans = list.filter((u) => !bots.includes(u));
    const chosen = teams[t]?.captain;
    if (list.includes(chosen) && (!bots.includes(chosen) || humans.length === 0)) return chosen;
    return humans[0] || list[0];
  };

  const g = {
    phase: 'toss',
    matchNo: prev ? prev.matchNo + 1 : 1,
    seriesId: prev ? prev.seriesId : now,
    settings: { ...room.settings },
    teams: {
      A: { name: teams.A?.name || 'Team A', captain: cap('A', A), players: A },
      B: { name: teams.B?.name || 'Team B', captain: cap('B', B), players: B },
    },
    names,
    bots,
    series: prev ? sanitize(prev.series) : { A: 0, B: 0, T: 0, results: [], mvp: {} },
    toss: { call: null, throws: {}, winner: null, decision: null, sum: null },
    innings: [],
    cur: -1,
    ballSeq: 0,
    deadline: 0,
    lastBall: null,
    commentary: [],
    result: null,
    superRound: 0,
    startedAt: now,
    endedAt: null,
    mom: null,
    mvp: {},
    seriesDone: false,
  };
  say(g, `Match ${g.matchNo}: ${g.teams.A.name} vs ${g.teams.B.name}. ${g.teams.A.name} captain calls the toss.`);
  return g;
}

// --------------------------------------------------------------------------- toss

export function tossCall(g, call) {
  if (g.phase !== 'toss' || g.toss.call) return null;
  g.toss.call = call; // Team A's call, Team B automatically has the other
  say(g, `${teamName(g, 'A')} call ${call}. Both captains, throw your number.`);
  return g;
}

export function tossThrow(g, team, n) {
  if (g.phase !== 'toss' || !g.toss.call || g.toss.throws[team] || g.toss.winner) return null;
  g.toss.throws[team] = n;
  const { A, B } = g.toss.throws;
  if (A && B) {
    const sum = A + B;
    const parity = sum % 2 === 0 ? 'even' : 'odd';
    g.toss.sum = sum;
    g.toss.winner = parity === g.toss.call ? 'A' : 'B';
    say(g, `${A} + ${B} = ${sum}, that is ${parity}. ${teamName(g, g.toss.winner)} win the toss.`, `🪙 ${teamName(g, g.toss.winner)} won the toss`);
  }
  return g;
}

export function tossDecide(g, decision, now) {
  if (g.phase !== 'toss' || !g.toss.winner || g.toss.decision) return null;
  g.toss.decision = decision;
  const w = g.toss.winner;
  const bat = decision === 'bat' ? w : other(w);
  say(g, `${teamName(g, w)} elect to ${decision} first.`, `${teamName(g, w)} chose to ${decision} first`);
  return startInnings(g, bat, { now });
}

// --------------------------------------------------------------------------- innings

function startInnings(g, bat, { now, isSuper = false, target = null }) {
  const bowl = other(bat);
  const batPlayers = g.teams[bat].players;
  const bowlPlayers = g.teams[bowl].players;
  const inn = {
    bat,
    bowl,
    super: isSuper,
    runs: 0,
    wkts: 0,
    balls: 0,
    maxBalls: isSuper ? 6 : g.settings.overs * BALLS_PER_OVER,
    maxWkts: isSuper ? 1 : batPlayers.length,
    target,
    order: batPlayers.length === 1 ? [...batPlayers] : null,
    bi: 0,
    bowler: bowlPlayers.length === 1 ? bowlPlayers[0] : null,
    lastBowler: null,
    over: [],
    lastOver: [],
    log: [],
    batting: {},
    bowling: {},
  };
  g.innings.push(inn);
  g.cur = g.innings.length - 1;
  const label = isSuper ? 'Super over' : inningsLabel(g, g.cur);
  const chase = target ? ` Target ${target}.` : '';
  say(g, `${label}: ${teamName(g, bat)} to bat.${chase}`, `${label}: ${teamName(g, bat)} batting.${chase}`);
  return maybeBegin(g, now);
}

export function inningsLabel(g, idx) {
  const inn = g.innings[idx];
  if (!inn) return '';
  if (inn.super) return 'Super over';
  const mainIdx = g.innings.slice(0, idx + 1).filter((i) => !i.super).length;
  return ['1st innings', '2nd innings', '3rd innings', '4th innings'][mainIdx - 1];
}

function maybeBegin(g, now) {
  const inn = g.innings[g.cur];
  if (inn.order && inn.bowler) {
    g.phase = 'ball';
    nextBall(g, now, 800);
  } else {
    g.phase = 'setup';
  }
  return g;
}

function nextBall(g, now, delay = REVEAL_MS) {
  g.ballSeq += 1;
  g.deadline = now + delay + SHOT_MS;
}

export function setOrder(g, order, now) {
  const inn = g.innings[g.cur];
  if (g.phase !== 'setup' || !inn || inn.order) return null;
  const team = g.teams[inn.bat].players;
  const valid = order.filter((u) => team.includes(u));
  const need = inn.super ? 1 : team.length;
  if (new Set(valid).size !== need) return null;
  inn.order = valid;
  return maybeBegin(g, now);
}

export function setBowler(g, uid, now) {
  const inn = g.innings[g.cur];
  if (g.phase !== 'setup' || !inn || inn.bowler) return null;
  const team = g.teams[inn.bowl].players;
  if (!team.includes(uid)) return null;
  if (team.length > 1 && uid === inn.lastBowler) return null; // no back-to-back overs
  inn.bowler = uid;
  if (inn.balls > 0) say(g, `${nm(g, uid)} comes into the attack.`);
  return maybeBegin(g, now);
}

// --------------------------------------------------------------------------- ball

/**
 * Resolve one ball. Returns null if the ball was already resolved (seq mismatch).
 * auto = { bat: bool, bowl: bool } marks picks made by the shot clock.
 */
export function applyBall(g, seq, batPick, bowlPick, auto = {}, now) {
  if (g.phase !== 'ball' || g.ballSeq !== seq) return null;
  const inn = g.innings[g.cur];
  const batter = inn.order[inn.bi];
  const bowler = inn.bowler;
  const b = (inn.batting[batter] = { ...emptyBat(), ...(inn.batting[batter] || {}) });
  const w = (inn.bowling[bowler] = { ...emptyBowl(), ...(inn.bowling[bowler] || {}) });
  const out = batPick === bowlPick;
  const runs = out ? 0 : batPick;
  const before = b.runs;

  inn.balls += 1;
  b.balls += 1;
  w.balls += 1;

  if (out) {
    inn.wkts += 1;
    b.out = true;
    b.outBy = bowler;
    b.dots += 1;
    w.wkts += 1;
    w.dots += 1;
    if (b.balls === 1) {
      b.firstBallOut = true;
      if (auto.bat) b.autoOut = true;
    }
    inn.bi += 1;
  } else {
    inn.runs += runs;
    b.runs += runs;
    w.runs += runs;
    if (runs === 4) b.fours += 1;
    if (runs === 6) b.sixes += 1;
  }

  inn.over.push(out ? 'W' : runs);
  inn.log.push({ bt: batter, bw: bowler, b: batPick, w: bowlPick, r: runs, o: out ? 1 : 0, a: (auto.bat ? 1 : 0) | (auto.bowl ? 2 : 0) });

  const milestone = !out ? [100, 50, 30].find((m) => before < m && b.runs >= m) || null : null;
  const events = {
    out,
    runs,
    batter,
    bowler,
    milestone,
    duck: out && b.runs === 0,
    golden: out && b.firstBallOut && !b.autoOut,
  };

  g.lastBall = {
    seq,
    inn: g.cur,
    bat: batPick,
    bowl: bowlPick,
    runs,
    out,
    batter,
    bowler,
    at: now,
    autoBat: !!auto.bat,
    autoBowl: !!auto.bowl,
    duck: events.duck,
    golden: events.golden,
    milestone,
  };

  say(
    g,
    ballLine({ seed: seq + batPick * 7 + bowlPick, bat: nm(g, batter), bowl: nm(g, bowler), runs, out, batterRuns: b.runs, firstBall: events.golden, auto: out && auto.bat }),
  );
  if (milestone) say(g, milestoneLine(nm(g, batter), milestone));
  sysForBall({ ...events, bat: nm(g, batter) }).forEach((m) => (g._sys = g._sys || []).push(m));

  // over complete
  const overDone = inn.balls % BALLS_PER_OVER === 0;
  if (overDone) {
    const overRuns = inn.over.reduce((s, x) => s + (x === 'W' ? 0 : x), 0);
    if (overRuns === 0) w.maidens += 1;
    inn.lastOver = inn.over;
    inn.over = [];
    inn.lastBowler = bowler;
    say(g, `End of over ${inn.balls / 6}: ${teamName(g, inn.bat)} ${inn.runs}/${inn.wkts}.`);
  }

  const chased = inn.target != null && inn.runs >= inn.target;
  if (chased || inn.wkts >= inn.maxWkts || inn.balls >= inn.maxBalls) {
    endInnings(g, now);
  } else if (overDone && g.teams[inn.bowl].players.length > 1) {
    inn.bowler = null;
    g.phase = 'setup';
  } else {
    nextBall(g, now);
  }
  return { g, events };
}

// --------------------------------------------------------------------------- innings end & result

function endInnings(g, now) {
  const inn = g.innings[g.cur];
  const label = inn.super ? 'Super over' : inningsLabel(g, g.cur);
  say(g, `${label} over: ${teamName(g, inn.bat)} ${inn.runs}/${inn.wkts} (${oversStr(inn.balls)}).`, `${teamName(g, inn.bat)} finish on ${inn.runs}/${inn.wkts}`);

  const main = g.innings.filter((i) => !i.super);
  const fmt = Number(g.settings.innings) || 2;
  const wktsLeft = (i) => i.maxWkts - i.wkts;
  const ballsLeft = (i) => i.maxBalls - i.balls;
  const byWkts = (i) => `won by ${wktsLeft(i)} wicket${wktsLeft(i) === 1 ? '' : 's'}${ballsLeft(i) ? ` with ${ballsLeft(i)} ball${ballsLeft(i) === 1 ? '' : 's'} left` : ''}`;
  const byRuns = (n) => `won by ${n} run${n === 1 ? '' : 's'}`;

  if (inn.super) {
    const supers = g.innings.filter((i) => i.super);
    if (supers.length % 2 === 1) return startInnings(g, inn.bowl, { now, isSuper: true, target: inn.runs + 1 });
    const first = supers[supers.length - 2];
    if (inn.runs >= inn.target) return finish(g, inn.bat, 'won the super over', now);
    if (inn.runs < inn.target - 1) return finish(g, first.bat, 'won the super over', now);
    if (g.superRound < 3) {
      g.superRound += 1;
      say(g, 'Super over tied. Another one.', '⚖️ Super over tied, going again');
      return startInnings(g, inn.bat, { now, isSuper: true });
    }
    return finish(g, null, 'tied after super overs', now);
  }

  if (fmt === 2) {
    if (main.length === 1) return startInnings(g, inn.bowl, { now, target: inn.runs + 1 });
    const first = main[0];
    if (inn.runs >= inn.target) return finish(g, inn.bat, byWkts(inn), now);
    if (inn.runs === inn.target - 1) {
      g.superRound = 1;
      say(g, 'Scores are level. We are going to a SUPER OVER.', '⚖️ Scores level, super over time');
      return startInnings(g, inn.bat, { now, isSuper: true });
    }
    return finish(g, first.bat, byRuns(first.runs - inn.runs), now);
  }

  // 4 innings (Test style): X bats 1st & 3rd, Y bats 2nd & 4th
  const X = main[0].bat;
  const Y = other(X);
  if (main.length === 1) return startInnings(g, Y, { now });
  if (main.length === 2) return startInnings(g, X, { now });
  const xTotal = main[0].runs + (main[2]?.runs || 0);
  if (main.length === 3) {
    const y1 = main[1].runs;
    if (xTotal < y1) return finish(g, Y, `won by an innings and ${y1 - xTotal} run${y1 - xTotal === 1 ? '' : 's'}`, now);
    return startInnings(g, Y, { now, target: xTotal - y1 + 1 });
  }
  const yTotal = main[1].runs + main[3].runs;
  if (yTotal > xTotal) return finish(g, Y, byWkts(inn), now);
  if (yTotal === xTotal) return finish(g, null, 'tied', now);
  return finish(g, X, byRuns(xTotal - yTotal), now);
}

export function computeMvp(g) {
  const pts = {};
  [...g.teams.A.players, ...g.teams.B.players].forEach((u) => (pts[u] = 0));
  const add = (u, p) => (pts[u] = (pts[u] || 0) + p);
  g.innings.forEach((inn) => {
    Object.entries(inn.batting).forEach(([u, b]) => {
      add(u, b.runs);
      if (b.runs >= 100) add(u, 50);
      else if (b.runs >= 50) add(u, 25);
      else if (b.runs >= 30) add(u, 10);
    });
    Object.entries(inn.bowling).forEach(([u, w]) => {
      add(u, w.wkts * 20 + w.maidens * 10);
      if (w.wkts >= 5) add(u, 30);
      else if (w.wkts >= 3) add(u, 15);
    });
  });
  return pts;
}

const topOf = (obj, prefer) =>
  Object.entries(obj || {}).sort((a, b) => b[1] - a[1] || (prefer?.includes(b[0]) ? 1 : 0) - (prefer?.includes(a[0]) ? 1 : 0))[0]?.[0] || null;

function finish(g, winner, how, now) {
  g.phase = 'matchOver';
  g.endedAt = now;
  g.mvp = computeMvp(g);
  g.mom = topOf(g.mvp, winner ? g.teams[winner].players : null);
  g.result = {
    winner,
    text: winner ? `${teamName(g, winner)} ${how}` : how === 'tied' ? 'Match tied' : 'Match tied after super overs',
  };
  if (winner) g.series[winner] += 1;
  else g.series.T += 1;
  g.series.results.push(winner || 'T');
  Object.entries(g.mvp).forEach(([u, p]) => (g.series.mvp[u] = (g.series.mvp[u] || 0) + p));

  const len = Number(g.settings.series) || 1;
  const need = Math.floor(len / 2) + 1;
  g.seriesDone = g.matchNo >= len || g.series.A >= need || g.series.B >= need;
  if (g.seriesDone) {
    g.seriesWinner = g.series.A > g.series.B ? 'A' : g.series.B > g.series.A ? 'B' : null;
    g.mos = len > 1 ? topOf(g.series.mvp, g.seriesWinner ? g.teams[g.seriesWinner].players : null) : null;
  }
  say(g, `${g.result.text}. Player of the match: ${nm(g, g.mom)}.`, `🏆 ${g.result.text}`);
  if (g.seriesDone && len > 1) {
    const s = seriesLine(g);
    say(g, s, `🏆 ${s}`);
  }
  return g;
}

// --------------------------------------------------------------------------- read helpers for the UI

export function seriesLine(g) {
  const { A, B } = g.series;
  const a = teamName(g, 'A');
  const b = teamName(g, 'B');
  const len = Number(g.settings.series) || 1;
  if (len === 1) return '';
  if (g.seriesDone) {
    if (A === B) return `Series drawn ${A}-${B}`;
    return `${A > B ? a : b} win the series ${Math.max(A, B)}-${Math.min(A, B)}`;
  }
  if (A === B) return `Series level ${A}-${B}`;
  return `${A > B ? a : b} lead ${Math.max(A, B)}-${Math.min(A, B)}`;
}

/** Current batter/bowler and chase/lead state for the scoreboard */
export function situation(g) {
  const inn = g.innings[g.cur];
  if (!inn) return null;
  const batter = inn.order ? inn.order[inn.bi] : null;
  const out = { inn, batter, bowler: inn.bowler, label: inningsLabel(g, g.cur), equation: null, lead: null };
  if (inn.target != null) {
    const need = Math.max(0, inn.target - inn.runs);
    const balls = inn.maxBalls - inn.balls;
    out.equation = { need, balls, rrr: balls > 0 ? (need / balls) * 6 : null, target: inn.target };
  }
  const fmt = Number(g.settings.innings) || 2;
  if (fmt === 4 && !inn.super) {
    const main = g.innings.filter((i) => !i.super);
    const idx = main.indexOf(inn);
    if (idx === 1) out.lead = { team: inn.bat, diff: inn.runs - main[0].runs };
    if (idx === 2) out.lead = { team: inn.bat, diff: main[0].runs + inn.runs - main[1].runs };
  }
  return out;
}

/** Score as it should be shown while the reveal countdown hides the latest ball */
export function displayInnings(g, now) {
  const inn = g.innings[g.cur];
  const lb = g.lastBall;
  if (!inn || !lb || lb.inn !== g.cur || now - lb.at >= COUNTDOWN_MS) return { inn, hidden: false };
  const over = inn.over.length ? inn.over.slice(0, -1) : inn.lastOver.slice(0, -1);
  return {
    hidden: true,
    inn: {
      ...inn,
      runs: inn.runs - lb.runs,
      wkts: inn.wkts - (lb.out ? 1 : 0),
      balls: inn.balls - 1,
      over,
    },
  };
}

export function myTeam(g, uid) {
  if (g.teams.A.players.includes(uid)) return 'A';
  if (g.teams.B.players.includes(uid)) return 'B';
  return null;
}

// --------------------------------------------------------------------------- bots

export const isBot = (g, uid) => !!uid && (g.bots || []).includes(uid);

/** Picks a bot makes, from what it has seen of its opponent so far (never from the current hidden pick) */
export function botPick(g, role, opponent) {
  const r = () => 1 + Math.floor(Math.random() * 6);
  const seen = [];
  g.innings.forEach((inn) =>
    inn.log.forEach((x) => {
      if (role === 'bowl' && x.bt === opponent) seen.push(x.b);
      if (role === 'bat' && x.bw === opponent) seen.push(x.w);
    }),
  );
  const recent = seen.slice(-12);
  const counts = [0, 0, 0, 0, 0, 0, 0];
  recent.forEach((n) => (counts[n] += 1));
  const fav = recent.length >= 3 ? counts.indexOf(Math.max(...counts.slice(1))) : null;
  if (role === 'bowl') {
    // bowler hunts the batter's favourite number some of the time
    return fav && Math.random() < 0.3 ? fav : r();
  }
  // batter swings big more often, and dodges the bowler's favourite number
  for (let i = 0; i < 4; i++) {
    const n = Math.random() < 0.35 ? (Math.random() < 0.6 ? 6 : 4) : r();
    if (n !== fav || Math.random() < 0.2) return n;
  }
  return r();
}

/**
 * Captain decisions for bot-captained teams (toss, batting order, bowler).
 * Returns the updated game, or null when nothing is waiting on a bot.
 */
export function botActions(g, now) {
  const capIsBot = (t) => isBot(g, g.teams[t].captain);
  if (g.phase === 'toss') {
    if (!g.toss.call) return capIsBot('A') ? tossCall(g, Math.random() < 0.5 ? 'odd' : 'even') : null;
    for (const t of ['A', 'B']) {
      if (!g.toss.throws[t] && !g.toss.winner && capIsBot(t)) return tossThrow(g, t, 1 + Math.floor(Math.random() * 6));
    }
    if (g.toss.winner && !g.toss.decision && capIsBot(g.toss.winner)) return tossDecide(g, Math.random() < 0.5 ? 'bat' : 'bowl', now);
    return null;
  }
  if (g.phase === 'setup') {
    const inn = g.innings[g.cur];
    if (!inn.order && capIsBot(inn.bat)) {
      const team = [...g.teams[inn.bat].players];
      return setOrder(g, inn.super ? [team[Math.floor(Math.random() * team.length)]] : team, now);
    }
    if (!inn.bowler && capIsBot(inn.bowl)) {
      const team = g.teams[inn.bowl].players;
      const options = team.length > 1 ? team.filter((u) => u !== inn.lastBowler) : team;
      return setBowler(g, options[Math.floor(Math.random() * options.length)], now);
    }
  }
  return null;
}
