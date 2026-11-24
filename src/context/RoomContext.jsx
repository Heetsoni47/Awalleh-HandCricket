import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onValue } from 'firebase/database';
import { roomRef } from '../lib/rooms.js';
import { normalize } from '../lib/engine.js';

const RoomCtx = createContext(null);
export const useRoom = () => useContext(RoomCtx);

const PARTS = ['meta', 'settings', 'players', 'teams', 'game'];

export function RoomProvider({ code, user, children }) {
  const [parts, setParts] = useState({});
  const [loaded, setLoaded] = useState({});

  useEffect(() => {
    setParts({});
    setLoaded({});
    const offs = PARTS.map((p) =>
      onValue(
        roomRef(code, p),
        (s) => {
          setParts((prev) => ({ ...prev, [p]: s.val() }));
          setLoaded((prev) => ({ ...prev, [p]: true }));
        },
        () => setLoaded((prev) => ({ ...prev, [p]: true })),
      ),
    );
    return () => offs.forEach((o) => o());
  }, [code]);

  const value = useMemo(() => {
    const ready = PARTS.every((p) => loaded[p]);
    const room = {
      meta: parts.meta,
      settings: parts.settings || {},
      players: parts.players || {},
      teams: parts.teams || {},
      game: parts.game ? normalize(structuredClone(parts.game)) : null,
    };
    const me = room.players[user.uid] || null;
    const isHost = room.meta?.hostUid === user.uid;
    const online = Object.entries(room.players)
      .filter(([, p]) => p.online !== false && !p.bot)
      .sort((a, b) => (a[1].team === 'spec') - (b[1].team === 'spec') || (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
    const hostOnline = room.players[room.meta?.hostUid]?.online !== false && room.players[room.meta?.hostUid];
    const authorityUid = hostOnline ? room.meta.hostUid : online[0]?.[0] || null;
    return {
      code,
      ready,
      exists: !!room.meta,
      room,
      game: room.game,
      me,
      uid: user.uid,
      myName: user.username,
      isHost,
      isAuthority: authorityUid === user.uid,
      authorityUid,
    };
  }, [parts, loaded, code, user.uid, user.username]);

  return <RoomCtx.Provider value={value}>{children}</RoomCtx.Provider>;
}
