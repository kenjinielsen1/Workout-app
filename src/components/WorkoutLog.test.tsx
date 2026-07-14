// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { WorkoutLog, type WorkoutLogEntry } from './WorkoutLog';
import type { LoggedSet } from '../data/domain';

const set = (id: string, set_number: number, weight_lb: number, reps: number, extra: Partial<LoggedSet> = {}): LoggedSet => ({
  id, workout_id: 'w', exercise_id: 'e', set_number, weight_lb, reps, rir: 2, is_warmup: false, failed: false, tempo: null, pain: null, ...extra,
});

const entries: WorkoutLogEntry[] = [
  { exercise_id: 'squat', name: 'Barbell Back Squat', sets: [set('s1', 1, 135, 5, { is_warmup: true }), set('s2', 2, 225, 5)] },
  { exercise_id: 'bench', name: 'Barbell Bench Press', sets: [set('b1', 1, 185, 5), set('b2', 2, 185, 4, { failed: true })] },
];

describe('WorkoutLog', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<WorkoutLog entries={[]} currentExerciseId="squat" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every movement and its sets, with a warm-up flag and a summary', () => {
    render(<WorkoutLog entries={entries} currentExerciseId="squat" />);
    const region = screen.getByRole('region', { name: 'This workout' });
    expect(within(region).getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(within(region).getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(within(region).getByText(/225×5/)).toBeInTheDocument();
    expect(within(region).getByText(/wu/)).toBeInTheDocument(); // warm-up marker
    // 2 movements, 3 working sets (one is a warm-up)
    expect(within(region).getByText(/2 movements · 3 sets/)).toBeInTheDocument();
  });

  it('highlights the current movement in the accent color', () => {
    render(<WorkoutLog entries={entries} currentExerciseId="bench" />);
    expect(screen.getByText('Barbell Bench Press')).toHaveClass('text-emerald-600');
    expect(screen.getByText('Barbell Back Squat')).not.toHaveClass('text-emerald-600');
  });
});
