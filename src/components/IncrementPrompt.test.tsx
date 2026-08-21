// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncrementPrompt } from './IncrementPrompt';

describe('IncrementPrompt', () => {
  it('prefills the guessed increment and saves the entered step + min', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<IncrementPrompt exerciseName="Cable Row" defaultIncrement={10} onSave={onSave} onSkip={vi.fn()} />);

    const step = screen.getByLabelText('Smallest weight change');
    expect(step).toHaveValue(10); // prefilled guess
    await user.clear(step);
    await user.type(step, '7');
    await user.type(screen.getByLabelText('Lightest selectable weight'), '21');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(7, 21);
  });

  it('omits the min when left blank', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<IncrementPrompt exerciseName="Lat Pulldown" defaultIncrement={10} onSave={onSave} onSkip={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(10, null);
  });

  it('skips without saving', async () => {
    const onSave = vi.fn();
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(<IncrementPrompt exerciseName="Cable Row" defaultIncrement={10} onSave={onSave} onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

// A kg user must be able to type the step they read off the machine.
describe('IncrementPrompt — display units (UNITS.md)', () => {
  it('labels the fields in kg and converts the entry back to lb on save', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    // 11.02 lb ≈ 5 kg — the prefill is shown in kg, not lb.
    render(<IncrementPrompt exerciseName="Cable Row" defaultIncrement={11.0231} unit="kg" onSave={onSave} onSkip={vi.fn()} />);
    expect(screen.getByText(/Smallest change \(kg\)/)).toBeInTheDocument();

    const step = screen.getByLabelText('Smallest weight change');
    await user.clear(step);
    await user.type(step, '5'); // the user reads "5 kg" off the stack
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Stored in lb, per UNITS.md — 5 kg ≈ 11.02 lb.
    expect(onSave.mock.calls[0]![0]).toBeCloseTo(11.02, 1);
  });

  it('still saves plain lb for an imperial user', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<IncrementPrompt exerciseName="Cable Row" defaultIncrement={10} unit="lb" onSave={onSave} onSkip={vi.fn()} />);
    const step = screen.getByLabelText('Smallest weight change');
    await user.clear(step);
    await user.type(step, '7');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(7, null);
  });

  it('offers a reset only when an override already exists', async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<IncrementPrompt exerciseName="Cable Row" defaultIncrement={10} onSave={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /reset to the default/i })).not.toBeInTheDocument();

    rerender(<IncrementPrompt exerciseName="Cable Row" defaultIncrement={10} onReset={onReset} onSave={vi.fn()} onSkip={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /reset to the default/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
