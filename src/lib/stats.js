// Career statistics, per-match stat lines, achievement badges.

export const BADGES = {
  sixerKing: { name: 'Sixer King', desc: 'Three sixes in a row' },
  hatTrick: { name: 'Hat-Trick Hero', desc: 'Three wickets in three balls' },
  duckHunter: { name: 'Duck Hunter', desc: 'Dismissed a batter first ball' },
  clutch: { name: 'Clutch Finisher', desc: 'Hit the winning runs in a chase' },
  fifty: { name: 'Half-Century', desc: '50 runs in an innings' },
  century: { name: 'Centurion', desc: '100 runs in an innings' },
  fiveFor: { name: 'Five-For', desc: 'Five wickets in an innings' },
  maidenMaker: { name: 'Maiden Maker', desc: 'Bowled a maiden over' },
  goldenClub: { name: 'Golden Duck Club', desc: 'Out first ball. It happens' },
  firstWin: { name: 'First Win', desc: 'Won a match' },
};

export function emptyStats() {
  return {
    matches: 0, wins: 0, losses: 0, ties: 0, mom: 0, mos: 0,
    // batting
    bInn: 0, runs: 0, notOuts: 0, outs: 0, balls: 0, hs: 0, hsNotOut: false,
    fours: 0, sixes: 0, thirties: 0, fifties: 0, hundreds: 0,
    ducks: 0, goldenDucks: 0, diamondDucks: 0, dotsFaced: 0,
    // bowling
    wInn: 0, wBalls: 0, wRuns: 0, wkts: 0, maidens: 0, threeW: 0, fiveW: 0, wDots: 0,
    bestW: 0, bestR: null,
    // derived (stored for leaderboards)
    winPct: null, avg: null, sr: null, econ: null, bowlAvg: null, bowlSr: null,
  };
}

export function derive(s) {
  s.winPct = s.matches ? (s.wins / s.matches) * 100 : null;
  s.avg = s.outs ? s.runs / s.outs : null;
  s.sr = s.balls ? (s.runs / s.balls) * 100 : null;
  s.econ = s.wBalls ? s.wRuns / (s.wBalls / 6) : null;
  s.bowlAvg = s.wkts ? s.wRuns / s.wkts : null;
  s.bowlSr = s.wkts ? s.wBalls / s.wkts : null;
  return s;
}

/** Add one match's stat line to a career record */
export function applyLine(prev, line) {
  const s = { ...emptyStats(), ...(prev || {}) };
  s.matches += 1;
  if (line.res === 'W') s.wins += 1;
  else if (line.res === 'L') s.losses += 1;
  else s.ties += 1;
  if (line.mom) s.mom += 1;
  if (line.mos) s.mos += 1;

  (line.bat || []).forEach((b) => {
    if (!b.balls && !b.out) return; // never came to the crease
    s.bInn += 1;
    s.runs += b.runs;
    s.balls += b.balls;
    s.fours += b.fours;
    s.sixes += b.sixes;
    s.dotsFaced += b.dots;
    if (b.out) s.outs += 1;
    else s.notOuts += 1;
    if (b.runs > s.hs || (b.runs === s.hs && !b.out)) {
      s.hs = b.runs;
      s.hsNotOut = !b.out;
    }
    if (b.runs >= 100) s.hundreds += 1;
    else if (b.runs >= 50) s.fifties += 1;
    else if (b.runs >= 30) s.thirties += 1;
    if (b.out && b.runs === 0) {
      s.ducks += 1;
      if (b.autoOut) s.diamondDucks += 1; // out without playing a shot (shot-clock forfeit)
      else if (b.firstBallOut) s.goldenDucks += 1;
    }
  });

  (line.bowl || []).forEach((w) => {
    if (!w.balls) return;
    s.wInn += 1;
    s.wBalls += w.balls;
    s.wRuns += w.runs;
    s.wkts += w.wkts;
    s.maidens += w.maidens;
    s.wDots += w.dots;
    if (w.wkts >= 5) s.fiveW += 1;
    else if (w.wkts >= 3) s.threeW += 1;
    if (s.bestR === null || w.wkts > s.bestW || (w.wkts === s.bestW && w.runs < s.bestR)) {
      s.bestW = w.wkts;
      s.bestR = w.runs;
    }
  });
  return derive(s);
}

