// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState (POLISH.md §1)', () => {
  it('names the space and offers the one action that fills it', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <EmptyState
        title="Add your first movement"
        body="Pick a lift and the app starts learning your numbers."
        action={{ label: 'Add an exercise', onClick }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Add your first movement' })).toBeInTheDocument();
    expect(screen.getByText(/starts learning your numbers/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add an exercise' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders as an invitation without an action (pure hint)', () => {
    render(<EmptyState title="Your strength curve" body="Log a few sessions and it shows up here." />);
    expect(screen.getByRole('heading', { name: 'Your strength curve' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('never says "no data"', () => {
    render(<EmptyState title="Volume" body="The MEV / MAV / MRV band fills as you log hard sets." />);
    expect(screen.queryByText(/no data/i)).not.toBeInTheDocument();
  });
});
