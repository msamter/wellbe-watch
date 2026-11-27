import React, { useMemo } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Printer, X } from 'lucide-react';
import { RULER_THEMES, RulerQuadrant, WellbeState } from '../../types';
import { computeAnalyticsSummary } from '../../utils/coachEngine';

interface TherapistSummaryModalProps {
  open: boolean;
  onClose: () => void;
  state: WellbeState;
  rangeDays: 7 | 30;
  onChangeRange: (days: 7 | 30) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onExportMarkdown: (days: 7 | 30) => void;
}

export const TherapistSummaryModal: React.FC<TherapistSummaryModalProps> = ({
  open,
  onClose,
  state,
  rangeDays,
  onChangeRange,
  onExportJSON,
  onExportCSV,
  onExportMarkdown,
}) => {
  const summary = useMemo(
    () => computeAnalyticsSummary(state, rangeDays),
    [state, rangeDays]
  );

  if (!open) return null;

  const quadrants: RulerQuadrant[] = ['green', 'yellow', 'blue', 'red'];
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const recentGratitudes = state.gratitudes.slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="One-Page Therapist Summary"
    >
      <div className="print-only-sheet relative my-auto w-full max-w-[820px] max-h-[92vh] overflow-y-auto rounded-2xl border border-white/12 bg-white text-slate-900 shadow-2xl">
        {/* Top Action Toolbar (hidden when printing) */}
        <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-6 py-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-900">One-Page Therapist Summary</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChangeRange(d)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    rangeDays === d
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {`${d}-Day`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportJSON}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>.json</span>
            </button>
            <button
              type="button"
              onClick={onExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>.csv</span>
            </button>
            <button
              type="button"
              onClick={() => onExportMarkdown(rangeDays)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>.md</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Sheet</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close summary modal"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Single-Page Clinical Sheet Body */}
        <div className="p-7 space-y-6">
          {/* Clinical Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                WELLBE+ (3.2) · Pixel Watch Local-First Summary
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                Emotional &amp; Autonomic Clinical Digest ({rangeDays} Days)
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Generated {todayFormatted} · Stored exclusively on-device · Non-diagnostic self-monitoring log
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-600 tabular-nums">
              <p className="font-semibold text-slate-900">{summary.totalMoods} RULER Check-Ins</p>
              <p>{summary.resetsCompleted} Somatic Resets · {summary.gratitudeCount} Gratitudes</p>
            </div>
          </div>

          {/* 4-Column Key Biometric & Emotional Metrics Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-500">Dominant Quadrant</p>
              <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                {summary.quadrantPcts[summary.dominantQuadrant]}% {RULER_THEMES[summary.dominantQuadrant].name}
              </p>
              <p className="text-[11px] text-slate-500">
                {RULER_THEMES[summary.dominantQuadrant].energyLabel}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-500">Avg Sleep ({rangeDays}D)</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                {summary.avgSleep} hrs
              </p>
              <p className="text-[11px] text-slate-500">
                Last night: {state.liveBiometrics.sleepHours.toFixed(1)} hrs
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-500">Avg HRV (rMSSD)</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                {summary.avgHrv} ms
              </p>
              <p className="text-[11px] text-slate-500 tabular-nums">
                {summary.hrvDelta >= 0 ? `+${summary.hrvDelta}` : summary.hrvDelta} ms vs 30D base
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-500">Reset Efficacy</p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                −{summary.avgResetHrDrop} bpm
              </p>
              <p className="text-[11px] text-slate-500 tabular-nums">
                {summary.calmerRatePct}% felt calmer ({summary.totalResetMinutes}m)
              </p>
            </div>
          </div>

          {/* 2-Column Main Clinical Grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Left: RULER Distribution & Top Emotions */}
            <div className="rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-900">RULER Emotional Distribution</h2>
              <div className="mt-3 space-y-2.5">
                {quadrants.map((q) => {
                  const t = RULER_THEMES[q];
                  const pct = summary.quadrantPcts[q];
                  const count = summary.quadrantCounts[q];
                  return (
                    <div key={q}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {t.name}{' '}
                          <span className="font-normal text-slate-500">
                            ({t.energyLabel} · {t.valenceLabel})
                          </span>
                        </span>
                        <span className="font-mono font-semibold text-slate-700 tabular-nums">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: t.accent }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700">Most Frequent Emotions</p>
                <p className="mt-1 text-xs text-slate-600 tabular-nums">
                  {summary.topEmotions.map((e) => `${e.emotion} (${e.count})`).join(' · ')}
                </p>
              </div>
            </div>

            {/* Right: Context Triggers, Sleep Correlation & Gratitude */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <h2 className="text-sm font-bold text-slate-900">Biometric &amp; Context Correlations</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                  {summary.sleepMoodCorrelationText} Average resting heart rate is{' '}
                  <span className="font-mono font-semibold">{summary.avgRestingHr} bpm</span>{' '}
                  (overall avg <span className="font-mono font-semibold">{summary.avgHr} bpm</span>).
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <p className="font-semibold text-rose-700">Stress / Low Contexts</p>
                    <ul className="mt-1 space-y-0.5 text-slate-600 tabular-nums">
                      {summary.redTriggerTags.length > 0 ? (
                        summary.redTriggerTags.map((t) => (
                          <li key={t.tag}>{`${t.tag}: ${t.count} logs`}</li>
                        ))
                      ) : (
                        <li>No clustered triggers</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700">Steadying Contexts</p>
                    <ul className="mt-1 space-y-0.5 text-slate-600 tabular-nums">
                      {summary.greenSupportTags.length > 0 ? (
                        summary.greenSupportTags.map((t) => (
                          <li key={t.tag}>{`${t.tag}: ${t.count} logs`}</li>
                        ))
                      ) : (
                        <li>Rest &amp; Recovery</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h2 className="text-sm font-bold text-slate-900">Gratitude Themes &amp; Anchors</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Top themes:{' '}
                  {summary.topGratitudeTags.map((g) => `${g.tag} (${g.count})`).join(' · ') || 'Quiet Moment'}
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                  {recentGratitudes.map((g) => (
                    <li key={g.id} className="leading-snug">
                      <span className="font-semibold text-slate-900">{g.tag}:</span> “{g.text}”
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 7-Day Telemetry Snapshot Table */}
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-900">Recent 7-Day Daily Snapshot</h2>
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1.5 font-medium">Date</th>
                    <th className="py-1.5 font-medium">Check-Ins</th>
                    <th className="py-1.5 font-medium">Dominant Mood</th>
                    <th className="py-1.5 font-medium">Sleep</th>
                    <th className="py-1.5 font-medium">HRV (rMSSD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {summary.dailyCurve.map((row) => (
                    <tr key={row.dateISO}>
                      <td className="py-1.5 font-sans font-medium text-slate-800">{row.dateISO}</td>
                      <td className="py-1.5 text-slate-600">{row.count}</td>
                      <td className="py-1.5 font-sans font-medium text-slate-800">
                        {RULER_THEMES[row.dominant].name}
                      </td>
                      <td className="py-1.5 text-slate-700">{row.sleepHours.toFixed(1)}h</td>
                      <td className="py-1.5 text-slate-700">{row.avgHrv} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500">
            <span>WELLBE+ (3.2) for Google Pixel Watch · Local-First Behavioral Health Export</span>
            <span className="no-print flex items-center gap-1 text-emerald-700 font-medium">
              <Download className="h-3 w-3" /> Ready for therapy session review
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
