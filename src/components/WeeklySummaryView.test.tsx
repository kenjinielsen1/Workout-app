// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeeklySummaryView } from './WeeklySummaryView';
import { buildWeeklySummary, type WeeklySummaryInput } from '../lib/weeklySummary';
import { landmarksFor } from '../lib/volumeLandmarks';
import type { VolumeLookupContext } from './VolumeLookupDrawer';

const input: WeeklySummaryInput = {
  weekStart: '2026-07-13', weekEnd: '2026-07-19', generatedAt: '2026-07-20T02:00:00Z', unit: 'lb',
  sessions: 3, hardSets: 40, tonnageLb: 60000, daysTrained: 3, daysPlanned: 4,
  plannedDeload: false, hasFourWeekHistory: true,
  progression: [{ exercise: 'Bench Press', primaryMuscle: 'pectorals', currentE1RMLb: 225, deltaLastWeekLb: 0, delta4wLb: 0, move: 'held', reason: '', weeksFlat: 4 }],
  volume: [{ muscle: 'pectorals', hardSets: 14, landmarks: landmarksFor('pectorals') }],
  balance: [{ label: 'Push : pull', ratio: '2.8 : 1' }],
  fatigue: { acwr: 1.1, acwrTrend: 'rising', avgRpe: 8, avgReadiness: null, blockLabel: null },
  prs: [{ exercise: 'Bench Press', e1rmLb: 240 }],
  contributors: {},
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

// VOLUME_SUGGESTIONS.md: the summary must OFFER nothing — the lookup is something
// the user goes and gets, never something presented.
const lookup: VolumeLookupContext = {
  catalog: [
    { id: 'row', name: 'Barbell Row', primary_muscles: ['lats'], secondary_muscles: ['biceps'], equipment: 'barbell', movement_pattern: 'horizontal_pull', is_compound: true },
    { id: 'fly', name: 'Cable Fly', primary_muscles: ['pectorals'], secondary_muscles: [], equipment: 'cable', movement_pattern: 'horizontal_push', is_compound: false },
  ],
  accessibleEquipment: ['barbell', 'cable'],
  frozenPatterns: [],
  fatigueFlagged: false,
  plannedDeload: false,
};
const withContrib = buildWeeklySummary({ ...input, contributors: { pectorals: [{ id: 'bench', name: 'Bench Press', sets: 14 }] } });

describe('WeeklySummaryView — the summary offers nothing (VOLUME_SUGGESTIONS.md)', () => {
  it('renders no affordance, icon, hint, or copy indicating suggestions exist', () => {
    render(<WeeklySummaryView summary={withContrib} lookup={lookup} />);
    // No offer language anywhere in the readout.
    expect(screen.queryByText(/suggest|what could i add|need help|see options|tap a muscle|add a set|reduce this/i)).not.toBeInTheDocument();
    // The only interactive elements are the plain name tap targets — none named like an offer.
    for (const b of screen.getAllByRole('button')) {
      expect(b.textContent ?? '').not.toMatch(/add|suggest|help|option|reduce|\+|▸|›/i);
    }
    // The POLISH.md first-run hint system surfaces nothing for this feature.
    expect(screen.queryByText(/got it/i)).not.toBeInTheDocument();
  });

  it('the entry point carries no distinguishing style vs the surrounding text', () => {
    render(<WeeklySummaryView summary={withContrib} lookup={lookup} />);
    const tap = screen.getByRole('button', { name: 'Pectorals' });
    const cls = tap.className;
    // Inherits the label's look; nothing that draws the eye.
    expect(cls).toContain('text-[inherit]');
    // Only resets/inherits (border-0, bg-transparent, p-0) — nothing that draws the eye.
    expect(cls).not.toMatch(/underline|text-emerald|text-copper|text-blue|text-amber|rounded|bg-neutral-[0-9]|font-bold|uppercase/);
  });

  it('opens a plain lookup on tap — lists and facts, no instructions', async () => {
    const user = userEvent.setup();
    render(<WeeklySummaryView summary={withContrib} lookup={lookup} />);
    await user.click(screen.getByRole('button', { name: 'Pectorals' }));
    const dialog = screen.getByRole('dialog', { name: /pectorals lookup/i });
    expect(dialog).toHaveTextContent(/Contributing this week/);
    expect(dialog).toHaveTextContent(/Bench Press/); // current contributor
    expect(dialog).toHaveTextContent(/Cable Fly/); // catalog option (pectorals primary)
    // No instruction language in the lookup.
    for (const p of ['should', 'try ', 'consider', 'add a set', 'we recommend', 'this would bring you']) {
      expect(dialog.textContent!.toLowerCase().includes(p)).toBe(false);
    }
  });

  it('the copper rule still holds with the lookup mounted (no copper on tap targets)', () => {
    const { container } = render(<WeeklySummaryView summary={withContrib} lookup={lookup} />);
    container.querySelectorAll('.text-copper').forEach((el) => {
      expect(el.closest('section')?.textContent).toMatch(/Personal records/);
    });
  });
});
