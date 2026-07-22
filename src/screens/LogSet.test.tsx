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
    expect(screen.getByText('225 lb × 5')).toBeInTheDocument();
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

  // POLISH.md §4: a fat-finger must not silently corrupt the e1RM.
  it('asks to confirm an absurd weight entry before logging it', async () => {
    const onLogSet = vi.fn();
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} onLogSet={onLogSet} />);
    // Fat-finger 225 → 2250 (10×). Logging must NOT fire yet.
    fireEvent.change(screen.getByTestId('weight-input'), { target: { value: '2250' } });
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(onLogSet).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog', { name: /confirm weight/i });
    expect(dialog).toHaveTextContent(/big jump/i);

    // Confirming logs it as entered; the value is never silently altered.
    await user.click(within(dialog).getByRole('button', { name: 'Log it' }));
    expect(onLogSet).toHaveBeenCalledWith(expect.objectContaining({ weight_lb: 2250 }));
  });

  it('does not nag on a normal working-weight entry', async () => {
    const onLogSet = vi.fn();
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} onLogSet={onLogSet} />);
    fireEvent.change(screen.getByTestId('weight-input'), { target: { value: '230' } }); // within range
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onLogSet).toHaveBeenCalledWith(expect.objectContaining({ weight_lb: 230 }));
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
    // Coach voice (DESIGN.md rule 4): "New best.", not "New PR!".
    expect(screen.getByRole('status')).toHaveTextContent(/new best/i);
    expect(screen.getByRole('status')).toHaveTextContent(/on your previous best/i);
    expect(within(screen.getByRole('list')).getByText('PR')).toBeInTheDocument();
  });

  it('does not flag a set below the prior best e1RM', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} priorBestE1RM={1000} />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    expect(screen.queryByText(/new best/i)).not.toBeInTheDocument(); // no PR celebration
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });

  it('shows a visible confirmation on every logged set (POLISH.md §2 visual path)', async () => {
    const user = userEvent.setup();
    // priorBestE1RM high so it's an ordinary log, not a PR (which owns the copper moment).
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} priorBestE1RM={1000} />);
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(screen.getByRole('status')).toHaveTextContent(/set logged/i);
  });

  it('names a hit-target confirmation distinctly', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} priorBestE1RM={1000} />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/hit target/i);
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

  it('kg user: displays the target in kg but stores the set in lb, unchanged (UNITS.md)', async () => {
    const onLogSet = vi.fn();
    const user = userEvent.setup();
    // 225 lb ≈ 102 kg. Metric bar so the grid is kg.
    render(
      <LogSet
        userId="u1"
        exercise={barbell}
        profile={{ ...profile, weight_unit: 'kg', plate_system: 'metric' }}
        target={target}
        onLogSet={onLogSet}
      />,
    );
    expect(screen.getByText('102 kg × 5')).toBeInTheDocument(); // displayed in kg
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    // Stored value is the original lb — the engine never sees kg.
    expect(onLogSet).toHaveBeenCalledWith(expect.objectContaining({ weight_lb: 225 }));
  });

  it('lb user: weight readout is byte-for-byte unchanged (regression guard)', () => {
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    expect(screen.getByText('225 lb × 5')).toBeInTheDocument();
    expect(screen.getByTestId('weight-input')).toHaveValue(225);
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

// PAIRING.md — the `nextUpName` prop is the ONLY thing pairing adds to LogSet. It
// must relabel the rest ("next up · B") without touching a single logged byte.
describe('LogSet — exercise pairing (PAIRING.md)', () => {
  beforeEach(() => localStorage.clear());

  const stripId = (s: Record<string, unknown>) => {
    const { id, ...rest } = s;
    void id;
    return rest;
  };

  it('logs a byte-identical set whether or not it is paired (no pairing field)', async () => {
    const user = userEvent.setup();

    const unpaired = vi.fn();
    const r1 = render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} onLogSet={unpaired} />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    r1.unmount();
    localStorage.clear();

    const paired = vi.fn();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} onLogSet={paired} nextUpName="Lateral Raise" />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));

    const a = unpaired.mock.calls[0]![0] as Record<string, unknown>;
    const b = paired.mock.calls[0]![0] as Record<string, unknown>;
    // Exactly the normal LoggedSet keys — nothing marks the set as "paired".
    const KEYS = ['failed', 'id', 'is_pr', 'is_warmup', 'pain', 'reps', 'rir', 'set_number', 'weight_lb'];
    expect(Object.keys(b).sort()).toEqual(KEYS);
    expect(Object.keys(a).sort()).toEqual(KEYS);
    // Same values (ids are random, so compare with id stripped).
    expect(stripId(b)).toEqual(stripId(a));
  });

  it('rest duration is unchanged when paired (rir 3 → 2:00 either way)', async () => {
    const user = userEvent.setup();

    const r1 = render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    fireEvent.change(screen.getByTestId('reps-input'), { target: { value: '7' } });
    fireEvent.change(screen.getByRole('slider', { name: /reps in reserve/i }), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(screen.getByText('2:00')).toBeInTheDocument();
    r1.unmount();
    localStorage.clear();

    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} nextUpName="Lateral Raise" />);
    fireEvent.change(screen.getByTestId('reps-input'), { target: { value: '7' } });
    fireEvent.change(screen.getByRole('slider', { name: /reps in reserve/i }), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(screen.getByText('2:00')).toBeInTheDocument(); // identical prescribed rest
  });

  it('the rest timer names the exercise the rest leads into', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} nextUpName="Lateral Raise" />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    expect(screen.getByText(/next up/i)).toHaveTextContent(/Lateral Raise/);
  });

  it('shows no next-exercise label when unpaired', async () => {
    const user = userEvent.setup();
    render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} />);
    await user.click(screen.getByRole('button', { name: /hit target/i }));
    expect(screen.queryByText(/next up/i)).not.toBeInTheDocument();
  });

  it('keeps the one running rest visible after switching to the paired exercise', async () => {
    const user = userEvent.setup();
    const lateral = { name: 'Lateral Raise', equipment: 'dumbbell' as const, load_type: 'per_hand' as const, default_increment_lb: 5, is_compound: false };

    // Log a set on A → a rest starts, leading into B.
    const a = render(<LogSet userId="u1" exercise={barbell} profile={profile} target={target} priorBestE1RM={1000} nextUpName="Lateral Raise" />);
    await user.click(screen.getByRole('button', { name: 'Hit target' }));
    expect(screen.getByLabelText('rest timer')).toBeInTheDocument();
    a.unmount(); // switching the active lift re-mounts LogSet (Home keys on the id)

    // On B — no set logged in this mount — the SAME rest is still counting down.
    render(<LogSet userId="u1" exercise={lateral} profile={profile} target={{ target_weight_lb: 20, target_reps: 15, target_sets: 3 }} priorBestE1RM={1000} nextUpName="Barbell Back Squat" />);
    expect(screen.getByLabelText('rest timer')).toBeInTheDocument();
  });
});
