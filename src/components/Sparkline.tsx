// A tiny inline e1RM trend line (DESIGN.md). Quiet chalk-dim, emphasized endpoint,
// no axes or accent — it's a glance, not a chart. Returns null below two points so
// a lift with one week shows a number alone, not a misleading dot.

export function Sparkline({ points, width = 60, height = 20 }: { points?: number[]; width?: number; height?: number }) {
  if (!points || points.length < 2) return null;
  const pad = 2.5;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - 2 * pad);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lastX = x(points.length - 1);
  const lastY = y(points[points.length - 1]!);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke="var(--chalk-dim)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="1.7" fill="var(--chalk)" />
    </svg>
  );
}
