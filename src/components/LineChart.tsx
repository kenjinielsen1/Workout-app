import { useId, useState } from 'react';

export interface LinePoint {
  t: number; // x value (epoch ms)
  y: number;
  pr?: boolean; // highlight as a personal record
}

interface LineChartProps {
  points: LinePoint[];
  color?: string;
  height?: number;
  formatY?: (n: number) => string;
  formatX?: (t: number) => string;
  ariaLabel: string;
}

const W = 360;
const M = { l: 38, r: 14, t: 14, b: 22 };

/** Dependency-free responsive line chart with gridlines, PR markers, a direct
 *  label on the latest point, and a hover crosshair+tooltip. Single series, so
 *  the section title carries identity — no legend. */
export function LineChart({
  points,
  color = 'var(--viz-blue)',
  height = 180,
  formatY = (n) => `${n}`,
  formatX = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  ariaLabel,
}: LineChartProps) {
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-xl bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-800"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const plotW = W - M.l - M.r;
  const plotH = height - M.t - M.b;
  const ts = points.map((p) => p.t);
  const ys = points.map((p) => p.y);
  let xmin = Math.min(...ts);
  let xmax = Math.max(...ts);
  if (xmin === xmax) {
    xmin -= 1;
    xmax += 1;
  }
  let ymin = Math.min(...ys);
  let ymax = Math.max(...ys);
  const pad = (ymax - ymin || Math.abs(ymax) || 1) * 0.1;
  ymin -= pad;
  ymax += pad;

  const sx = (t: number) => M.l + ((t - xmin) / (xmax - xmin)) * plotW;
  const sy = (y: number) => M.t + (1 - (y - ymin) / (ymax - ymin)) * plotH;

  const coords = points.map((p) => ({ ...p, cx: sx(p.t), cy: sy(p.y) }));
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(' ');
  const baseline = sy(ymin);
  const area = `${line} L${coords[coords.length - 1]!.cx.toFixed(1)},${baseline} L${coords[0]!.cx.toFixed(1)},${baseline} Z`;

  const ticks = 4;
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => ymin + ((ymax - ymin) * i) / ticks);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let dist = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.cx - px);
      if (d < dist) {
        dist = d;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  const last = coords[coords.length - 1]!;
  const hoverPt = hover !== null ? coords[hover] : null;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      style={{ height, touchAction: 'none' }}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={M.l} y={M.t} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      {gridY.map((gy, i) => (
        <g key={i}>
          <line
            x1={M.l}
            x2={W - M.r}
            y1={sy(gy)}
            y2={sy(gy)}
            stroke="var(--viz-grid)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text x={M.l - 6} y={sy(gy) + 3} textAnchor="end" fontSize={9} fill="var(--viz-axis-text)">
            {formatY(gy)}
          </text>
        </g>
      ))}

      <path d={area} fill={color} opacity={0.12} clipPath={`url(#${clipId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />

      {/* PRs are highlighted with a distinct green dot, not a label on every point
          (a near-linear progression would stamp "PR" on nearly every session). The
          section's legend chip names the color; the PR list carries the detail. */}
      {coords.map((c, i) =>
        c.pr ? (
          <circle
            key={i}
            data-testid="pr-dot"
            cx={c.cx}
            cy={c.cy}
            r={4}
            fill="var(--viz-good)"
            stroke="var(--viz-surface)"
            strokeWidth={1.5}
          />
        ) : (
          <circle key={i} cx={c.cx} cy={c.cy} r={2.5} fill={color} data-testid="line-dot" />
        ),
      )}

      {/* direct label on the latest point */}
      <text x={last.cx} y={last.cy - 8} textAnchor="end" fontSize={10} fontWeight={700} fill="var(--viz-axis-text)">
        {formatY(last.y)}
      </text>

      {/* x-axis end labels */}
      <text x={M.l} y={height - 6} textAnchor="start" fontSize={9} fill="var(--viz-axis-text)">
        {formatX(coords[0]!.t)}
      </text>
      <text x={W - M.r} y={height - 6} textAnchor="end" fontSize={9} fill="var(--viz-axis-text)">
        {formatX(last.t)}
      </text>

      {hoverPt && (
        <g pointerEvents="none">
          <line x1={hoverPt.cx} x2={hoverPt.cx} y1={M.t} y2={M.t + plotH} stroke="var(--viz-axis-text)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <circle cx={hoverPt.cx} cy={hoverPt.cy} r={4} fill={color} stroke="var(--viz-surface)" strokeWidth={1.5} />
          <text
            x={Math.min(Math.max(hoverPt.cx, M.l + 20), W - M.r - 20)}
            y={M.t + 9}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="var(--viz-axis-text)"
          >
            {formatY(hoverPt.y)} · {formatX(hoverPt.t)}
          </text>
        </g>
      )}
    </svg>
  );
}
