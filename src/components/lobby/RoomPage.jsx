import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { RoomProvider, useRoom } from '../../context/RoomContext.jsx';
import { joinRoom, leaveRoom } from '../../lib/rooms.js';
import { processGameForMe, saveMatchDoc } from '../../lib/matchSave.js';
import { useChat } from '../chat/useChat.js';
import ChatPanel from '../chat/ChatPanel.jsx';
import MusicToggle from '../MusicToggle.jsx';
import SoundToggle from '../SoundToggle.jsx';
import Brand from '../Brand.jsx';
import Lobby from './Lobby.jsx';
import Arena from '../arena/Arena.jsx';
import MatchOver from '../results/MatchOver.jsx';
import { Button, Spinner, Tile } from '../ui.jsx';

export default function RoomPage() {
  const { code: raw } = useParams();
  const code = raw.toUpperCase();
  const { user } = useAuth();
  const [status, setStatus] = useState('joining');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setStatus('joining');
    joinRoom(code, user)
      .then(() => alive && setStatus('ok'))
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setStatus('error');
        if (localStorage.getItem('hc:lastRoom') === code) localStorage.removeItem('hc:lastRoom');
      });
    return () => {
      alive = false;
    };
  }, [code, user]);

  if (status === 'joining')
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-sm text-fg2">
          <Spinner /> Joining room <span className="font-mono text-fg">{code}</span>
        </div>
      </div>
    );
  if (status === 'error') return <RoomError code={code} error={error} />;

  return (
    <RoomProvider code={code} user={user}>
      <RoomShell />
    </RoomProvider>
  );
}

function RoomError({ code, error }) {
  const nav = useNavigate();
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <p className="text-[18px]">Room <span className="font-mono">{code}</span> is not available</p>
        <p className="mt-1 text-sm text-fg3">{error}</p>
        <Button className="mt-6" onClick={() => nav('/')}>Back home</Button>
      </div>
    </div>
  );
}

function RoomShell() {
  return <RoomBody />;
}

function RoomBody() {
  const r = useRoom();
  const nav = useNavigate();
  const { room, game, me, uid, code } = r;
  const team = me?.team || 'spec';
  const [tab, setTab] = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const chat = useChat(code, team, wide || drawer ? tab : null);
  const handled = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const f = () => setWide(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  useEffect(() => {
    if (!chat.hasTeam && tab === 'team') setTab('all');
  }, [chat.hasTeam, tab]);

  // match finished: save the scorecard once (authority) and update my own career
  useEffect(() => {
    if (!game || game.phase !== 'matchOver') return;
    const key = `${code}-${game.startedAt}`;
    if (handled.current === key) return;
    handled.current = key;
    if (r.isAuthority) saveMatchDoc(code, game);
    processGameForMe(code, game, uid);
  }, [game, code, uid, r.isAuthority]);

  if (!r.ready) return <div className="min-h-screen grid place-items-center"><Spinner /></div>;
  if (!r.exists) return <RoomError code={code} error="The host closed it" />;

  const live = room.meta.status === 'live' && game;
  const totalUnread = chat.unread.all + chat.unread.team;
  const phaseLabel = !live ? 'Lobby' : game.phase === 'matchOver' ? 'Full time' : `Match ${game.matchNo}${Number(game.settings.series) > 1 ? ` of ${game.settings.series}` : ''}`;

  async function leave() {
    await leaveRoom(code, uid, room).catch(() => {});
    nav('/');
  }

  const chatProps = { code, uid, name: r.myName, team, chat, tab, setTab };

  return (
    <div className="h-[100dvh] flex flex-col">
      <header className="h-14 shrink-0 border-b border-line bg-bg flex items-center gap-3 px-3 md:px-6">
        <div className="hidden md:block"><Brand /></div>
        <div className="flex items-center gap-2 md:ml-4">
          <Tile className="h-7 px-2 text-[13px] tracking-[0.12em]">{code}</Tile>
          <span className="text-[13px] text-fg3 hidden sm:inline">{phaseLabel}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <MusicToggle />
          <SoundToggle />
          <Button size="icon" variant="ghost" className="lg:hidden relative" onClick={() => setDrawer(true)} aria-label="Open chat">
            <MessageSquare size={18} strokeWidth={1.5} />
            {totalUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-ink font-mono text-[10px] leading-4 text-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </Button>
          <Button size="icon" variant="ghost" onClick={leave} title="Leave room" aria-label="Leave room">
            <LogOut size={18} strokeWidth={1.5} />
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-w-0 overflow-y-auto">
          {!live ? <Lobby /> : game.phase === 'matchOver' ? <MatchOver /> : <Arena />}
        </main>
        {wide && <ChatPanel {...chatProps} className="w-[340px] border-l border-line shrink-0" />}
      </div>

      {!wide && drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/50" aria-label="Close chat" onClick={() => setDrawer(false)} />
          <ChatPanel {...chatProps} onClose={() => setDrawer(false)} className="absolute inset-x-0 bottom-0 h-[72dvh] rounded-t-[20px] border-t border-line2 animate-sheet" />
        </div>
      )}
    </div>
  );
}
