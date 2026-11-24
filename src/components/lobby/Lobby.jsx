import { useEffect, useState } from 'react';
import { Check, Copy, Crown, Eye, Shuffle, ArrowRightLeft, Play, Bot, Trash2 } from 'lucide-react';
import { useRoom } from '../../context/RoomContext.jsx';
import { addBot, autoBalance, canStart, removeBot, setCaptain, setTeam, setTeamName, startMatch, updateSettings } from '../../lib/rooms.js';
import { Button, Card, Input, Seg, TeamDot, Tile, cx } from '../ui.jsx';
import PlayerChip from '../players/PlayerChip.jsx';

function InviteBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${window.location.pathname}#/room/${code}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copy this invite link', link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
      <div>
        <div className="text-[13px] text-fg3 mb-2">Room code</div>
        <div className="flex gap-1.5">
          {code.split('').map((c, i) => (
            <Tile key={i} className="w-11 h-14 text-[28px] font-medium rounded-lg">
              {c}
            </Tile>
          ))}
        </div>
      </div>
      <Button variant="secondary" onClick={copy} className="self-start sm:self-auto">
        {copied ? <Check size={16} strokeWidth={1.5} className="text-pos" /> : <Copy size={16} strokeWidth={1.5} />}
        {copied ? 'Link copied' : 'Copy invite link'}
      </Button>
    </div>
  );
}

function TeamName({ code, team, value, editable }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (!editable) return <span className="text-[15px] font-medium truncate">{value}</span>;
  return (
    <Input
      value={v}
      maxLength={24}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && setTeamName(code, team, v.trim())}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label="Team name"
      className="h-9 -ml-3 text-[15px] font-medium bg-transparent border-transparent hover:border-line focus:bg-raised"
    />
  );
}

