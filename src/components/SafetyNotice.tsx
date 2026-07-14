// A calm, non-alarming safety message (SCOPE_SAFETY.md). Used for the
// professional-referral, over-reaching nudge, and special-population notices.
// Plain and brief; informs and routes, never commands, diagnoses, or nags.

interface Props {
  /** Short lead line (the observation), optional. */
  lead?: string;
  /** The main message body. */
  message: string;
  /** Dismiss for now (not a diagnosis, so dismissible). */
  onDismiss?: () => void;
  tone?: 'refer' | 'inform';
}

export function SafetyNotice({ lead, message, onDismiss, tone = 'inform' }: Props) {
  return (
    <section
      aria-label="Safety notice"
      className={`mx-auto flex w-full max-w-md flex-col gap-2 rounded-2xl border px-4 py-3 ${
        tone === 'refer'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30'
          : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900'
      }`}
    >
      {lead && <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{lead}</p>}
      <p className="text-sm leading-snug text-neutral-700 dark:text-neutral-200">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="self-start text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Got it
        </button>
      )}
    </section>
  );
}
