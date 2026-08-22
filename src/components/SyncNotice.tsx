// The persistent-sync surface (POLISH.md §4). Calm and factual — the data isn't
// lost, it's queued on the device — so no red panic banner. A thin gray-green line
// at the top of Today, only when sync has genuinely been stuck for a day-plus.

interface SyncNoticeProps {
  since: string | null;
  /** The server rejected something — this won't clear by waiting. */
  blocked?: boolean;
  /** The verbatim rejection, shown so a stuck queue can be reported accurately
   *  rather than guessed at. */
  failure?: { kind: string; code: string | null; message: string; details: string | null } | null;
}

export function SyncNotice({ since, blocked = false, failure = null }: SyncNoticeProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs text-neutral-400">
      <div className="flex items-center gap-2">
      <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-500" />
      <span>
        {blocked
          ? `Not synced ${since ?? 'in a while'} — your data’s safe on this device, but the server turned something away. It won’t clear on its own.`
          : `Not synced ${since ?? 'in a while'} — your data’s safe on this device and will catch up when you’re back online.`}
      </span>
      </div>
      {blocked && failure && (
        <p className="select-all break-words pl-3.5 font-mono text-[10px] leading-snug text-neutral-500">
          {failure.kind}
          {failure.code ? ` · ${failure.code}` : ''}: {failure.message}
          {failure.details ? ` — ${failure.details}` : ''}
        </p>
      )}
    </div>
  );
}
