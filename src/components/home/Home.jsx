import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { createRoom } from '../../lib/rooms.js';
import { listMatchesFor } from '../../lib/matchSave.js';
import { fmt1, fmtInt, hs, best } from '../../lib/stats.js';
import { Button, Card, Input, SectionLabel, Stat, Empty } from '../ui.jsx';
import MatchRow from '../history/MatchRow.jsx';

export default function Home() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(null);
  const last = localStorage.getItem('hc:lastRoom');
  const s = profile?.stats || {};

  useEffect(() => {
    listMatchesFor(user.uid, 8).then(setRecent).catch(() => setRecent([]));
  }, [user.uid]);

  async function create() {
    setBusy(true);
    setError('');
    try {
      const c = await createRoom(user);
      nav(`/room/${c}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  function join(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return setError('Room codes have 6 characters');
    nav(`/room/${c}`);
  }

  return (
    <div className="animate-rise">
      <h1 className="text-[28px] md:text-[32px] leading-[1.15] font-medium">Play</h1>
      <p className="mt-1 text-sm text-fg2">Host a room for 1v1 up to 5v5, or join one with a code</p>

      {last && (
        <Card className="mt-6 p-4 flex items-center gap-4">
          <RotateCcw size={18} strokeWidth={1.5} className="text-fg3 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm">You were in room <span className="font-mono text-fg">{last}</span></div>
            <div className="text-[13px] text-fg3">Rejoin to pick up from the current ball</div>
          </div>
          <Button size="sm" variant="primary" className="ml-auto" onClick={() => nav(`/room/${last}`)}>
            Rejoin
          </Button>
        </Card>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col">
          <h2 className="text-[15px] font-medium">Host a room</h2>
          <p className="mt-1 text-[13px] text-fg2">You pick team size, overs, innings format and series length</p>
          <Button variant="accent" size="lg" className="mt-6 self-start" onClick={create} disabled={busy}>
            <Plus size={18} strokeWidth={1.5} />
            New room
          </Button>
        </Card>
        <Card as="form" onSubmit={join} className="p-6 flex flex-col">
          <h2 className="text-[15px] font-medium">Join a room</h2>
          <p className="mt-1 text-[13px] text-fg2">Full rooms let you in as a spectator</p>
          <div className="mt-6 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="Room code"
              className="h-12 font-mono text-[16px] tracking-[0.2em] uppercase"
              autoCapitalize="characters"
            />
            <Button type="submit" size="lg" variant="secondary" aria-label="Join">
              <ArrowRight size={18} strokeWidth={1.5} />
            </Button>
          </div>
        </Card>
      </div>
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}

      <section className="mt-12">
        <SectionLabel right={<Link to={`/profile/${user.uid}`} className="text-[13px] text-fg3 hover:text-fg transition-colors">Full profile</Link>}>
          Your career
        </SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5"><Stat label="Matches" value={fmtInt(s.matches || 0)} sub={`${s.wins || 0} won, ${s.losses || 0} lost`} /></Card>
          <Card className="p-5"><Stat label="Runs" value={fmtInt(s.runs || 0)} sub={`Best ${hs(s)}, average ${fmt1(s.avg)}`} /></Card>
          <Card className="p-5"><Stat label="Wickets" value={fmtInt(s.wkts || 0)} sub={`Best ${best(s)}`} /></Card>
          <Card className="p-5"><Stat label="Player of the match" value={fmtInt(s.mom || 0)} sub={`${s.mos || 0} player of the series`} /></Card>
        </div>
      </section>

      <section className="mt-12">
        <SectionLabel>Recent matches</SectionLabel>
        <Card className="divide-y divide-line">
          {recent === null ? (
            <div className="h-24" />
          ) : recent.length === 0 ? (
            <Empty title="No matches yet">Finished matches show up here with full scorecards</Empty>
          ) : (
            recent.map((m) => <MatchRow key={m.id} m={m} me={user.uid} />)
          )}
        </Card>
      </section>
    </div>
  );
}
