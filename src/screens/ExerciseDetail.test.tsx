// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ExerciseDetail, type DetailExercise } from './ExerciseDetail';
import type { StatSession } from '../lib/exerciseStats';

const exercise: DetailExercise = { name: 'Barbell Back Squat', load_type: 'total' };
const profile = { bodyweight_lb: 185 };

const day = (n: number) => new Date(Date.UTC(2026, 0, n)).toISOString();
const sessions: StatSession[] = [
  { performed_at: day(1), sets: [{ weight_lb: 200, reps: 5, rir: 2 }] }, // e1RM 233, PR
  { performed_at: day(5), sets: [{ weight_lb: 205, reps: 5, rir: 2 }] }, // e1RM 239, PR
  { performed_at: day(9), sets: [{ weight_lb: 205, reps: 5, rir: 1 }] }, // tie, no PR
  { performed_at: day(13), sets: [{ weight_lb: 215, reps: 5, rir: 2 }] }, // e1RM 251, PR
];

describe('ExerciseDetail', () => {
  it('renders the header and session count', () => {
    render(<ExerciseDetail exercise={exercise} profile={profile} sessions={sessions} />);
    expect(screen.getByRole('heading', { name: 'Barbell Back Squat' })).toBeInTheDocument();
    expect(screen.getByText(/4 sessions/)).toBeInTheDocument();
  });

  it('shows current est. 1RM and positive change', () => {
    render(<ExerciseDetail exercise={exercise} profile={profile} sessions={sessions} />);
    // current e1RM = 215*(1+5/30) = 251 (equals best here, so scope to the tile)
    const tile = screen.getByText('Est. 1RM').closest('div')!;
    expect(within(tile).getByText('251 lb')).toBeInTheDocument();
    expect(within(tile).getByText(/\+.*% since start/)).toBeInTheDocument();
  });

  it('plots one point per session and marks the 3 PRs', () => {
    const { container } = render(
      <ExerciseDetail exercise={exercise} profile={profile} sessions={sessions} />,
    );
    // 4 sessions -> 1 non-PR dot + 3 PR markers (green dots, not per-point labels)
    expect(container.querySelectorAll('[data-testid="line-dot"]').length).toBe(1);
    expect(container.querySelectorAll('[data-testid="pr-dot"]').length).toBe(3);
    expect(screen.getByText('personal record')).toBeInTheDocument();
  });

  it('renders one tonnage bar per session', () => {
    const { container } = render(
      <ExerciseDetail exercise={exercise} profile={profile} sessions={sessions} />,
    );
    expect(container.querySelectorAll('[data-testid="bar"]').length).toBe(4);
  });

  it('lists PR history most-recent first', () => {
    render(<ExerciseDetail exercise={exercise} profile={profile} sessions={sessions} />);
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]!).toHaveTextContent('251 lb e1RM'); // newest PR at top
  });

  it('shows an empty state for a brand-new exercise', () => {
    render(<ExerciseDetail exercise={exercise} profile={profile} sessions={[]} />);
    expect(screen.getAllByText('No data yet').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/0 sessions/)).toBeInTheDocument();
  });
});
