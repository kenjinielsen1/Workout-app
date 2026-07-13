// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogSet, type LogSetExercise, type LogSetProfile, type SessionTarget } from './LogSet';

const barbell: LogSetExercise = {
  name: 'Barbell Back Squat',
  equipment: 'barbell',
  load_type: 'total',
  default_increment_lb: 10,
  is_compound: true,
};
const dumbbell: LogSetExercise = {
  name: 'Dumbbell Bench Press',
  equipment: 'dumbbell',
  load_type: 'per_hand',
  default_increment_lb: 5,
  is_compound: true,
};
const profile: LogSetProfile = {
  bodyweight_lb: 185,
  has_micro_plates: true,
  dumbbell_increment_lb: 5,
};
const target: SessionTarget = { target_weight_lb: 225, target_reps: 5, target_sets: 3 };

describe('LogSet screen', () => {
  beforeEach(() => localStorage.clear()); // rest-timer state must not leak across tests

  it('shows the target and the plate breakdown for the current weight', () => {
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    expect(screen.getByText(/Target 225 lb × 5/)).toBeInTheDocument();
    // 225 = bar (45) + 45 + 45 per side
    expect(screen.getByText('bar 45')).toBeInTheDocument();
    expect(screen.getByText('2×45')).toBeInTheDocument();
  });

  it('one-tap "Hit target" logs a set at the target', async () => {
    const onLogSet = vi.fn();
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} onLogSet={onLogSet} />);

    await user.click(screen.getByRole('button', { name: /hit target/i }));

    expect(onLogSet).toHaveBeenCalledTimes(1);
    expect(onLogSet).toHaveBeenCalledWith(
      expect.objectContaining({ weight_lb: 225, reps: 5, is_warmup: false, failed: false }),
    );
    const logged = screen.getByRole('list');
    expect(within(logged).getByText(/225 lb × 5/)).toBeInTheDocument();
  });

  it('recomputes plates when the weight changes', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    // Barbell w/ micro plates steps by 2.5: 225 -> 222.5.
    await user.click(screen.getByRole('button', { name: /decrease weight/i }));
    expect(screen.getByTestId('weight-input')).toHaveValue(222.5);
    // 222.5 -> 88.75/side needs a 35 and a 1.25 micro plate.
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('1.25')).toBeInTheDocument();
  });

  it('clears a logged set with its delete button', async () => {
    const onDeleteSet = vi.fn();
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} onDeleteSet={onDeleteSet} />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    const logged = await screen.findByRole('list');
    expect(within(logged).getByText(/225 lb × 5/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear set/i }));
    expect(onDeleteSet).toHaveBeenCalledTimes(1);
    // The only logged set is gone, so the "Logged" list unmounts.
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('marks a missed set as failed with 0 RIR', async () => {
    const onLogSet = vi.fn();
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} onLogSet={onLogSet} />);
    await user.click(screen.getByRole('button', { name: /missed/i }));
    expect(onLogSet).toHaveBeenCalledWith(
      expect.objectContaining({ failed: true, rir: 0 }),
    );
  });

  it('advances the next set up one increment after beating the target easily', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    // Log 225 × 7 @ 3 RIR (beat the 5-rep target with room to spare).
    fireEvent.change(screen.getByTestId('reps-input'), { target: { value: '7' } });
    fireEvent.change(screen.getByRole('slider', { name: /reps in reserve/i }), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    expect(screen.getByTestId('weight-input')).toHaveValue(227.5); // +2.5
    expect(screen.getByText(/up one increment/i)).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument(); // rest timer, rir 3 → 120s
  });

  it('backs the next set off after a clear miss', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    fireEvent.change(screen.getByTestId('reps-input'), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(screen.getByTestId('weight-input')).toHaveValue(222.5); // −2.5
    expect(screen.getByText(/backing off/i)).toBeInTheDocument();
  });

  it('refreshes weight/reps when the target changes (e.g. switching exercises)', () => {
    const { rerender } = render(
      <LogSet userId="u1" exercise={barbell} profile={profile} target={target} />,
    );
    expect(screen.getByTestId('weight-input')).toHaveValue(225);
    expect(screen.getByTestId('reps-input')).toHaveValue(5);

    // Fresh target arrives (async, after switching to another lift).
    rerender(
      <LogSet
        userId="u1"
        exercise={barbell}
        profile={profile}
        target={{ target_weight_lb: 135, target_reps: 8, target_sets: 3 }}
      />,
    );
    expect(screen.getByTestId('weight-input')).toHaveValue(135);
    expect(screen.getByTestId('reps-input')).toHaveValue(8);
  });

  it('does not clobber the autoregulated inputs once a set is logged', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LogSet userId="u1" exercise={barbell} profile={profile} target={target} />,
    );
    // Beat the target → autoregulation bumps to 227.5.
    fireEvent.change(screen.getByTestId('reps-input'), { target: { value: '7' } });
    fireEvent.change(screen.getByRole('slider', { name: /reps in reserve/i }), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(screen.getByTestId('weight-input')).toHaveValue(227.5);

    // A late target refinement must NOT overwrite the in-progress set weight.
    rerender(
      <LogSet
        userId="u1"
        exercise={barbell}
        profile={profile}
        target={{ target_weight_lb: 999, target_reps: 2, target_sets: 3 }}
      />,
    );
    expect(screen.getByTestId('weight-input')).toHaveValue(227.5);
  });

  it('flags a set that beats the prior best e1RM as a PR (banner + badge)', async () => {
    const user = userEvent.setup();
    // 225×5 → e1RM 262.5, beats a prior best of 250.
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} priorBestE1RM={250} />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/New PR/i);
    expect(within(screen.getByRole('list')).getByText('PR')).toBeInTheDocument();
  });

  it('does not flag a set below the prior best e1RM', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} priorBestE1RM={1000} />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });

  it('reveals per-exercise history in one tap from Log Set', async () => {
    const user = userEvent.setup();
    const history = [
      {
        date: '2026-07-08T00:00:00Z',
        t: Date.parse('2026-07-08T00:00:00Z'),
        sets: [{ weight_lb: 225, reps: 5, failed: false }],
        rir: 2,
        e1rm: 253,
      },
    ];
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} history={history} />);
    expect(screen.queryByText('225 × 5')).not.toBeInTheDocument(); // collapsed
    await user.click(screen.getByRole('button', { name: /last time/i }));
    expect(screen.getByText('225 × 5')).toBeInTheDocument(); // one tap → visible
  });

  it('renders a warm-up ramp when enabled, and logs a warm-up set on tap', async () => {
    const onLogSet = vi.fn();
    const user = userEvent.setup();
    render(
      <LogSet
        userId="u1"
        exercise={barbell}
        profile={{ ...profile, warmup_enabled: true }}
        target={target}
        onLogSet={onLogSet}
      />,
    );
    const warmupRegion = screen.getByRole('region', { name: /warm-up sets/i });
    const rows = within(warmupRegion).getAllByRole('button');
    expect(rows.length).toBeGreaterThan(0);
    await user.click(rows[0]!);
    expect(onLogSet).toHaveBeenCalledWith(expect.objectContaining({ is_warmup: true }));
  });

  it('shows no warm-up ramp when the setting is off (default)', () => {
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    expect(screen.queryByRole('region', { name: /warm-up sets/i })).not.toBeInTheDocument();
  });

  it('shows the effective-load note for dumbbells instead of plate chips', () => {
    render(
      <LogSet
        userId="u1"
        exercise={dumbbell}
        profile={profile}
        target={{ target_weight_lb: 60, target_reps: 8, target_sets: 3 }}
      />,
    );
    // per_hand: 60 each hand -> 120 on the body
    expect(screen.getByText(/60 lb each hand · 120 lb on the body/)).toBeInTheDocument();
  });
});
