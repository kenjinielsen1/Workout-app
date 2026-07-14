// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlateauCard } from './PlateauCard';
import type { VariantExercise } from '../lib/variants';

const range = { min: 3, max: 6 };
const shifted = { min: 6, max: 10 };
const variants: VariantExercise[] = [
  { id: 'pause-squat', name: 'Pause Squat', variant_of: 'squat' },
];

describe('PlateauCard', () => {
  it('offers deload and rep-range shift, and logs the choice', async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(
      <PlateauCard currentRange={range} shiftedRange={shifted} variants={[]} onChoose={onChoose} onDismiss={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: /deload/i }));
    expect(onChoose).toHaveBeenCalledWith('deload');
    await user.click(screen.getByRole('button', { name: /shift rep range/i }));
    expect(onChoose).toHaveBeenCalledWith('rep_range_shift');
  });

  it('shows the variation option only when a valid variant exists', () => {
    const { rerender } = render(
      <PlateauCard currentRange={range} shiftedRange={shifted} variants={[]} onChoose={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(screen.queryByText(/swap to a variation/i)).not.toBeInTheDocument();

    rerender(
      <PlateauCard currentRange={range} shiftedRange={shifted} variants={variants} onChoose={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(screen.getByText(/swap to a variation/i)).toBeInTheDocument();
  });

  it('suggests adding volume before deloading on a hypertrophy under-volume stall (VOLUME.md)', () => {
    const { rerender } = render(
      <PlateauCard currentRange={range} shiftedRange={shifted} variants={[]} onChoose={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(screen.queryByText(/try more volume first/i)).not.toBeInTheDocument();
    rerender(
      <PlateauCard currentRange={range} shiftedRange={shifted} variants={[]} underVolume onChoose={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(screen.getByText(/try more volume first/i)).toBeInTheDocument();
  });

  it('logs a variation choice with the variant id', async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(
      <PlateauCard currentRange={range} shiftedRange={shifted} variants={variants} onChoose={onChoose} onDismiss={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Pause Squat' }));
    expect(onChoose).toHaveBeenCalledWith('variation', 'pause-squat');
  });
});
