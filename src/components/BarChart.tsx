import { useState } from 'react';

export interface Bar {
  t: number;
  y: number;
}

interface BarChartProps {
  bars: Bar[];
  color?: string;
  height?: number;
  formatY?: (n: number) => string;
  formatX?: (t: number) => string;
  ariaLabel: string;
}

const W = 360;
const M = { l: 38, r: 14, t: 14, b: 22 };

/** Dependency-free bar chart (per-session magnitude). 2px surface gap between
 *  bars, 4px rounded tops anchored to the zero baseline, per-bar hover tooltip. */
export function BarChart({
  bars,
  color = 'var(--viz-aqua)',
  height = 160,
  formatY = (n) => `${n}`,
  formatX = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  ariaLabel,
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (bars.length === 0) {
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
  const ymax = Math.max(...bars.map((b) => b.y), 1);
  const gap = 2;
  const slot = plotW / bars.length;
  const barW = Math.max(2, slot - gap);
  const baseline = M.t + plotH;
  const sy = (y: number) => baseline - (y / ymax) * plotH;

  const ticks = 3;
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => (ymax * i) / ticks);

  const hoverBar = hover !== null ? bars[hover] : null;
  const hoverX = hover !== null ? M.l + hover * slot + barW / 2 : 0;

  return (
    <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${W} ${height}`} width="100%" style={{ height }}>
      {gridY.map((gy, i) => (
        <g key={i}>
          <line x1={M.l} x2={W - M.r} y1={sy(gy)} y2={sy(gy)} stroke="var(--viz-grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={M.l - 6} y={sy(gy) + 3} textAnchor="end" fontSize={9} fill="var(--viz-axis-text)">
            {formatY(gy)}
          </text>
        </g>
      ))}

      {bars.map((b, i) => {
        const x = M.l + i * slot + gap / 2;
        const y = sy(b.y);
        const h = Math.max(0, baseline - y);
        return (
          <rect
            key={i}
            data-testid="bar"
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={Math.min(4, barW / 2)}
            fill={color}
            opacity={hover === null || hover === i ? 1 : 0.55}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          />
        );
      })}

      <text x={M.l} y={height - 6} textAnchor="start" fontSize={9} fill="var(--viz-axis-text)">
        {formatX(bars[0]!.t)}
      </text>
      <text x={W - M.r} y={height - 6} textAnchor="end" fontSize={9} fill="var(--viz-axis-text)">
        {formatX(bars[bars.length - 1]!.t)}
      </text>

      {hoverBar && (
        <text
          x={Math.min(Math.max(hoverX, M.l + 20), W - M.r - 20)}
          y={M.t + 9}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="var(--viz-axis-text)"
          pointerEvents="none"
        >
          {formatY(hoverBar.y)} · {formatX(hoverBar.t)}
        </text>
      )}
    </svg>
  );
}
