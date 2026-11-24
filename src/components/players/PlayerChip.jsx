import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, User, WifiOff } from 'lucide-react';
import { Avatar, cx } from '../ui.jsx';

/** Player row. Click opens a menu with the career link plus any host actions passed in. */
export default function PlayerChip({ uid, name, me, captain, host, offline, meta, actions = [], dense }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'w-full flex items-center gap-3 rounded-lg text-left transition-[background-color] duration-150 ease-out hover:bg-raised',
          dense ? 'h-10 px-2' : 'h-12 px-3',
        )}
      >
        <Avatar name={name} size={dense ? 26 : 30} offline={offline} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm text-fg truncate">
            {name}
            {uid === me && <span className="text-fg3">(you)</span>}
            {captain && <Crown size={14} strokeWidth={1.5} className="text-accent shrink-0" aria-label="Captain" />}
          </span>
          {meta && <span className="block text-xs text-fg3 truncate">{meta}</span>}
        </span>
        {offline && <WifiOff size={14} strokeWidth={1.5} className="text-fg3" aria-label="Offline" />}
        {host && <span className="font-mono text-[11px] text-fg3">host</span>}
      </button>
      {open && (
        <div className="absolute z-40 left-0 right-0 sm:right-auto sm:w-60 mt-1 rounded-xl bg-raised border border-line2 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.45)] animate-pop">
          <MenuItem as={Link} to={`/profile/${uid}`} icon={User}>
            Career stats
          </MenuItem>
          {actions.map((a) => (
            <MenuItem
              key={a.label}
              icon={a.icon}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
            >
              {a.label}
            </MenuItem>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ as: As = 'button', icon: Icon, children, ...p }) {
  return (
    <As className="w-full h-9 px-2 rounded-md flex items-center gap-2.5 text-[13px] text-fg2 hover:text-fg hover:bg-raised2 transition-colors duration-150" {...p}>
      {Icon && <Icon size={16} strokeWidth={1.5} />}
      {children}
    </As>
  );
}
