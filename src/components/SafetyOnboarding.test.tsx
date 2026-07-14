// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SafetyOnboarding } from './SafetyOnboarding';
import { SafetyNotice } from './SafetyNotice';
import { containsDiagnosticLanguage } from '../lib/safety';

describe('SafetyOnboarding (SCOPE_SAFETY.md)', () => {
  it('shows the educational disclaimer and records the acknowledgement + special populations', async () => {
    const onAck = vi.fn();
    const user = userEvent.setup();
    render(<SafetyOnboarding onAcknowledge={onAck} />);
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/cardiovascular/i));
    await user.click(screen.getByRole('button', { name: /i understand/i }));
    expect(onAck).toHaveBeenCalledWith(['cardiovascular']);
  });

  it('acknowledges with no special population selected', async () => {
    const onAck = vi.fn();
    const user = userEvent.setup();
    render(<SafetyOnboarding onAcknowledge={onAck} />);
    await user.click(screen.getByRole('button', { name: /i understand/i }));
    expect(onAck).toHaveBeenCalledWith([]);
  });
});

describe('SafetyNotice', () => {
  it('shows a calm, non-diagnostic message and is dismissible', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<SafetyNotice lead="Heads up" message="This app is a training tool, not a clinician." onDismiss={onDismiss} />);
    const text = screen.getByText(/not a clinician/i);
    expect(text).toBeInTheDocument();
    expect(containsDiagnosticLanguage(text.textContent!)).toBe(false);
    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
