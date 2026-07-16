// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PairBar, type PairCell } from './PairBar';

const ext: PairCell = { id: 'ext', name: 'Triceps Extension', target: { target_weight_lb: 50, target_reps: 12 }, setCount: 1 };
const lat: PairCell = { id: 'lat', name: 'Lateral Raise', target: { target_weight_lb: 20, target_reps: 15 }, setCount: 0 };

describe('PairBar (PAIRING.md)', () => {
  it('renders both exercises with their own target and set progress', () => {
    render(<PairBar cells={[ext, lat]} activeId="ext" onSwitch={vi.fn()} onUnpair={vi.fn()} />);
    expect(screen.getByText('Triceps Extension')).toBeInTheDocument();
    expect(screen.getByText('Lateral Raise')).toBeInTheDocument();
    // each shows its own weight × reps
    expect(screen.getByText(/50 lb × 12/)).toBeInTheDocument();
    expect(screen.getByText(/20 lb × 15/)).toBeInTheDocument();
    // and its own set count
    expect(screen.getByText('1 set')).toBeInTheDocument();
    expect(screen.getByText('0 sets')).toBeInTheDocument();
  });

  it('marks the active exercise and leaves the other switchable', () => {
    render(<PairBar cells={[ext, lat]} activeId="ext" onSwitch={vi.fn()} onUnpair={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Triceps Extension/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /Lateral Raise/ })).toHaveAttribute('aria-current', 'false');
  });

  it('tapping the inactive exercise switches to it; tapping the active one is a no-op', async () => {
    const onSwitch = vi.fn();
    const user = userEvent.setup();
    render(<PairBar cells={[ext, lat]} activeId="ext" onSwitch={onSwitch} onUnpair={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Lateral Raise/ }));
    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onSwitch).toHaveBeenCalledWith('lat');
    onSwitch.mockClear();
    await user.click(screen.getByRole('button', { name: /Triceps Extension/ }));
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('unpair button calls onUnpair', async () => {
    const onUnpair = vi.fn();
    const user = userEvent.setup();
    render(<PairBar cells={[ext, lat]} activeId="ext" onSwitch={vi.fn()} onUnpair={onUnpair} />);
    await user.click(screen.getByRole('button', { name: /unpair/i }));
    expect(onUnpair).toHaveBeenCalledOnce();
  });

  it('handles a not-yet-computed target without crashing', () => {
    render(<PairBar cells={[ext, { ...lat, target: null }]} activeId="ext" onSwitch={vi.fn()} onUnpair={vi.fn()} />);
    expect(screen.getByText('Lateral Raise')).toBeInTheDocument();
  });
});
