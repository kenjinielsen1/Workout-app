// Per-muscle weekly volume view (VOLUME.md). Shows hard sets landed this week
// against the user's MEV–MRV band. Framed as INFORMATION, not a bar to max out:
// the productive window is MEV→MAV, and MRV is a ceiling to respect, not a goal.
// The fill only ever highlights up to the sweet spot; past it reads as caution.

import { volumeState, type VolumeState } from '../lib/volume';
import type { Landmarks } from '../lib/volumeLandmarks';
import { paramConfidence } from '../lib/evidenceConfig';

export interface VolumeRow {
  muscle: string;
  hardSets: number;
  landmarks: Landmarks;
}

const LABEL: Record<VolumeState, string> = {
  below_mev: 'below growth range',
  productive: 'in the sweet spot',
  near_mrv: 'near your ceiling',
  over_mrv: 'over your ceiling — back off',
};

const DOT: Record<VolumeState, string> = {
  below_mev: 'bg-neutral-400',
  productive: 'bg-[var(--viz-good)]',
  near_mrv: 'bg-amber-500',
  over_mrv: 'bg-red-500',
};

const prettyMuscle = (m: string) =>
  m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function Bar({ hardSets, lm, state }: { hardSets: number; lm: Landmarks; state: VolumeState }) {
  // Scale the track to MRV (the ceiling) so the band positions are meaningful.
  const pct = (v: number) => `${Math.min(100, (v / lm.mrv) * 100)}%`;
  const mevPct = (lm.mev / lm.mrv) * 100;
  const mavPct = (lm.mav / lm.mrv) * 100;
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      {/* Productive window MEV→MAV — the only "good" zone. */}
      <div
        className="absolute inset-y-0 bg-[var(--viz-good)]/20"
        style={{ left: `${mevPct}%`, width: `${Math.max(0, mavPct - mevPct)}%` }}
        aria-hidden
      />
      {/* MRV ceiling marker (right edge of the track). */}
      <div className="absolute inset-y-0 right-0 w-0.5 bg-red-500/70" aria-hidden />
      {/* This week's landed volume. */}
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${
          state === 'over_mrv' ? 'bg-red-500' : state === 'near_mrv' ? 'bg-amber-500' : state === 'productive' ? 'bg-[var(--viz-good)]' : 'bg-neutral-400'
        }`}
        style={{ width: pct(hardSets) }}
      />
    </div>
  );
}

export function VolumeView({ rows, title = "This week's volume" }: { rows: VolumeRow[]; title?: string }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Weekly volume" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{title}</h2>
        <span className="text-xs text-neutral-400">hard sets · MEV–MRV</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map(({ muscle, hardSets, landmarks }) => {
          const state = volumeState(hardSets, landmarks);
          return (
            <li key={muscle} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className={`inline-block h-2 w-2 rounded-full ${DOT[state]}`} aria-hidden />
                  {prettyMuscle(muscle)}
                </span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {Number(hardSets.toFixed(1))} <span className="text-xs">/ {landmarks.mev}–{landmarks.mrv}</span>
                </span>
              </div>
              <Bar hardSets={hardSets} lm={landmarks} state={state} />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{LABEL[state]}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] leading-snug text-neutral-400">
        The shaded band is the productive range. More isn't better past it —
        MRV is a ceiling to respect, not a target to fill.
      </p>
      {/* Honest-uncertainty: reflect the evidence strength behind these bands. */}
      <p className="text-[11px] leading-snug text-neutral-400">
        Bands are <span className="font-medium">{paramConfidence('volume_landmarks_default')}</span>-confidence
        population priors — they shift toward your own tolerance as you train.
      </p>
    </section>
  );
}
