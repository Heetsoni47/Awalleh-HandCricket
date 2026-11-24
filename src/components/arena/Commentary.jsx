/** Ball-by-ball feed. Lines from the ball still being revealed stay hidden until SHOW. */
export default function Commentary({ items, hideKey }) {
  const list = hideKey != null ? items.filter((c) => c.k !== hideKey) : items;
  return (
    <ul>
      {list.slice(0, 10).map((c, i) => (
        <li key={`${c.k}-${c.t}`} className={`py-2.5 border-b border-line last:border-0 text-sm leading-5 ${i === 0 ? 'text-fg' : 'text-fg2'}`}>
          {c.t}
        </li>
      ))}
    </ul>
  );
}
