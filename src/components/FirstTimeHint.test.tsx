// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstTimeHint } from './FirstTimeHint';

describe('FirstTimeHint (POLISH.md §6)', () => {
  beforeEach(() => localStorage.clear());

  it('shows a one-liner the first time, then never again', () => {
    const first = render(<FirstTimeHint id="rir">reps in reserve</FirstTimeHint>);
    expect(screen.getByText('reps in reserve')).toBeInTheDocument();
    first.unmount();

    // A later mount (new session) does not show it again.
    render(<FirstTimeHint id="rir">reps in reserve</FirstTimeHint>);
    expect(screen.queryByText('reps in reserve')).not.toBeInTheDocument();
  });

  it('can be dismissed immediately with "Got it"', async () => {
    const user = userEvent.setup();
    render(<FirstTimeHint id="volume">weekly hard-set range</FirstTimeHint>);
    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(screen.queryByText('weekly hard-set range')).not.toBeInTheDocument();
  });

  it('tracks each hint id independently', () => {
    render(<FirstTimeHint id="a">first</FirstTimeHint>);
    expect(screen.getByText('first')).toBeInTheDocument();
    render(<FirstTimeHint id="b">second</FirstTimeHint>);
    expect(screen.getByText('second')).toBeInTheDocument(); // b unaffected by a
  });
});
