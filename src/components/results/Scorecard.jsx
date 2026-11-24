import { Link } from 'react-router-dom';
import { overs, sr, econ } from '../../lib/stats.js';
import { TeamDot, cx } from '../ui.jsx';

function label(innings, idx) {
  const inn = innings[idx];
  if (inn.super) return 'Super over';
  const n = innings.slice(0, idx + 1).filter((i) => !i.super).length;
  return ['1st innings', '2nd innings', '3rd innings', '4th innings'][n - 1];
}

const th = 'py-2 text-right font-normal text-fg3 text-xs';
const td = 'py-2.5 text-right font-mono tabular-nums text-[13px]';

export default function Scorecard({ innings, names, teams, link = true }) {
  const name = (u) => names?.[u] || 'Player';
  const P = ({ u }) =>
    link && !String(u).startsWith('bot_') ? (
      <Link to={`/profile/${u}`} className="hover:text-accent transition-colors duration-150">
        {name(u)}
      </Link>
    ) : (
      name(u)
    );
  return (
    <div className="space-y-6">
      {innings.map((inn, idx) => {
        const batters = (inn.order || Object.keys(inn.batting || {})).filter((u) => inn.batting?.[u]);
        const yetToBat = (inn.order || []).filter((u) => !inn.batting?.[u]);
        const bowlers = Object.keys(inn.bowling || {});
        return (
          <div key={idx} className="rounded-2xl border border-line bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 h-12 border-b border-line bg-deep/40">
              <TeamDot team={inn.bat} />
              <span className="text-sm font-medium">{teams[inn.bat]?.name}</span>
              <span className="text-[13px] text-fg3">{label(innings, idx)}</span>
              <span className="ml-auto font-mono tabular-nums text-sm">
                {inn.runs}/{inn.wkts} <span className="text-fg3">({overs(inn.balls)})</span>
              </span>
            </div>
            <div className="px-5 overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 text-left font-normal text-fg3 text-xs">Batter</th>
                    <th className={th}>R</th>
                    <th className={th}>B</th>
                    <th className={th}>4s</th>
                    <th className={th}>6s</th>
                    <th className={th}>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {batters.map((u) => {
                    const b = inn.batting[u];
                    return (
                      <tr key={u} className="border-b border-line last:border-0">
                        <td className="py-2.5 text-[13px]">
                          <P u={u} />
                          <span className="block text-xs text-fg3">{b.out ? `b ${name(b.outBy)}` : 'not out'}</span>
                        </td>
                        <td className={cx(td, 'text-fg')}>{b.runs}{!b.out ? '*' : ''}</td>
                        <td className={cx(td, 'text-fg2')}>{b.balls}</td>
                        <td className={cx(td, 'text-fg2')}>{b.fours}</td>
                        <td className={cx(td, 'text-fg2')}>{b.sixes}</td>
                        <td className={cx(td, 'text-fg2')}>{sr(b.runs, b.balls)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {yetToBat.length > 0 && (
                <p className="py-3 text-xs text-fg3">Did not bat: {yetToBat.map(name).join(', ')}</p>
              )}
              <table className="w-full min-w-[480px] mt-2 mb-2">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 text-left font-normal text-fg3 text-xs">Bowler</th>
                    <th className={th}>O</th>
                    <th className={th}>M</th>
                    <th className={th}>R</th>
                    <th className={th}>W</th>
                    <th className={th}>Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {bowlers.map((u) => {
                    const w = inn.bowling[u];
                    return (
                      <tr key={u} className="border-b border-line last:border-0">
                        <td className="py-2.5 text-[13px]"><P u={u} /></td>
                        <td className={cx(td, 'text-fg2')}>{overs(w.balls)}</td>
                        <td className={cx(td, 'text-fg2')}>{w.maidens}</td>
                        <td className={cx(td, 'text-fg2')}>{w.runs}</td>
                        <td className={cx(td, 'text-fg')}>{w.wkts}</td>
                        <td className={cx(td, 'text-fg2')}>{econ(w.runs, w.balls)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