export default function Lobby() {
  const { room, code, uid, isHost, me } = useRoom();
  const { settings, players, teams, meta } = room;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const list = Object.entries(players).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  const of = (t) => list.filter(([, p]) => p.team === t);
  const startBlock = canStart(room);

  const run = (fn) => async () => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
  };

  function hostActions(u, p) {
    if (!isHost) return [];
    const a = [];
    if (p.bot) a.push({ label: 'Remove bot', icon: Trash2, onClick: run(() => removeBot(code, room, u)) });
    if (p.team !== 'spec' && teams[p.team]?.captain !== u) a.push({ label: 'Make captain', icon: Crown, onClick: run(() => setCaptain(code, p.team, u)) });
    ['A', 'B'].forEach((t) => p.team !== t && a.push({ label: `Move to ${teams[t]?.name || `Team ${t}`}`, icon: ArrowRightLeft, onClick: run(() => setTeam(code, room, u, t)) }));
    if (p.team !== 'spec') a.push({ label: 'Move to spectators', icon: Eye, onClick: run(() => setTeam(code, room, u, 'spec')) });
    return a;
  }

  async function start() {
    setBusy(true);
    setError('');
    try {
      await startMatch(code, room);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (v) => run(() => updateSettings(code, { [k]: v }))();

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-6 md:py-10 animate-rise">
      <InviteBlock code={code} />

      <div className="mt-10 grid md:grid-cols-2 gap-4">
        {['A', 'B'].map((t) => {
          const members = of(t);
          const mine = me?.team === t;
          const full = members.length >= settings.teamSize;
          const captain = teams[t]?.captain;
          return (
            <Card key={t} className={cx('p-4', mine && 'border-line2')}>
              <div className="flex items-center gap-3 px-1">
                <TeamDot team={t} />
                <div className="flex-1 min-w-0">
                  <TeamName code={code} team={t} value={teams[t]?.name || `Team ${t}`} editable={captain === uid || isHost} />
                </div>
                <span className="font-mono tabular-nums text-[13px] text-fg3">
                  {members.length}/{settings.teamSize}
                </span>
              </div>
              <div className="mt-3 space-y-0.5 min-h-[52px]">
                {members.map(([u, p]) => (
                  <PlayerChip
                    key={u}
                    uid={u}
                    name={p.name}
                    me={uid}
                    captain={captain === u}
                    host={meta.hostUid === u}
                    offline={p.online === false}
                    bot={p.bot}
                    actions={hostActions(u, p)}
                  />
                ))}
                {members.length === 0 && <p className="px-3 py-3 text-[13px] text-fg3">Nobody yet</p>}
              </div>
              <div className="mt-3 flex gap-2">
                {!mine && (
                  <Button size="sm" className="flex-1" disabled={full} onClick={run(() => setTeam(code, room, uid, t))}>
                    {full ? 'Team full' : `Join ${teams[t]?.name || `Team ${t}`}`}
                  </Button>
                )}
                {isHost && !full && (
                  <Button size="sm" variant="ghost" className={mine ? 'flex-1 justify-start' : ''} onClick={run(() => addBot(code, room, t))}>
                    <Bot size={16} strokeWidth={1.5} /> Add bot
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] text-fg2">Spectators</span>
          {me?.team !== 'spec' && (
            <Button size="sm" variant="ghost" onClick={run(() => setTeam(code, room, uid, 'spec'))}>
              <Eye size={16} strokeWidth={1.5} /> Watch instead
            </Button>
          )}
        </div>
        <div className="mt-2 grid sm:grid-cols-2 gap-0.5">
          {of('spec').map(([u, p]) => (
            <PlayerChip key={u} uid={u} name={p.name} me={uid} host={meta.hostUid === u} offline={p.online === false} actions={hostActions(u, p)} dense />
          ))}
          {of('spec').length === 0 && <p className="px-3 py-2 text-[13px] text-fg3">Extra friends can watch and chat here</p>}
        </div>
      </Card>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] text-fg2">Match settings</h2>
          {!isHost && <span className="text-xs text-fg3">Only the host can change these</span>}
        </div>
        <Card className="divide-y divide-line">
          <SettingRow label="Team size" hint="Players per side">
            <Seg value={settings.teamSize} onChange={set('teamSize')} disabled={!isHost} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}v${n}` }))} />
          </SettingRow>
          <SettingRow label="Overs per innings">
            <Seg value={settings.overs} onChange={set('overs')} disabled={!isHost} options={[2, 3, 4, 5].map((n) => ({ value: n, label: `${n}` }))} />
          </SettingRow>
          <SettingRow label="Format" hint={Number(settings.innings) === 4 ? 'Each team bats twice, lead and trail tracked' : 'Each team bats once, super over on a tie'}>
            <Seg
              value={Number(settings.innings)}
              onChange={set('innings')}
              disabled={!isHost}
              options={[
                { value: 2, label: 'Limited overs' },
                { value: 4, label: 'Test, 4 innings' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Series">
            <Seg
              value={settings.series}
              onChange={set('series')}
              disabled={!isHost}
              options={[
                { value: 1, label: 'Single' },
                { value: 3, label: 'Best of 3' },
                { value: 5, label: 'Best of 5' },
                { value: 7, label: 'Best of 7' },
              ]}
            />
          </SettingRow>
        </Card>
      </section>

      {error && <p className="mt-4 text-[13px] text-neg">{error}</p>}

      {isHost ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="accent" size="lg" onClick={start} disabled={!!startBlock || busy}>
            <Play size={18} strokeWidth={1.5} />
            Start match
          </Button>
          <Button size="lg" onClick={run(() => autoBalance(code, room))}>
            <Shuffle size={18} strokeWidth={1.5} />
            Auto-balance teams
          </Button>
          {startBlock && <span className="text-[13px] text-fg3">{startBlock}</span>}
        </div>
      ) : (
        <p className="mt-6 text-[13px] text-fg3">Waiting for {players[meta.hostUid]?.name || 'the host'} to start the match</p>
      )}
    </div>
  );
}

function SettingRow({ label, hint, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
      <div className="md:w-64 shrink-0">
        <div className="text-sm text-fg">{label}</div>
        {hint && <div className="text-xs text-fg3 mt-0.5">{hint}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
