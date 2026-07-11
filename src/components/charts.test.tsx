// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LineChart, type LinePoint } from './LineChart';
import { BarChart, type Bar } from './BarChart';

const W = 360;

function nums(container: HTMLElement, selector: string, attr: string): number[] {
  return [...container.querySelectorAll(selector)].map((el) => Number(el.getAttribute(attr)));
}

describe('LineChart geometry', () => {
  const points: LinePoint[] = [
    { t: 1, y: 100 },
    { t: 2, y: 130, pr: true },
    { t: 3, y: 120 },
    { t: 4, y: 145, pr: true },
  ];

  it('keeps every marker inside the viewBox and x strictly increasing', () => {
    const { container } = render(<LineChart points={points} ariaLabel="test" height={180} />);
    const circles = [...container.querySelectorAll('circle')];
    const cx = circles.map((c) => Number(c.getAttribute('cx')));
    const cy = circles.map((c) => Number(c.getAttribute('cy')));
    expect(cx.every((x) => x >= 0 && x <= W)).toBe(true);
    expect(cy.every((y) => y >= 0 && y <= 180)).toBe(true);
    expect(cx.every((x) => !Number.isNaN(x))).toBe(true);
    // dots are emitted left-to-right in time order
    const dotCx = nums(container, '[data-testid="line-dot"]', 'cx');
    for (let i = 1; i < dotCx.length; i++) expect(dotCx[i]!).toBeGreaterThan(dotCx[i - 1]!);
  });

  it('produces a non-NaN path even when all y are equal (flat line)', () => {
    const { container } = render(
      <LineChart points={[{ t: 1, y: 90 }, { t: 2, y: 90 }]} ariaLabel="flat" />,
    );
    const d = container.querySelector('path')!.getAttribute('d')!;
    expect(d).not.toMatch(/NaN/);
  });

  it('handles a single point without crashing', () => {
    const { container } = render(<LineChart points={[{ t: 1, y: 100 }]} ariaLabel="one" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path')!.getAttribute('d')).not.toMatch(/NaN/);
  });

  it('renders an empty state with no points', () => {
    const { container, getByText } = render(<LineChart points={[]} ariaLabel="empty" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(getByText('No data yet')).toBeInTheDocument();
  });
});

describe('BarChart geometry', () => {
  const bars: Bar[] = [
    { t: 1, y: 500 },
    { t: 2, y: 800 },
    { t: 3, y: 300 },
  ];

  it('anchors bars to the baseline with non-negative heights and a surface gap', () => {
    const { container } = render(<BarChart bars={bars} ariaLabel="tonnage" height={160} />);
    const rects = [...container.querySelectorAll('[data-testid="bar"]')];
    expect(rects).toHaveLength(3);
    const ys = rects.map((r) => Number(r.getAttribute('y')));
    const hs = rects.map((r) => Number(r.getAttribute('height')));
    const ws = rects.map((r) => Number(r.getAttribute('width')));
    expect(hs.every((h) => h >= 0)).toBe(true);
    expect(ws.every((w) => w >= 2)).toBe(true);
    // tallest bar (800) has the greatest height
    expect(Math.max(...hs)).toBe(hs[1]);
    // bottoms all align to the same baseline
    const bottoms = ys.map((y, i) => y + hs[i]!);
    expect(new Set(bottoms.map((b) => b.toFixed(2))).size).toBe(1);
  });
});
