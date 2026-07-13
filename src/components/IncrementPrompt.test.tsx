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
