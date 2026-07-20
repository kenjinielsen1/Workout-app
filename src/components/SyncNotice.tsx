// The persistent-sync surface (POLISH.md §4). Calm and factual — the data isn't
// lost, it's queued on the device — so no red panic banner. A thin gray-green line
// at the top of Today, only when sync has genuinely been stuck for a day-plus.

interface SyncNoticeProps {
  since: string | null;
}

export function SyncNotice({ since }: SyncNoticeProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs text-neutral-400">
      <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-500" />
      <span>
        Not synced {since ?? 'in a while'} — your data’s safe on this device and will catch up when you’re back online.
      </span>
    </div>
  );
}
