// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColdStartPrompt } from './ColdStartPrompt';

describe('ColdStartPrompt', () => {
  it('captures a recent weight × reps and submits them', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ColdStartPrompt exerciseName="Back Squat" onSubmit={onSubmit} onSkip={vi.fn()} />);
    await user.type(screen.getByLabelText('Recent weight'), '225');
    await user.type(screen.getByLabelText('Recent reps'), '5');
    await user.click(screen.getByRole('button', { name: 'Set start' }));
    expect(onSubmit).toHaveBeenCalledWith(225, 5);
  });

  it('cannot submit until both fields are valid', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ColdStartPrompt exerciseName="Back Squat" onSubmit={onSubmit} onSkip={vi.fn()} />);
    await user.type(screen.getByLabelText('Recent weight'), '225');
    await user.click(screen.getByRole('button', { name: 'Set start' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('skipping keeps the default and logs nothing', async () => {
    const onSkip = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ColdStartPrompt exerciseName="Back Squat" onSubmit={onSubmit} onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: 'Use default' }));
    expect(onSkip).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
