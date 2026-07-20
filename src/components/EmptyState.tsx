// Zero-data states (POLISH.md §1). An empty screen names what the space is for and
// offers the one action that fills it — an invitation, never an apology. No blank
// rectangles, no "no data" (DESIGN.md coach voice). Quiet iron/chalk; the optional
// action is the one chalk-on-iron primary.

interface EmptyStateProps {
  /** What this space is (coach voice, sentence case). */
  title: string;
  /** One line on what it will hold / do once it has data. */
  body: string;
  /** The single action that fills the space, if there is one here. */
  action?: { label: string; onClick: () => void };
  /** Optional framed hint drawn behind the copy (e.g. labeled axes / bands). */
  frame?: React.ReactNode;
}

export function EmptyState({ title, body, action, frame }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-neutral-700 px-6 py-10 text-center">
      {frame && (
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40">
          {frame}
        </div>
      )}
      <div className="relative flex flex-col items-center gap-1.5">
        <h3 className="text-base font-semibold text-neutral-100">{title}</h3>
        <p className="max-w-[32ch] text-[13px] leading-snug text-neutral-400">{body}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="relative mt-1 rounded-2xl bg-neutral-100 px-5 py-3 text-sm font-bold text-neutral-900 active:scale-[0.99]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
