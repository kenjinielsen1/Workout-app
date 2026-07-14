// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RirCalibrationPrompt } from './RirCalibrationPrompt';

describe('RirCalibrationPrompt', () => {
  it('captures predicted + actual reps and submits them', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<RirCalibrationPrompt exerciseName="DB Curl" onSubmit={onSubmit} onSkip={vi.fn()} />);
    await user.type(screen.getByLabelText('Predicted reps'), '8');
    await user.type(screen.getByLabelText('Actual reps'), '10');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(8, 10);
  });

  it('cannot submit until both fields are filled', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<RirCalibrationPrompt exerciseName="DB Curl" onSubmit={onSubmit} onSkip={vi.fn()} />);
    await user.type(screen.getByLabelText('Predicted reps'), '8');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
