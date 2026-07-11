// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisePicker, type PickerExercise } from './ExercisePicker';

const exercises: PickerExercise[] = [
  { id: 'bench', name: 'Barbell Bench Press', primary_muscles: ['pectorals', 'triceps'], aliases: ['bench', 'bb bench'] },
  { id: 'squat', name: 'Barbell Back Squat', primary_muscles: ['quadriceps', 'glutes'], aliases: ['squat', 'bb squat'] },
  { id: 'row', name: 'Barbell Row', primary_muscles: ['upper_back'], aliases: ['bent over row'] },
  { id: 'curl', name: 'Dumbbell Curl', primary_muscles: ['biceps'], aliases: ['db curl'] },
];

function setup() {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const onCreate = vi.fn();
  render(
    <ExercisePicker exercises={exercises} selectedId="squat" onSelect={onSelect} onCreate={onCreate} onClose={onClose} />,
  );
  return { onSelect, onClose, onCreate, user: userEvent.setup() };
}

describe('ExercisePicker', () => {
  it('renders muscle-group section headers', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Chest' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Legs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Arms' })).toBeInTheDocument();
  });

  it('filters to a muscle group via chips', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Legs' }));
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
  });

  it('fuzzy-searches across names and aliases', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox', { name: /search exercises/i }), 'bb squat');
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.queryByText('Dumbbell Curl')).not.toBeInTheDocument();
  });

  it('selecting an exercise calls onSelect and closes', async () => {
    const { user, onSelect, onClose } = setup();
    await user.click(screen.getByText('Dumbbell Curl'));
    expect(onSelect).toHaveBeenCalledWith('curl');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an empty state when nothing matches', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox', { name: /search exercises/i }), 'zzzzz nonsense');
    expect(screen.getByText(/No matches/i)).toBeInTheDocument();
  });

  it('creates a new user exercise with equipment-derived fields', async () => {
    const { user, onCreate } = setup();
    await user.click(screen.getByRole('button', { name: /new exercise/i }));
    await user.type(screen.getByRole('textbox', { name: /exercise name/i }), 'Cable Y-Raise');
    await user.selectOptions(screen.getByRole('combobox', { name: /equipment/i }), 'cable');
    await user.selectOptions(screen.getByRole('combobox', { name: /muscle group/i }), 'Shoulders');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cable Y-Raise',
        equipment: 'cable',
        load_type: 'total', // derived from cable
        primary_muscles: ['side_delts'], // derived from Shoulders
      }),
    );
  });

  it('warns "did you mean…?" on a near-duplicate name and can use the existing one', async () => {
    const { user, onSelect, onCreate } = setup();
    await user.click(screen.getByRole('button', { name: /new exercise/i }));
    await user.type(screen.getByRole('textbox', { name: /exercise name/i }), 'Barbell Bench'); // ~ "Barbell Bench Press"
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    // Duplicate prompt appears; creating is deferred.
    expect(onCreate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /use barbell bench press/i }));
    expect(onSelect).toHaveBeenCalledWith('bench');
  });
});
