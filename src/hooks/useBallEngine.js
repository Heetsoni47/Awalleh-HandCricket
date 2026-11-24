// Drives one ball: hidden commit → reveal → resolve, plus the anti-AFK shot clock.
//
// Every piece of ball data is tagged with the ball it belongs to (ballKey).
// When the game moves to the next ball, data from the previous ball is ignored
// until the new ball's own data arrives, so one pick can never be scored twice.
import { useCallback, useEffect, useRef, useState } from 'react';
import { onValue, remove, set } from 'firebase/database';
import { roomRef, gameTx } from '../lib/rooms.js';
import { applyBall, botPick, isBot, GRACE_MS, REVEAL_MS } from '../lib/engine.js';
import { hashPick, newSalt, randomPick } from '../lib/crypto.js';

const store = {
  get: (k) => {
    try {
      return JSON.parse(sessionStorage.getItem(k));
    } catch {
      return null;
    }
  },
  set: (k, v) => sessionStorage.setItem(k, JSON.stringify(v)),
};

const EMPTY = {};

export function useBallEngine({ code, game, uid, isAuthority, now }) {
  const inn = game?.innings?.[game.cur];
  const seq = game?.ballSeq;
  const live = game?.phase === 'ball' && !!inn;
  const batter = live ? inn.order?.[inn.bi] : null;
  const bowler = live ? inn.bowler : null;
  const role = uid === batter ? 'bat' : uid === bowler ? 'bowl' : null;
  const botBat = live && isBot(game, batter);
  const botBowl = live && isBot(game, bowler);
  const hasBot = botBat || botBowl;
  const ballKey = `${game?.startedAt}:${seq}`; // unique per ball, across matches too
  const key = `hc:${code}:${uid}:${ballKey}`;

  const [ballState, setBallState] = useState({ ballKey: null, data: EMPTY });
  const [myPick, setMyPick] = useState(() => store.get(key));
  const resolving = useRef(null);
  const forcing = useRef(null);
  const autoing = useRef(null);
  const revealing = useRef(null);

  useEffect(() => setMyPick(store.get(key)), [key]);

  useEffect(() => {
    if (!live) return undefined;
    return onValue(roomRef(code, `ball/${seq}`), (s) => setBallState({ ballKey, data: s.val() || EMPTY }));
  }, [code, seq, live, ballKey]);

  // Only trust data that belongs to the ball being played right now
  const ball = live && ballState.ballKey === ballKey ? ballState.data : EMPTY;
  const commits = ball.commit || EMPTY;
  const reveals = ball.reveal || EMPTY;
  const revealFor = (who) => {
    const r = reveals[who];
    return r && r.seq === seq ? r : null; // reveal must name this ball
  };
  const committed = (who) => isBot(game, who) || !!commits[who]; // bots are always ready

  // 1. lock in a hidden pick
  const pick = useCallback(
    async (n, auto = false) => {
      if (!role || !live || store.get(key)) return;
      const salt = newSalt();
      const entry = { pick: n, salt, auto, seq };
      store.set(key, entry);
      setMyPick(entry);
      try {
        await set(roomRef(code, `ball/${seq}/commit/${uid}`), await hashPick(n, salt));
      } catch (e) {
        console.warn('commit', e);
      }
    },
    [role, live, key, code, seq, uid],
  );

  // 2. reveal once both have locked in
  useEffect(() => {
    if (!role || !myPick || myPick.seq !== seq || !batter || !bowler) return;
    if (committed(batter) && committed(bowler) && !reveals[uid] && revealing.current !== key) {
      revealing.current = key;
      set(roomRef(code, `ball/${seq}/reveal/${uid}`), { pick: myPick.pick, salt: myPick.salt, auto: !!myPick.auto, seq }).catch(() => {
        revealing.current = null;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, myPick, commits, reveals, batter, bowler, uid, code, seq, key]);

  // 3. shot clock: auto-pick a random number for me if I stall
  useEffect(() => {
    if (role && live && !myPick && now > game.deadline && autoing.current !== key) {
      autoing.current = key;
      pick(randomPick(), true);
    }
  }, [role, live, myPick, now, game?.deadline, key, pick]);

  // 4. resolve when both reveals are in (batter, bowler and room authority race; the transaction applies it once).
  //    With a bot involved only the room authority resolves, and it makes the bot's pick right here.
  useEffect(() => {
    if (!live || !(isAuthority || (role && !hasBot))) return;
    if (hasBot && ballState.ballKey !== ballKey) return;
    if (botBat && botBowl) {
      // bot vs bot: give everyone time to watch the last ball first
      const opensAt = Math.max((game.lastBall?.at || 0) + REVEAL_MS + 700, game.deadline - 10000 + 900);
      if (now < opensAt) return;
    }
    const rb = botBat ? { pick: botPick(game, 'bat', bowler), bot: true } : revealFor(batter);
    const rw = botBowl ? { pick: botPick(game, 'bowl', batter), bot: true } : revealFor(bowler);
    if (!rb || !rw || resolving.current === key) return;
    resolving.current = key;
    (async () => {
      const ok = async (r, who) => r.bot || (commits[who] && (await hashPick(r.pick, r.salt)) === commits[who]);
      const [okB, okW] = await Promise.all([ok(rb, batter), ok(rw, bowler)]);
      const bp = okB ? rb.pick : randomPick();
      const wp = okW ? rw.pick : randomPick();
      await gameTx(code, (g, t) => applyBall(g, seq, bp, wp, { bat: !!rb.auto || !okB, bowl: !!rw.auto || !okW }, t)?.g || null);
      remove(roomRef(code, `ball/${seq - 2}`)).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, role, isAuthority, reveals, commits, batter, bowler, seq, code, key, ballKey, ballState.ballKey, hasBot, botBat, botBowl, botBat && botBowl ? now : 0]);

  // 5. authority forces a ball when a player is offline past the shot clock
  useEffect(() => {
    if (!isAuthority || !live || forcing.current === key) return;
    if (ballState.ballKey !== ballKey) return; // wait for this ball's data first
    if (now < game.deadline + GRACE_MS) return;
    if (botBat && botBowl) return; // handled by the resolver
    const ready = (who) => isBot(game, who) || revealFor(who);
    if (ready(batter) && ready(bowler)) return;
    forcing.current = key;
    const pickFor = (who, r, opp) =>
      isBot(game, who) ? botPick(game, r, opp) : revealFor(who) && commits[who] ? revealFor(who).pick : randomPick();
    gameTx(code, (g, t) =>
      applyBall(g, seq, pickFor(batter, 'bat', bowler), pickFor(bowler, 'bowl', batter), { bat: !ready(batter), bowl: !ready(bowler) }, t)?.g || null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthority, live, now, game?.deadline, reveals, commits, batter, bowler, seq, code, key, ballKey, ballState.ballKey]);

  return {
    role,
    batter,
    bowler,
    myPick: myPick && myPick.seq === seq ? myPick : null,
    pick,
    locked: { bat: committed(batter), bowl: committed(bowler) },
  };
}
