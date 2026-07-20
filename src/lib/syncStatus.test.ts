import { describe, expect, it } from 'vitest';
import { formatSyncSince, isSyncStale, SYNC_STALE_MS } from './syncStatus';

const now = Date.parse('2026-07-20T12:00:00Z');

describe('sync staleness (POLISH.md §4)', () => {
  it('is never stale with an empty queue', () => {
    expect(isSyncStale(0, now - SYNC_STALE_MS * 2, now)).toBe(false);
  });

  it('is not stale just because you stepped out of wifi mid-set', () => {
    expect(isSyncStale(3, now - 60 * 60 * 1000, now)).toBe(false); // 1h backlog
  });

  it('surfaces once a backlog has been stuck past the day threshold', () => {
    expect(isSyncStale(3, now - SYNC_STALE_MS - 1, now)).toBe(true);
  });

  it('a fresh device that never synced is not "stale"', () => {
    expect(isSyncStale(5, null, now)).toBe(false);
  });

  it('names the day within a week, a date beyond it', () => {
    expect(formatSyncSince(now - 2 * 24 * 60 * 60 * 1000, now)).toMatch(/^since \w+day$/);
    expect(formatSyncSince(now - 20 * 24 * 60 * 60 * 1000, now)).toMatch(/^since \w+ \d+$/);
  });
});
