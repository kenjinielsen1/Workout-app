// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

// End-to-end through the demo (in-memory) store: no Supabase env is configured in
// tests, so the app runs in demo mode with a seeded 10-session squat history.
describe('App (demo mode end-to-end)', () => {
  it('signs in, reads seeded history, logs a set, and persists it', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Landing on the sign-in screen in demo mode.
    await user.click(await screen.findByRole('button', { name: /continue in demo mode/i }));

    // Home loads with the squat selected (shown on the picker button) and a target.
    const exerciseButton = await screen.findByRole('button', { name: 'Exercise' });
    expect(exerciseButton).toHaveTextContent('Barbell Back Squat');
    expect(await screen.findByText(/^\d+ lb × \d+$/)).toBeInTheDocument();

    // Detail tab shows the 10 seeded sessions.
    await user.click(screen.getByRole('button', { name: 'Exercise Detail' }));
    expect(await screen.findByText(/10 sessions/)).toBeInTheDocument();

    // Log a set at target, then finish the session.
    await user.click(screen.getByRole('button', { name: 'Log Set' }));
    // No workout timer before the first set.
    expect(screen.queryByLabelText('workout time')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hit target/i }));
    // The set shows in the running "This workout" log across movements.
    const workoutLog = await screen.findByRole('region', { name: 'This workout' });
    expect(within(workoutLog).getByText(/\d+×\d+/)).toBeInTheDocument();

    // The workout clock started at the first logged set.
    expect(await screen.findByLabelText('workout time')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /finish session/i }));

    // Back on detail, the new workout is now the 11th session, and the timer stopped.
    await waitFor(() => expect(screen.getByText(/11 sessions/)).toBeInTheDocument());
    expect(screen.queryByLabelText('workout time')).not.toBeInTheDocument();
  });
});
