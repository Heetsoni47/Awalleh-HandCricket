import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SendHorizontal, X } from 'lucide-react';
import { postChat } from '../../lib/rooms.js';
import { cx } from '../ui.jsx';

const TAUNTS = ['Easy wicket', 'Bowler scared', 'Golden duck incoming', 'Shot', 'Too good', 'Not today'];
const time = (t) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');
const nameTone = { teamA: 'text-teamA', teamB: 'text-teamB', spec: 'text-fg2' };

function Message({ m, mine }) {
  if (m.system) {
    return <div className="px-4 py-1.5 text-[13px] text-fg3 leading-5">{m.text}</div>;
  }
  return (
    <div className="px-4 py-1.5 group">
      <div className="flex items-baseline gap-2">
        <Link to={`/profile/${m.uid}`} className={cx('text-[13px] font-medium hover:underline', nameTone[m.teamColor] || 'text-fg2')}>
          {mine ? 'You' : m.senderName}
        </Link>
        <span className="font-mono text-[11px] text-fg3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">{time(m.timestamp)}</span>
      </div>
      <p className="text-sm text-fg leading-5 break-words">{m.text}</p>
    </div>
  );
}

export default function ChatPanel({ code, uid, name, team, chat, tab, setTab, onClose, className }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const msgs = tab === 'team' ? chat.team : chat.all;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, tab]);

  async function send(t) {
    const body = (t ?? text).trim();
    if (!body) return;
    setText('');
    await postChat(code, { uid, name, team, channel: tab, text: body }).catch(() => {});
  }

  const tabs = [{ id: 'all', label: 'All chat' }, ...(chat.hasTeam ? [{ id: 'team', label: 'Team chat' }] : [])];

  return (
    <div className={cx('flex flex-col min-h-0 bg-card', className)}>
      <div className="flex items-center gap-1 px-3 h-12 border-b border-line shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'h-8 px-3 rounded-md text-[13px] inline-flex items-center gap-2 transition-[background-color,color] duration-150 ease-out',
              tab === t.id ? 'bg-raised text-fg' : 'text-fg2 hover:text-fg',
            )}
          >
            {t.label}
            {chat.unread[t.id] > 0 && tab !== t.id && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-ink font-mono text-[11px] leading-[18px] text-center">
                {chat.unread[t.id] > 99 ? '99' : chat.unread[t.id]}
              </span>
            )}
          </button>
        ))}
        {onClose && (
          <button onClick={onClose} className="ml-auto h-8 w-8 grid place-items-center rounded-md text-fg2 hover:text-fg hover:bg-raised" aria-label="Close chat">
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto py-3">
        {msgs.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-fg3">{tab === 'team' ? 'Only your team sees this' : 'Say something to the room'}</p>
        ) : (
          msgs.map((m) => <Message key={m.id} m={m} mine={m.uid === uid} />)
        )}
      </div>
      <div className="px-3 pt-2 border-t border-line shrink-0 safe-bottom">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {TAUNTS.map((t) => (
            <button
              key={t}
              onClick={() => send(t)}
              className="h-7 px-2.5 rounded-md border border-line text-xs text-fg2 hover:text-fg hover:bg-raised whitespace-nowrap transition-[background-color,color] duration-150"
            >
              {t}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tab === 'team' ? 'Message your team' : 'Message everyone'}
            maxLength={400}
            className="flex-1 h-10 rounded-lg bg-raised border border-line px-3 text-sm placeholder:text-fg3 focus:outline-none focus:border-line2"
          />
          <button type="submit" className="h-10 w-10 grid place-items-center rounded-lg bg-raised border border-line text-fg2 hover:text-fg" aria-label="Send">
            <SendHorizontal size={18} strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
