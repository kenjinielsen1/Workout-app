// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadinessCheckIn } from './ReadinessCheckIn';

describe('ReadinessCheckIn', () => {
  it('submits once all three taps are chosen', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ReadinessCheckIn onSubmit={onSubmit} onSkip={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Sleep 4' }));
    expect(onSubmit).not.toHaveBeenCalled(); // not until all three
    await user.click(screen.getByRole('button', { name: 'Soreness 2' }));
    await user.click(screen.getByRole('button', { name: 'Energy 5' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ sleep_quality: 4, soreness: 2, energy: 5 });
  });

  it('skips without submitting', async () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(<ReadinessCheckIn onSubmit={onSubmit} onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
