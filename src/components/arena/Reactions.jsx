import { useEffect, useRef, useState } from 'react';
import { limitToLast, onChildAdded, query } from 'firebase/database';
import { roomRef, sendReaction } from '../../lib/rooms.js';
import { serverNow } from '../../lib/time.js';

const EMOJI = ['🔥', '💀', '🏏', '😂', '🦆', '👏'];

/** Floating emoji reactions over the pitch */
export function ReactionLayer({ code }) {
  const [items, setItems] = useState([]);
  const since = useRef(serverNow());
  useEffect(
    () =>
      onChildAdded(query(roomRef(code, 'reactions'), limitToLast(20)), (s) => {
        const r = s.val();
        if (!r || (r.at || 0) < since.current - 1000) return;
        const id = s.key;
        const x = 10 + Math.random() * 80;
        setItems((list) => [...list.slice(-24), { id, x, ...r }]);
        setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 2500);
      }),
    [code],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((r) => (
        <div key={r.id} className="absolute bottom-6 flex flex-col items-center animate-float" style={{ left: `${r.x}%` }}>
          <span className="text-[32px] leading-none">{r.emoji}</span>
          <span className="mt-1 text-[11px] text-fg3">{r.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ReactionBar({ code, uid, name }) {
  const last = useRef(0);
  const send = (emoji) => {
    if (Date.now() - last.current < 600) return; // gentle rate limit
    last.current = Date.now();
    sendReaction(code, { uid, name, emoji }).catch(() => {});
  };
  return (
    <div className="flex items-center gap-1">
      {EMOJI.map((e) => (
        <button
          key={e}
          onClick={() => send(e)}
          className="w-10 h-10 rounded-lg grid place-items-center text-[20px] hover:bg-raised transition-[background-color,transform] duration-150 active:scale-[0.94]"
          aria-label={`React ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
