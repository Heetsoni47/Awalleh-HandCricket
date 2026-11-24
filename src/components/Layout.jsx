import { NavLink, Outlet } from 'react-router-dom';
import { Home, Trophy, History, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Brand from './Brand.jsx';
import SoundToggle from './SoundToggle.jsx';
import MusicToggle from './MusicToggle.jsx';
import { Button, cx } from './ui.jsx';

export default function Layout() {
  const { user, signOut } = useAuth();
  const links = [
    { to: '/', label: 'Play', icon: Home, end: true },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/history', label: 'Matches', icon: History },
    { to: `/profile/${user.uid}`, label: 'Profile', icon: User },
  ];
  const item = ({ isActive }) =>
    cx(
      'h-9 px-3 rounded-lg inline-flex items-center gap-2 text-sm transition-[background-color,color] duration-150 ease-out',
      isActive ? 'bg-raised text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg2 hover:text-fg',
    );
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
        <div className="max-w-[1200px] mx-auto h-14 px-4 md:px-8 flex items-center gap-6">
          <Brand />
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={item}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden sm:inline text-[13px] text-fg3 mr-2">{user.username}</span>
            <MusicToggle />
            <SoundToggle />
            <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={signOut}>
              <LogOut size={18} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <Outlet />
      </main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-deep/95 backdrop-blur border-t border-line safe-bottom pt-2">
        <div className="grid grid-cols-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => cx('flex flex-col items-center gap-1 py-1 text-[11px]', isActive ? 'text-fg' : 'text-fg3')}
            >
              <l.icon size={18} strokeWidth={1.5} />
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
