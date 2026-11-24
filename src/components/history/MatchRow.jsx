import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const when = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function MatchRow({ m, me }) {
  const main = (m.innings || []).filter((i) => !i.super);
  const score = (t) =>
    main
      .filter((i) => i.bat === t)
      .map((i) => `${i.runs}/${i.wkts}`)
      .join(' & ') || '–';
  const myTeam = m.lines?.[me]?.team;
  const res = m.lines?.[me]?.res;
  const resTone = res === 'W' ? 'text-pos' : res === 'L' ? 'text-neg' : 'text-fg3';
  return (
    <Link to={`/match/${m.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-raised/50 transition-colors duration-150">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className={myTeam === 'A' ? 'text-fg' : 'text-fg2'}>{m.teams.A.name}</span>
          <span className="font-mono tabular-nums text-fg">{score('A')}</span>
          <span className="text-fg3">vs</span>
          <span className={myTeam === 'B' ? 'text-fg' : 'text-fg2'}>{m.teams.B.name}</span>
          <span className="font-mono tabular-nums text-fg">{score('B')}</span>
        </div>
        <div className="mt-1 text-[13px] text-fg3 truncate">
          {m.result?.text} · {m.settings.teamSize}v{m.settings.teamSize}, {m.settings.overs} overs
          {Number(m.settings.innings) === 4 ? ', test' : ''}
        </div>
      </div>
      {res && <span className={`font-mono text-[13px] ${resTone}`}>{res}</span>}
      <span className="hidden sm:block font-mono text-xs text-fg3 w-14 text-right">{when(m.endedAt)}</span>
      <ChevronRight size={16} strokeWidth={1.5} className="text-fg3" />
    </Link>
  );
}
