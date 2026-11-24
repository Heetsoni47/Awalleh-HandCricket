// Drives one ball: hidden commit → reveal → resolve, plus the anti-AFK shot clock.
import { useCallback, useEffect, useRef, useState } from 'react';
import { onValue, remove, set } from 'firebase/database';
import { roomRef, gameTx } from '../lib/rooms.js';
import { applyBall, GRACE_MS } from '../lib/engine.js';
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

export function useBallEngine({ code, game, uid, isAuthority, now }) {
  const inn = game?.innings?.[game.cur];
  const seq = game?.ballSeq;
  const live = game?.phase === 'ball' && !!inn;
  const batter = live ? inn.order?.[inn.bi] : null;
  const bowler = live ? inn.bowler : null;
  const role = uid === batter ? 'bat' : uid === bowler ? 'bowl' : null;
  const key = `hc:${code}:${game?.startedAt}:${seq}`;

  const [ball, setBall] = useState({});
  const [myPick, setMyPick] = useState(() => store.get(key));
  const resolving = useRef(null);
  const forcing = useRef(null);
  const autoing = useRef(null);

  useEffect(() => setMyPick(store.get(key)), [key]);

  useEffect(() => {
    if (!live) {
      setBall({});
      return;
    }
    return onValue(roomRef(code, `ball/${seq}`), (s) => setBall(s.val() || {}));
  }, [code, seq, live]);

  const commits = ball.commit || {};
  const reveals = ball.reveal || {};

  // 1. lock in a hidden pick
  const pick = useCallback(
    async (n, auto = false) => {
      if (!role || !live || store.get(key)) return;
      const salt = newSalt();
      const entry = { pick: n, salt, auto };
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
    if (!role || !myPick || !batter || !bowler) return;
    if (commits[batter] && commits[bowler] && !reveals[uid]) {
      set(roomRef(code, `ball/${seq}/reveal/${uid}`), myPick).catch(() => {});
    }
  }, [role, myPick, commits, reveals, batter, bowler, uid, code, seq]);

  // 3. shot clock: auto-pick a random number for me if I stall
  useEffect(() => {
    if (role && live && !myPick && now > game.deadline && autoing.current !== key) {
      autoing.current = key;
      pick(randomPick(), true);
    }
  }, [role, live, myPick, now, game?.deadline, key, pick]);

  // 4. resolve when both reveals are in (batter, bowler and room authority race; the transaction picks one)
  useEffect(() => {
    if (!live || !(role || isAuthority)) return;
    const rb = reveals[batter];
    const rw = reveals[bowler];
    if (!rb || !rw || resolving.current === seq) return;
    resolving.current = seq;
    (async () => {
      const ok = async (r, who) => commits[who] && (await hashPick(r.pick, r.salt)) === commits[who];
      const [okB, okW] = await Promise.all([ok(rb, batter), ok(rw, bowler)]);
      const bp = okB ? rb.pick : randomPick();
      const wp = okW ? rw.pick : randomPick();
      await gameTx(code, (g, t) => applyBall(g, seq, bp, wp, { bat: !!rb.auto || !okB, bowl: !!rw.auto || !okW }, t)?.g || null);
      remove(roomRef(code, `ball/${seq - 2}`)).catch(() => {});
    })();
  }, [live, role, isAuthority, reveals, commits, batter, bowler, seq, code]);

  // 5. authority forces a ball when a player is offline past the shot clock
  useEffect(() => {
    if (!isAuthority || !live || forcing.current === seq) return;
    if (now < game.deadline + GRACE_MS) return;
    if (reveals[batter] && reveals[bowler]) return;
    forcing.current = seq;
    const pickFor = (who) => (reveals[who] && commits[who] ? reveals[who].pick : randomPick());
    gameTx(code, (g, t) => applyBall(g, seq, pickFor(batter), pickFor(bowler), { bat: !reveals[batter], bowl: !reveals[bowler] }, t)?.g || null);
  }, [isAuthority, live, now, game?.deadline, reveals, commits, batter, bowler, seq, code]);

  return {
    role,
    batter,
    bowler,
    myPick,
    pick,
    locked: { bat: !!commits[batter], bowl: !!commits[bowler] },
  };
}
