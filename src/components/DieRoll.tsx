const DOT_PATTERNS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DieDot({ row, col }: { row: number; col: number }) {
  const top = row === 0 ? 'top-1' : row === 1 ? 'top-1/2 -translate-y-1/2' : 'bottom-1';
  const left = col === 0 ? 'left-1' : col === 1 ? 'left-1/2 -translate-x-1/2' : 'right-1';

  return (
    <span
      className={`absolute w-2.5 h-2.5 rounded-full bg-slate-800 ${top} ${left}`}
    />
  );
}

export default function DieRoll({ value }: { value: number }) {
  const dots = DOT_PATTERNS[value] ?? [];

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="relative w-14 h-14 rounded-xl bg-white shadow-lg shadow-black/30 border border-slate-300">
        {dots.map(([row, col], i) => (
          <DieDot key={i} row={row} col={col} />
        ))}
      </div>
      <span className="text-xs font-bold text-slate-300">{value}</span>
    </div>
  );
}
