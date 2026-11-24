// A tiny hand: one bar per raised finger, heights like real fingers
const H = [9, 12, 13, 12, 10, 7];

export default function FingerPips({ n, className = '', active }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-[13px] ${className}`} aria-hidden="true">
      {H.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-colors duration-150 ${i < n ? (active ? 'bg-current' : 'bg-fg2') : 'bg-fg3/25'}`}
          style={{ height: h }}
        />
      ))}
    </span>
  );
}
