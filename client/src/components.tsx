export function Bar({ solved, total }: { solved: number; total: number }) {
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="bar" role="img" aria-label={`${solved} of ${total}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
