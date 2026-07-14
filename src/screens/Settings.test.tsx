// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from './Settings';
import type { Profile } from '../data/domain';

const profile: Profile = {
  user_id: 'u1',
  bodyweight_lb: 185,
  training_age_months: 18,
  goal: 'hypertrophy',
  sessions_per_week: 3,
  has_micro_plates: false,
  dumbbell_increment_lb: 5,
  rir_calibration_offset: 0,
  rir_calibration_n: 0,
  rir_calibration_updated: null,
  ml_alpha_cap: 1,
  warmup_enabled: false,
  weight_unit: 'lb',
  plate_system: 'imperial',
  periodization_enabled: true,
  volume_calibration: {},
};

function setup() {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<Settings profile={profile} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose, user: userEvent.setup() };
}

describe('Settings', () => {
  it('shows the current profile values', () => {
    setup();
    expect(screen.getByLabelText('Bodyweight')).toHaveValue(185);
    expect(screen.getByRole('button', { name: 'Hypertrophy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Micro plates available')).not.toBeChecked();
  });

  it('saves edited values as a patch and closes', async () => {
    const { onSave, onClose, user } = setup();
    const bw = screen.getByLabelText('Bodyweight');
    await user.clear(bw);
    await user.type(bw, '175');
    await user.click(screen.getByRole('button', { name: 'Strength' }));
    await user.click(screen.getByLabelText('Micro plates available'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        bodyweight_lb: 175,
        goal: 'strength',
        has_micro_plates: true,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('maps training experience to representative months', async () => {
    const { onSave, user } = setup();
    await user.selectOptions(screen.getByLabelText('Training experience'), '60');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ training_age_months: 60 }));
  });
});
