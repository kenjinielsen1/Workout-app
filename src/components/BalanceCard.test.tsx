// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BalanceCard } from './BalanceCard';
import type { BalanceObservation } from '../lib/balance';

const obs: BalanceObservation = {
  type: 'push_pull',
  key: 'push_pull',
  message: 'Your push volume is about 4× your pull over the last month.',
  underPattern: 'horizontal_pull',
  severity: 4,
  suggestion: { id: 'row', name: 'Barbell Row' },
};

describe('BalanceCard', () => {
  it('shows the observation and a concrete catalog fix', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<BalanceCard observation={obs} onAddSuggestion={onAdd} onDismissIntentional={vi.fn()} />);
    expect(screen.getByText(/4× your pull/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try barbell row/i }));
    expect(onAdd).toHaveBeenCalledWith('row');
  });

  it('is dismissible as intentional', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<BalanceCard observation={obs} onDismissIntentional={onDismiss} />);
    await user.click(screen.getByRole('button', { name: /this is intentional/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