/** Achievements earned in this match, keyed by uid */
export function detectBadges(g) {
  const out = {};
  const give = (u, id) => {
    if (!u) return;
    out[u] = out[u] || [];
    if (!out[u].includes(id)) out[u].push(id);
  };
  g.innings.forEach((inn) => {
    const sixStreak = {};
    const wktStreak = {};
    const faced = {};
    inn.log.forEach((x) => {
      faced[x.bt] = (faced[x.bt] || 0) + 1;
      sixStreak[x.bt] = x.r === 6 ? (sixStreak[x.bt] || 0) + 1 : 0;
      if (sixStreak[x.bt] >= 3) give(x.bt, 'sixerKing');
      wktStreak[x.bw] = x.o ? (wktStreak[x.bw] || 0) + 1 : 0;
      if (wktStreak[x.bw] >= 3) give(x.bw, 'hatTrick');
      if (x.o && faced[x.bt] === 1) {
        give(x.bw, 'duckHunter');
        if (!(x.a & 1)) give(x.bt, 'goldenClub');
      }
    });
    Object.entries(inn.batting).forEach(([u, b]) => {
      if (b.runs >= 100) give(u, 'century');
      if (b.runs >= 50) give(u, 'fifty');
    });
    Object.entries(inn.bowling).forEach(([u, w]) => {
      if (w.wkts >= 5) give(u, 'fiveFor');
      if (w.maidens > 0) give(u, 'maidenMaker');
    });
  });
  const last = g.innings[g.innings.length - 1];
  const winner = g.result?.winner;
  if (winner && last && last.target != null && last.runs >= last.target && last.bat === winner) {
    give(last.log[last.log.length - 1]?.bt, 'clutch');
  }
  if (winner) g.teams[winner].players.forEach((u) => give(u, 'firstWin'));
  return out;
}

/** Head-to-head totals from this match (main innings), keyed batter → bowler */
export function h2hFromGame(g) {
  const pairs = {};
  g.innings
    .filter((i) => !i.super)
    .forEach((inn) =>
      inn.log.forEach((x) => {
        pairs[x.bt] = pairs[x.bt] || {};
        const p = (pairs[x.bt][x.bw] = pairs[x.bt][x.bw] || { runs: 0, balls: 0, outs: 0 });
        p.runs += x.r;
        p.balls += 1;
        p.outs += x.o;
      }),
    );
  return pairs;
}

/** Per-player stat line for this match. Super overs are excluded from careers. */
export function matchLines(g) {
  const lines = {};
  const badges = detectBadges(g);
  const h2h = h2hFromGame(g);
  ['A', 'B'].forEach((team) =>
    g.teams[team].players.forEach((u) => {
      lines[u] = {
        team,
        res: !g.result?.winner ? 'T' : g.result.winner === team ? 'W' : 'L',
        mom: g.mom === u,
        mos: !!g.seriesDone && g.mos === u,
        mvp: g.mvp?.[u] || 0,
        bat: [],
        bowl: [],
        badges: badges[u] || [],
        h2h: h2h[u] || {},
      };
    }),
  );
  g.innings
    .filter((i) => !i.super)
    .forEach((inn) => {
      Object.entries(inn.batting).forEach(([u, b]) => lines[u]?.bat.push({ ...b }));
      Object.entries(inn.bowling).forEach(([u, w]) => lines[u]?.bowl.push({ ...w }));
    });
  return lines;
}

// --------------------------------------------------------------------------- formatting

export const fmt1 = (n) => (n === null || n === undefined || Number.isNaN(n) ? '–' : n.toFixed(2));
export const fmtInt = (n) => (n === null || n === undefined ? '–' : n.toLocaleString('en-IN'));
export const overs = (balls) => `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
export const best = (s) => (s?.bestR === null || s?.bestR === undefined ? '–' : `${s.bestW}/${s.bestR}`);
export const hs = (s) => (s?.bInn ? `${s.hs}${s.hsNotOut ? '*' : ''}` : '–');
export const sr = (runs, balls) => (balls ? ((runs / balls) * 100).toFixed(1) : '–');
export const econ = (runs, balls) => (balls ? (runs / (balls / 6)).toFixed(2) : '–');
