// The weekly readout (WEEKLY_SUMMARY.md). A denser page than Today, so the
// hero-number rule doesn't apply — but hierarchy does: the volume chart is the
// centerpiece, everything else is instrumentation around it. Iron/chalk, tabular
// numerals, copper ONLY on the PR section (DESIGN.md).

import { summarySections, type WeeklySummary } from '../lib/weeklySummary';
import { VolumeView } from './VolumeView';

const fmtRange = (startISO: string, endISO: string) => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(`${startISO}T00:00:00`).toLocaleDateString(undefined, opts);
  const end = new Date(`${endISO}T00:00:00`).toLocaleDateString(undefined, opts);
  return `${start} – ${end}`;
};

export function WeeklySummaryView({ summary }: { summary: WeeklySummary }) {
  const sections = summarySections(summary);
  const trainedVolume = summary.volumeStates.filter((v) => v.hardSets > 0);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Weekly summary</span>
        <h1 className="text-2xl font-bold tabular-nums text-neutral-100">{fmtRange(summary.weekStart, summary.weekEnd)}</h1>
      </header>

      {sections.map((section) => {
        const isVolume = section.title === 'Volume';
        const isPr = section.tone === 'pr';
        return (
          <section key={section.title} className="flex flex-col gap-2">
            <h2
              className={`text-xs font-semibold uppercase tracking-wide ${isPr ? 'text-copper' : 'text-neutral-500'}`}
            >
              {section.title}
            </h2>
            <ul className={`flex flex-col gap-1.5 ${isVolume ? 'text-[15px]' : 'text-sm'}`}>
              {section.lines.map((line, i) => (
                <li
                  key={i}
                  className={`leading-snug tabular-nums ${isPr ? 'font-semibold text-copper' : 'text-neutral-300'}`}
                >
                  {line}
                </li>
              ))}
            </ul>
            {/* The centerpiece: personal MEV–MAV–MRV bands for muscles trained. */}
            {isVolume && trainedVolume.length > 0 && (
              <div className="mt-1">
                <VolumeView rows={trainedVolume} title="Hard sets vs. your bands" />
              </div>
            )}
          </section>
        );
      })}

      <p className="pt-1 text-[11px] leading-snug text-neutral-500">
        A reading of your week — what happened and where the gaps are. What to do with it is your call.
      </p>
    </div>
  );
}
