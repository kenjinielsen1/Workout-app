// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionHistory } from './SessionHistory';
import type { HistorySession } from '../lib/exerciseStats';

const rows: HistorySession[] = [
  {
    date: '2026-07-08T00:00:00Z',
    t: Date.parse('2026-07-08T00:00:00Z'),
    sets: [
      { weight_lb: 225, reps: 5, failed: false },
      { weight_lb: 225, reps: 5, failed: false },
      { weight_lb: 225, reps: 4, failed: true },
    ],
    rir: 2,
    e1rm: 253,
  },
];

describe('SessionHistory', () => {
  it('renders per-set reps (grouped), RIR, and e1RM', () => {
    render(<SessionHistory sessions={rows} />);
    expect(screen.getByText('225 × 5, 5, 4✗')).toBeInTheDocument();
    expect(screen.getByText('RIR 2')).toBeInTheDocument();
    expect(screen.getByText('→ 253')).toBeInTheDocument();
  });

  it('shows a friendly placeholder with no history', () => {
    render(<SessionHistory sessions={[]} />);
    expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
  });
});
