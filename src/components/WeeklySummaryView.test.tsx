// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklySummaryView } from './WeeklySummaryView';
import { buildWeeklySummary, type WeeklySummaryInput } from '../lib/weeklySummary';
import { landmarksFor } from '../lib/volumeLandmarks';

const input: WeeklySummaryInput = {
  weekStart: '2026-07-13', weekEnd: '2026-07-19', generatedAt: '2026-07-20T02:00:00Z', unit: 'lb',
  sessions: 3, hardSets: 40, tonnageLb: 60000, daysTrained: 3, daysPlanned: 4,
  plannedDeload: false, hasFourWeekHistory: true,
  progression: [{ exercise: 'Bench Press', currentE1RMLb: 225, deltaLastWeekLb: 0, delta4wLb: 0, move: 'held', reason: '', weeksFlat: 4 }],
  volume: [{ muscle: 'pectorals', hardSets: 14, landmarks: landmarksFor('pectorals') }],
  balance: [{ label: 'Push : pull', ratio: '2.8 : 1' }],
  fatigue: { acwr: 1.1, acwrTrend: 'rising', avgRpe: 8, avgReadiness: null, blockLabel: null },
  prs: [{ exercise: 'Bench Press', e1rmLb: 240 }],
};

describe('WeeklySummaryView (DESIGN.md)', () => {
  it('renders the readout with the flat lift stated and the PR present', () => {
    render(<WeeklySummaryView summary={buildWeeklySummary(input)} />);
    expect(screen.getByText(/unchanged for 4 weeks/)).toBeInTheDocument();
    expect(screen.getByText(/New best — Bench Press 240 lb e1RM\./)).toBeInTheDocument();
  });

  it('uses copper ONLY on the PR section', () => {
    const { container } = render(<WeeklySummaryView summary={buildWeeklySummary(input)} />);
    const copper = container.querySelectorAll('.text-copper');
    // Every copper node lives under the "Personal records" section, nowhere else.
    expect(copper.length).toBeGreaterThan(0);
    copper.forEach((el) => expect(el.closest('section')?.textContent).toMatch(/Personal records/));
  });

  it('omits the PR section entirely when there were none (silent, not "no PRs")', () => {
    render(<WeeklySummaryView summary={buildWeeklySummary({ ...input, prs: [] })} />);
    expect(screen.queryByText(/Personal records/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no pr/i)).not.toBeInTheDocument();
  });
});
