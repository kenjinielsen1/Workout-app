// When to generate and when to show the weekly summary (WEEKLY_SUMMARY.md).
// Generated for a week once that week has fully ended (its Sunday is past) — in
// practice, on the next app open in the following week. Shown as an interstitial
// once per week; the "last seen" marker keeps it from re-popping, while the
// summary itself stays re-readable from history.

import { weekStartOf } from './volume';

const DAY = 86_400_000;

/** The most recent fully-completed ISO week (its Monday), relative to `nowISO`.
 *  On any day Mon–Sun, that's last week — this week isn't over yet. */
export function completedWeekStart(nowISO: string): string {
  const thisMonday = Date.parse(`${weekStartOf(nowISO)}T00:00:00Z`);
  return weekStartOf(new Date(thisMonday - DAY).toISOString()); // a moment inside last week
}

const seenKey = (userId: string) => `po:weeklySeen:${userId}`;

export function lastSeenWeek(userId: string): string | null {
  try {
    return localStorage.getItem(seenKey(userId));
  } catch {
    return null;
  }
}

export function markWeekSeen(userId: string, weekStart: string): void {
  try {
    localStorage.setItem(seenKey(userId), weekStart);
  } catch {
    /* private mode — the interstitial may show again, harmless */
  }
}

/** Auto-show the interstitial when the newest stored summary is newer than what
 *  the user last saw. Re-opening from history never sets this, so it's re-readable
 *  without re-popping. */
export function shouldAutoShow(newestWeek: string | null, seen: string | null): boolean {
  if (!newestWeek) return false;
  return seen === null ? true : newestWeek > seen;
}
