import { Link } from 'react-router-dom';
import { Tile } from './ui.jsx';
import { APP_NAME } from '../appInfo.js';

export default function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0">
      <Tile tone="accent" className="w-7 h-7 text-[15px] font-medium">6</Tile>
      <span className="text-[16px] font-medium tracking-[-0.01em]">{APP_NAME}</span>
    </Link>
  );
}
