// The weekly readout (WEEKLY_SUMMARY.md). A denser page than Today, so the
// hero-number rule doesn't apply — but hierarchy does: the volume chart is the
// centerpiece, everything else is instrumentation around it. Iron/chalk, tabular
// numerals, copper ONLY on the PR section (DESIGN.md).
//
// VOLUME_SUGGESTIONS.md: the summary OFFERS nothing. Muscle names (in the chart)
// and exercise names (in progression) are plain, unstyled tap targets that open an
// on-request lookup — no button, icon, badge, hint, or highlight may reveal them.

import { useState } from 'react';
import { progressionSuffix, summarySections, type WeeklySummary } from '../lib/weeklySummary';
import { VolumeView } from './VolumeView';
import { VolumeLookupDrawer, type VolumeLookupContext } from './VolumeLookupDrawer';

const fmtRange = (startISO: string, endISO: string) => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(`${startISO}T00:00:00`).toLocaleDateString(undefined, opts);
  const end = new Date(`${endISO}T00:00:00`).toLocaleDateString(undefined, opts);
  return `${start} – ${end}`;
};

// A name that opens its lookup on tap — but only inherits the surrounding text's
// look, so nothing signals it's interactive.
function PlainTap({ label, onTap }: { label: string; onTap: (() => void) | null }) {
  if (!onTap) return <>{label}</>;
  return (
    <button type="button" onClick={onTap} className="border-0 bg-transparent p-0 font-[inherit] text-[inherit]">
      {label}
    </button>
  );
}

export function WeeklySummaryView({ summary, lookup }: { summary: WeeklySummary; lookup?: VolumeLookupContext }) {
  const [openMuscle, setOpenMuscle] = useState<string | null>(null);
  const sections = summarySections(summary);
  const trainedVolume = summary.volumeStates.filter((v) => v.hardSets > 0);
  const open = lookup ? (muscle: string) => setOpenMuscle(muscle) : null;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Weekly summary</span>
        <h1 className="text-2xl font-bold tabular-nums text-neutral-100">{fmtRange(summary.weekStart, summary.weekEnd)}</h1>
      </header>

      {sections.map((section) => {
        const isVolume = section.title === 'Volume';
        const isProgression = section.title === 'Progression';
        const isPr = section.tone === 'pr';
        return (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className={`text-xs font-semibold uppercase tracking-wide ${isPr ? 'text-copper' : 'text-neutral-500'}`}>
              {section.title}
            </h2>

            {isProgression && lookup ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                {summary.progression.map((p, i) => (
                  <li key={i} className="leading-snug tabular-nums text-neutral-300">
                    <PlainTap label={p.exercise} onTap={open && p.primaryMuscle ? () => open(p.primaryMuscle!) : null} />
                    {`: ${progressionSuffix(p, summary.unit, summary.plannedDeload, summary.hasFourWeekHistory)}`}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className={`flex flex-col gap-1.5 ${isVolume ? 'text-[15px]' : 'text-sm'}`}>
                {section.lines.map((line, i) => (
                  <li key={i} className={`leading-snug tabular-nums ${isPr ? 'font-semibold text-copper' : 'text-neutral-300'}`}>
                    {line}
                  </li>
                ))}
              </ul>
            )}

            {/* The centerpiece: personal MEV–MAV–MRV bands. Muscle names are the
                (invisible) tap targets for the lookup. */}
            {isVolume && trainedVolume.length > 0 && (
              <div className="mt-1">
                <VolumeView rows={trainedVolume} title="Hard sets vs. your bands" onMuscleTap={open ?? undefined} />
              </div>
            )}
          </section>
        );
      })}

      <p className="pt-1 text-[11px] leading-snug text-neutral-500">
        A reading of your week — what happened and where the gaps are. What to do with it is your call.
      </p>

      {lookup && openMuscle && (
        <VolumeLookupDrawer
          muscle={openMuscle}
          contributors={summary.contributors[openMuscle] ?? []}
          ctx={lookup}
          onClose={() => setOpenMuscle(null)}
        />
      )}
    </div>
  );
}
