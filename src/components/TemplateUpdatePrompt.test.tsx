// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateUpdatePrompt } from './TemplateUpdatePrompt';
import { structuralDiff } from '../lib/workoutTemplates';

const NAMES: Record<string, string> = { bench: 'Bench Press', ohp: 'Overhead Press', dip: 'Dip', curl: 'Curl' };
const nameOf = (id: string) => NAMES[id] ?? 'Unavailable exercise';

describe('TemplateUpdatePrompt (SAVED_WORKOUTS.md)', () => {
  it('shows the diff plainly so the answer needs no recall', () => {
    const diff = structuralDiff(['bench', 'ohp', 'dip'], ['bench', 'dip', 'curl']);
    render(<TemplateUpdatePrompt templateName="Push A" diff={diff} nameOf={nameOf} onUpdate={vi.fn()} onKeep={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /this session differed from push a/i })).toBeInTheDocument();
    expect(screen.getByText('Added: Curl')).toBeInTheDocument();
    expect(screen.getByText('Skipped: Overhead Press')).toBeInTheDocument();
  });

  it('"Keep as is" is a real dismissal — the template is left unchanged', async () => {
    const onUpdate = vi.fn(), onKeep = vi.fn();
    const user = userEvent.setup();
    const diff = structuralDiff(['bench', 'ohp'], ['bench']);
    render(<TemplateUpdatePrompt templateName="Push A" diff={diff} nameOf={nameOf} onUpdate={onUpdate} onKeep={onKeep} />);
    await user.click(screen.getByRole('button', { name: /keep as is/i }));
    expect(onKeep).toHaveBeenCalledOnce();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('tapping outside also dismisses (trivially skippable, not a checkpoint)', async () => {
    const onKeep = vi.fn();
    const user = userEvent.setup();
    const diff = structuralDiff(['bench', 'ohp'], ['bench']);
    render(<TemplateUpdatePrompt templateName="Push A" diff={diff} nameOf={nameOf} onUpdate={vi.fn()} onKeep={onKeep} />);
    await user.click(screen.getByRole('dialog', { name: /update template/i }));
    expect(onKeep).toHaveBeenCalled();
  });

  it('Update adopts what was actually trained', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    const diff = structuralDiff(['bench', 'ohp'], ['bench', 'ohp', 'curl']);
    render(<TemplateUpdatePrompt templateName="Push A" diff={diff} nameOf={nameOf} onUpdate={onUpdate} onKeep={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^update$/i }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('names a reorder as such', () => {
    const diff = structuralDiff(['bench', 'ohp'], ['ohp', 'bench']);
    render(<TemplateUpdatePrompt templateName="Push A" diff={diff} nameOf={nameOf} onUpdate={vi.fn()} onKeep={vi.fn()} />);
    expect(screen.getByText('Order changed')).toBeInTheDocument();
  });
});
