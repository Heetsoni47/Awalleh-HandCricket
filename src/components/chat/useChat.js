import { useEffect, useRef, useState } from 'react';
import { limitToLast, onValue, query } from 'firebase/database';
import { roomRef } from '../../lib/rooms.js';

const toList = (v) =>
  Object.entries(v || {})
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

/** Subscribes to All chat and my team's chat, tracks unread counts per tab */
export function useChat(code, team, visibleTab) {
  const [all, setAll] = useState([]);
  const [teamMsgs, setTeamMsgs] = useState([]);
  const [seen, setSeen] = useState({ all: Date.now(), team: Date.now() });
  const hasTeam = team === 'A' || team === 'B';

  useEffect(() => onValue(query(roomRef(code, 'chat/all'), limitToLast(120)), (s) => setAll(toList(s.val()))), [code]);
  useEffect(() => {
    if (!hasTeam) {
      setTeamMsgs([]);
      return;
    }
    return onValue(
      query(roomRef(code, `chat/${team}`), limitToLast(120)),
      (s) => setTeamMsgs(toList(s.val())),
      () => setTeamMsgs([]),
    );
  }, [code, team, hasTeam]);

  // mark the visible tab as read whenever new messages arrive there
  const lastAll = all[all.length - 1]?.timestamp || 0;
  const lastTeam = teamMsgs[teamMsgs.length - 1]?.timestamp || 0;
  useEffect(() => {
    if (visibleTab === 'all') setSeen((s) => ({ ...s, all: Math.max(Date.now(), lastAll) }));
    if (visibleTab === 'team') setSeen((s) => ({ ...s, team: Math.max(Date.now(), lastTeam) }));
  }, [visibleTab, lastAll, lastTeam]);

  const unread = {
    all: all.filter((m) => (m.timestamp || 0) > seen.all).length,
    team: teamMsgs.filter((m) => (m.timestamp || 0) > seen.team).length,
  };
  return { all, team: teamMsgs, unread, hasTeam };
}

/** Plays a callback for each new system message (used for sounds) */
export function useNewMessages(list, cb) {
  const lastId = useRef(null);
  useEffect(() => {
    const last = list[list.length - 1];
    if (!last) return;
    if (lastId.current && last.id !== lastId.current) cb(last);
    lastId.current = last.id;
  }, [list, cb]);
}
