// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateManager } from './TemplateManager';
import type { WorkoutTemplate } from '../data/domain';

const catalog = [
  { id: 'bench', name: 'Bench Press' },
  { id: 'ohp', name: 'Overhead Press' },
  { id: 'dip', name: 'Dip' },
  { id: 'row', name: 'Barbell Row' },
];

const tpl = (over: Partial<WorkoutTemplate> = {}): WorkoutTemplate => ({
  id: 't1', user_id: 'u', name: 'Push A', exercise_ids: ['bench', 'ohp'],
  created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z', ...over,
});

function setup(templates: WorkoutTemplate[]) {
  const onStart = vi.fn(), onSave = vi.fn(), onDelete = vi.fn(), onClose = vi.fn();
  render(<TemplateManager templates={templates} catalog={catalog} onStart={onStart} onSave={onSave} onDelete={onDelete} onClose={onClose} />);
  return { onStart, onSave, onDelete, onClose, user: userEvent.setup() };
}

describe('TemplateManager (SAVED_WORKOUTS.md)', () => {
  it('empty state names the space and offers the one action', () => {
    setup([]);
    expect(screen.getByRole('heading', { name: /save a workout to reuse it/i })).toBeInTheDocument();
    expect(screen.queryByText(/no data|no templates/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new workout/i })).toBeInTheDocument();
  });

  it('creates a template of exercises + order only — and shows NO validation warning', async () => {
    const { user, onSave } = setup([]);
    await user.click(screen.getByRole('button', { name: /new workout/i }));
    await user.type(screen.getByRole('textbox', { name: /workout name/i }), 'Push A');
    await user.type(screen.getByRole('textbox', { name: /search exercises/i }), 'bench');
    await user.click(screen.getByRole('button', { name: 'Bench Press' }));
    await user.type(screen.getByRole('textbox', { name: /search exercises/i }), 'over');
    await user.click(screen.getByRole('button', { name: 'Overhead Press' }));

    // A push-only template draws no warning about missing pulling movements —
    // that would be a prescription (the balance monitor reports it after the fact).
    expect(screen.queryByText(/no pull|unbalanc|imbalanc|consider|you should|missing/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save workout/i }));
    expect(onSave).toHaveBeenCalledWith({ id: undefined, name: 'Push A', exercise_ids: ['bench', 'ohp'] });
    // The payload carries no weight/rep/set data.
    expect(Object.keys(onSave.mock.calls[0]![0]).sort()).toEqual(['exercise_ids', 'id', 'name']);
  });

  it('reorders exercises within a template', async () => {
    const { user, onSave } = setup([tpl()]);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: /move overhead press up/i }));
    await user.click(screen.getByRole('button', { name: /save workout/i }));
    expect(onSave).toHaveBeenCalledWith({ id: 't1', name: 'Push A', exercise_ids: ['ohp', 'bench'] });
  });

  it('starts a session from a template, and can duplicate or delete it', async () => {
    const { user, onStart, onSave, onDelete } = setup([tpl()]);
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(onSave).toHaveBeenCalledWith({ name: 'Push A copy', exercise_ids: ['bench', 'ohp'] });

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('t1');
  });

  it('renders a deleted exercise as unavailable and offers removal — no error', async () => {
    const { user, onSave } = setup([tpl({ exercise_ids: ['bench', 'gone-forever'] })]);
    // Listed plainly as unavailable rather than silently dropped.
    expect(screen.getByText(/Bench Press · Unavailable/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const row = screen.getByText('Unavailable exercise').closest('li')!;
    await user.click(within(row).getByRole('button', { name: /remove/i }));
    await user.click(screen.getByRole('button', { name: /save workout/i }));
    expect(onSave).toHaveBeenCalledWith({ id: 't1', name: 'Push A', exercise_ids: ['bench'] });
  });
});
