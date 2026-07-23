// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { completedWeekStart, lastSeenWeek, markWeekSeen, shouldAutoShow } from './weeklySummaryTiming';

describe('weekly summary timing (WEEKLY_SUMMARY.md)', () => {
  beforeEach(() => localStorage.clear());

  it('the completed week is last week, not the in-progress one', () => {
    // 2026-07-22 is a Wednesday (week of Mon Jul 20). Completed week = Mon Jul 13.
    expect(completedWeekStart('2026-07-22T10:00:00Z')).toBe('2026-07-13');
    // On a Monday, the week that just ended is the prior Monday.
    expect(completedWeekStart('2026-07-20T09:00:00Z')).toBe('2026-07-13');
  });

  it('auto-shows a newer summary than last seen, once', () => {
    expect(shouldAutoShow('2026-07-13', null)).toBe(true); // never seen → show
    markWeekSeen('u1', '2026-07-13');
    expect(lastSeenWeek('u1')).toBe('2026-07-13');
    expect(shouldAutoShow('2026-07-13', lastSeenWeek('u1'))).toBe(false); // already seen
    expect(shouldAutoShow('2026-07-20', lastSeenWeek('u1'))).toBe(true); // a newer week
  });

  it('does not auto-show when there is nothing generated', () => {
    expect(shouldAutoShow(null, null)).toBe(false);
  });
});
