import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, ArrowLeft, FileText, Printer, Sparkles, Wind } from 'lucide-react';
import { RULER_THEMES, WellbeState } from '../../types';
import { computeAnalyticsSummary } from '../../utils/coachEngine';
import { m3Springs } from '../../styles/m3Tokens';
import {
  ExpressiveMorphLoader,
  ExpressiveWatchCardSkeleton,
} from '../watch/ExpressiveLoaders';
import {
  CurvedTimeText,
  EdgeActionButton,
  MicroRollNumber,
  WearScrollColumn,
} from '../watch/WearPrimitives';
import { ExpressiveButton, ExpressiveSegmentButton } from '../watch/ExpressiveControls';

interface TrendsAnalyticsTileProps {
  timeText: string;
  state: WellbeState;
  rangeDays: 7 | 30;
  onChangeRange: (days: 7 | 30) => void;
  onStartReset: (protocolId: string) => void;
  onOpenFullTherapistSheet: () => void;
  isSyncing?: boolean;
  onSubViewChange?: (active: boolean) => void;
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onHaptic: () => void;
  backSignal?: number;
}

type GaugePreviewMode = 'live' | 'balanced' | 'strained' | 'high';
type MindBodyMetric = 'sleep' | 'steps';

function polarPt(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSemiArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const p1 = polarPt(cx, cy, r, startDeg);
  const p2 = polarPt(cx, cy, r, endDeg);
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

export const TrendsAnalyticsTile: React.FC<TrendsAnalyticsTileProps> = ({
  timeText,
  state,
  rangeDays,
  onChangeRange,
  onStartReset,
  onOpenFullTherapistSheet,
  isSyncing = false,
  onSubViewChange,
  crownDelta,
  onScrollReport,
  onHaptic,
  backSignal = 0,
}) => {
  const [showDigest, setShowDigest] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(6);
  const [gaugeMode, setGaugeMode] = useState<GaugePreviewMode>('live');
  const [mindBodyMetric, setMindBodyMetric] = useState<MindBodyMetric>('sleep');
  const [rangeRefreshing, setRangeRefreshing] = useState(false);
  const rangeTimerRef = useRef<number | null>(null);
  const moodCurveGradId = useId();

  const isLoadingView = isSyncing || rangeRefreshing;

  useEffect(() => {
    return () => {
      if (rangeTimerRef.current) window.clearTimeout(rangeTimerRef.current);
    };
  }, []);

  const handleRangeChange = (days: 7 | 30) => {
    if (days === rangeDays) return;
    onHaptic();
    onChangeRange(days);
    setRangeRefreshing(true);
    if (rangeTimerRef.current) window.clearTimeout(rangeTimerRef.current);
    rangeTimerRef.current = window.setTimeout(() => {
      setRangeRefreshing(false);
      rangeTimerRef.current = null;
    }, 360);
  };

  const summary = useMemo(
    () => computeAnalyticsSummary(state, rangeDays),
    [state, rangeDays]
  );

  useEffect(() => {
    setSelectedDayIdx(Math.max(0, summary.dailyCurve.length - 1));
  }, [summary.dailyCurve.length]);

  useEffect(() => {
    onSubViewChange?.(showDigest);
  }, [showDigest, onSubViewChange]);

  useEffect(() => {
    if (backSignal > 0 && showDigest) {
      setShowDigest(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backSignal]);

  // Burnout Resilience Gauge values (Live or Preview Mode)
  const gaugeData = useMemo(() => {
    if (gaugeMode === 'balanced') {
      return {
        score: 24,
        status: 'Balanced' as const,
        color: '#63D4A3',
        sleep: '7.8h',
        rhr: '59 bpm',
        lowDays: '0d',
        note: 'Steady autonomic recovery with restorative sleep and calm resting heart rate. Keep your current rhythm.',
      };
    }
    if (gaugeMode === 'strained') {
      return {
        score: 48,
        status: 'Strained' as const,
        color: '#E8C96D',
        sleep: '6.6h',
        rhr: '65 bpm',
        lowDays: '2d',
        note: 'Mild cumulative load detected across 2 lower-energy days. A 4-7-8 reset before afternoon peaks can buffer strain.',
      };
    }
    if (gaugeMode === 'high') {
      return {
        score: 79,
        status: 'High' as const,
        color: '#E89B8C',
        sleep: '5.5h',
        rhr: '72 bpm',
        lowDays: '4d',
        note: 'Elevated autonomic load across recent shorter nights. Prioritize early rest and a gentle parasympathetic downshift.',
      };
    }
    const statusColor =
      summary.burnoutStatus === 'Balanced'
        ? '#63D4A3'
        : summary.burnoutStatus === 'Strained'
        ? '#E8C96D'
        : '#E89B8C';
    const note =
      summary.burnoutStatus === 'Balanced'
        ? `Steady recovery balance (${summary.avgSleep}h avg sleep, ${summary.avgRestingHr} bpm RHR). Short breathing resets help preserve reserves.`
        : summary.burnoutStatus === 'Strained'
        ? `Mild cumulative load detected across ${summary.lowEnergyDays} lower-energy days (${summary.avgSleep}h avg sleep, ${summary.avgRestingHr} bpm RHR). A 4-7-8 reset before afternoon peaks can buffer strain.`
        : `High cumulative load across ${summary.lowEnergyDays} lower-energy days (${summary.avgSleep}h avg sleep, ${summary.avgRestingHr} bpm RHR). Consider a 4-7-8 reset and lighter pacing today.`;

    return {
      score: summary.burnoutScore,
      status: summary.burnoutStatus,
      color: statusColor,
      sleep: `${summary.avgSleep.toFixed(1)}h`,
      rhr: `${summary.avgRestingHr} bpm`,
      lowDays: `${summary.lowEnergyDays}d`,
      note,
    };
  }, [gaugeMode, summary]);

  // Needle rotation: 0deg (left, score 0) -> 180deg (right, score 100)
  const needleRotateDeg = (gaugeData.score / 100) * 180;

  // Interactive 7-Day Mood Curve geometry (SVG 240 x 96)
  const curvePoints = useMemo(() => {
    const days = summary.dailyCurve;
    const leftPad = 18;
    const rightPad = 226;
    const topPad = 12;
    const bottomPad = 78;
    return days.map((d, i) => {
      const x =
        days.length > 1
          ? leftPad + (i / (days.length - 1)) * (rightPad - leftPad)
          : 120;
      const clampedScore = Math.max(1, Math.min(5, d.score));
      const y = bottomPad - ((clampedScore - 1) / 4) * (bottomPad - topPad);
      return { ...d, x, y, idx: i };
    });
  }, [summary.dailyCurve]);

  const moodPolyline = curvePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const moodAreaPath = curvePoints.length
    ? `M ${curvePoints[0].x.toFixed(1)},82 L ${curvePoints
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' L ')} L ${curvePoints[curvePoints.length - 1].x.toFixed(1)},82 Z`
    : '';

  const activeDay = curvePoints[selectedDayIdx] || curvePoints[curvePoints.length - 1];

  // Watch Executive Therapist Digest Sub-View
  if (showDigest) {
    const domTheme = RULER_THEMES[summary.dominantQuadrant];
    return (
      <div className="relative h-full w-full bg-[#121514]">
        <CurvedTimeText timeText={timeText} label={`Digest ${rangeDays}D`} />

        <WearScrollColumn
          crownDelta={crownDelta}
          onScrollReport={onScrollReport}
          paddingTopClass="pt-[46px]"
          paddingBottomClass="pb-[76px]"
        >
          <div className="flex flex-col gap-2.5">
            <div className="text-center">
              <p className="text-[13px] font-bold text-[#F4F6F5]">Therapist Digest ({rangeDays}D)</p>
              <p className="font-mono text-[10.5px] text-[#9CA3A0] tabular-nums">
                {`${summary.totalMoods} logs · ${summary.resetsCompleted} resets · ${summary.gratitudeCount} gratitudes`}
              </p>
            </div>

            <div className="rounded-[20px] border border-[#2B312F] bg-[#181C1B] p-3">
              <p className="text-[10.5px] font-semibold text-[#9CA3A0]">Dominant State &amp; Load</p>
              <p className="mt-0.5 text-[14px] font-bold" style={{ color: domTheme.accent }}>
                {`${summary.quadrantPcts[summary.dominantQuadrant]}% ${domTheme.name} · Load ${summary.burnoutScore}/100`}
              </p>
              <p className="mt-1 text-[11px] text-[#D1D6D4]">
                Top emotions: {summary.topEmotions.slice(0, 3).map((e) => e.emotion).join(', ')}
              </p>
            </div>

            <div className="rounded-[20px] border border-[#2B312F] bg-[#181C1B] p-3">
              <p className="text-[10.5px] font-semibold text-[#9CA3A0]">Stress Triggers &amp; Supports</p>
              <p className="mt-1 text-[11px] text-[#E5E9E7]">
                <span className="text-[#E89B8C] font-semibold">Stress:</span>{' '}
                {summary.redTriggerTags.map((t) => `${t.tag} (${t.count})`).join(', ') || 'None'}
              </p>
              <p className="mt-0.5 text-[11px] text-[#E5E9E7]">
                <span className="text-[#8FD8B5] font-semibold">Support:</span>{' '}
                {summary.greenSupportTags.map((t) => `${t.tag} (${t.count})`).join(', ') || 'Rest'}
              </p>
            </div>

            <div className="rounded-[20px] border border-[#2B312F] bg-[#181C1B] p-3">
              <p className="text-[10.5px] font-semibold text-[#9CA3A0]">Sleep-Mood Pattern</p>
              <p className="mt-1 font-mono text-[11px] text-[#E5E9E7] tabular-nums">
                {`7h+ Sleep: ${summary.goodSleepMoodAvg}/5 · <7h: ${summary.shortSleepMoodAvg}/5`}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#D1D6D4]">
                {`Avg HR drop during resets: −${summary.avgResetHrDrop} bpm (${summary.calmerRatePct}% calmer).`}
              </p>
            </div>

            <ExpressiveButton
              variant="outlined"
              size="xs"
              leadingIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              className="mx-auto"
              onClick={() => {
                onHaptic();
                setShowDigest(false);
              }}
            >
              Back to Trends
            </ExpressiveButton>
          </div>
        </WearScrollColumn>

        <EdgeActionButton
          onClick={() => {
            onHaptic();
            onOpenFullTherapistSheet();
          }}
          label="Open 1-Page / Print"
          icon={<Printer className="h-3.5 w-3.5" />}
          variant="emerald"
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#121514]">
      <CurvedTimeText timeText={timeText} label="Trends" />

      <WearScrollColumn
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        paddingTopClass="pt-[46px]"
        paddingBottomClass="pb-[54px]"
      >
        <div className="flex flex-col gap-3">
          {/* Header: Date Range + M3 Expressive 7D / 30D Toggle + Shape-Morphing Therapist Summary Button */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5">
              {isLoadingView && (
                <ExpressiveMorphLoader size={18} label="Refreshing trends" />
              )}
              <p className="text-[10.5px] font-medium text-[#9CA3A0]">
                {isLoadingView
                  ? 'Updating wellness trends…'
                  : `Live Biometrics · ${summary.dateRangeLabel}`}
              </p>
            </div>
            <div className="mt-2 inline-flex gap-1 rounded-full border border-[#2B312F] bg-[#181C1B] p-0.5">
              {([7, 30] as const).map((days) => {
                const active = rangeDays === days;
                return (
                  <ExpressiveSegmentButton
                    key={days}
                    selected={active}
                    selectedBorder="transparent"
                    className="min-h-[28px] px-4 text-[11px]"
                    onClick={() => handleRangeChange(days)}
                  >
                    {`${days}D`}
                  </ExpressiveSegmentButton>
                );
              })}
            </div>

            <ExpressiveButton
              variant="filled"
              size="sm"
              leadingIcon={<FileText className="h-3.5 w-3.5" />}
              className="mt-2 font-bold"
              onClick={() => {
                onHaptic();
                setShowDigest(true);
              }}
            >
              Therapist Summary
            </ExpressiveButton>
          </div>

          <AnimatePresence mode="wait">
            {isLoadingView ? (
              <motion.div
                key="trends-skeletons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={m3Springs.defaultEffects}
                className="flex flex-col gap-3"
              >
                <ExpressiveWatchCardSkeleton variant="analytics" />
                <ExpressiveWatchCardSkeleton variant="analytics" />
              </motion.div>
            ) : (
              <motion.div
                key={`trends-loaded-${rangeDays}`}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={m3Springs.defaultSpatial}
                className="flex flex-col gap-3"
              >
          {/* 1. Emotional Distribution — Animated 280ms SVG Donut Ring + All 5 Affective Buckets */}
          <div className="rounded-[22px] border border-[#2B312F] bg-[#181C1B] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[12.5px] font-bold text-[#F4F6F5]">Emotional Distribution</h3>
                <p className="mt-0.5 text-[10px] text-[#9CA3A0]">
                  <MicroRollNumber value={summary.totalMoods} className="font-mono text-[#D1D6D4]" />
                  {` logs · ${rangeDays}D`}
                </p>
              </div>

              {/* Compact Smooth SVG RULER Donut Ring (280ms stroke-dashoffset interpolation) */}
              {(() => {
                const r = 18;
                const circ = 2 * Math.PI * r;
                let offset = 0;
                return (
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 44 44"
                    className="shrink-0 -rotate-90"
                    aria-label="Emotional distribution ring"
                  >
                    <circle
                      cx="22"
                      cy="22"
                      r={r}
                      fill="none"
                      stroke="#242A27"
                      strokeWidth="5"
                    />
                    {summary.affectiveBuckets.map((b) => {
                      const segLen = (b.pct / 100) * circ;
                      const currentOffset = offset;
                      offset += segLen;
                      return (
                        <circle
                          key={b.id}
                          cx="22"
                          cy="22"
                          r={r}
                          fill="none"
                          stroke={b.color}
                          strokeWidth="5"
                          strokeDasharray={`${segLen.toFixed(2)} ${circ.toFixed(2)}`}
                          strokeDashoffset={(-currentOffset).toFixed(2)}
                          style={{
                            transition:
                              'stroke-dasharray 280ms cubic-bezier(0.2, 0.9, 0.2, 1), stroke-dashoffset 280ms cubic-bezier(0.2, 0.9, 0.2, 1)',
                          }}
                        />
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            <div className="mt-2.5 space-y-2">
              {summary.affectiveBuckets.map((bucket, idx) => (
                <div key={bucket.id}>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold text-[#E5E9E7]">{bucket.label}</span>
                    <span className="font-mono text-[10px] text-[#9CA3A0] tabular-nums">
                      <MicroRollNumber value={bucket.count} />
                      {` · ${bucket.pct}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-[6px] w-full overflow-hidden rounded-full bg-[#242A27]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(bucket.pct > 0 ? 4 : 0, bucket.pct)}%`,
                        backgroundColor: bucket.color,
                        transition: `width 280ms cubic-bezier(0.2, 0.9, 0.2, 1) ${Math.min(idx * 20, 80)}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Interactive 7-Day Mood Curve */}
          <div className="rounded-[22px] border border-[#2B312F] bg-[#181C1B] p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[12.5px] font-bold text-[#F4F6F5]">7-Day Mood Curve</h3>
              {activeDay && (
                <span className="font-mono text-[10px] font-semibold text-[#63D4A3] tabular-nums">
                  {`${activeDay.dateShort} · ${activeDay.score}/5`}
                </span>
              )}
            </div>

            {/* Line Chart SVG */}
            <svg
              width="100%"
              height="92"
              viewBox="0 0 240 92"
              className="mt-2 overflow-visible"
            >
              <defs>
                <linearGradient id={moodCurveGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#63D4A3" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#63D4A3" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Subtle horizontal gridlines for 1..5 */}
              {[12, 28.5, 45, 61.5, 78].map((y, idx) => (
                <g key={y}>
                  <line
                    x1="14"
                    y1={y}
                    x2="230"
                    y2={y}
                    stroke="#252B29"
                    strokeWidth="1"
                  />
                  <text
                    x="4"
                    y={y + 3}
                    fill="#6E7774"
                    fontSize="8"
                    className="font-mono"
                  >
                    {5 - idx}
                  </text>
                </g>
              ))}

              {moodAreaPath && <path d={moodAreaPath} fill={`url(#${moodCurveGradId})`} />}
              {moodPolyline && (
                <polyline
                  fill="none"
                  stroke="#63D4A3"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={moodPolyline}
                />
              )}

              {/* Clickable Day Nodes */}
              {curvePoints.map((pt) => {
                const isSelected = pt.idx === selectedDayIdx;
                return (
                  <g
                    key={pt.dateISO}
                    onClick={() => {
                      onHaptic();
                      setSelectedDayIdx(pt.idx);
                    }}
                    className="cursor-pointer"
                  >
                    <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4.8 : 3.2}
                      fill={isSelected ? '#63D4A3' : '#181C1B'}
                      stroke="#63D4A3"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Interactive Day Selector Pills (We..Now) */}
            <div className="mt-1.5 grid grid-cols-7 gap-1">
              {curvePoints.map((pt) => {
                const isSelected = pt.idx === selectedDayIdx;
                return (
                  <ExpressiveSegmentButton
                    key={pt.dateISO}
                    selected={isSelected}
                    selectedBg="#63D4A3"
                    selectedColor="#0B1A13"
                    selectedBorder="#63D4A3"
                    idleBg="#202523"
                    idleColor="#D1D6D4"
                    idleBorder="#2B312F"
                    selectedRadius="10px"
                    idleRadius="14px"
                    className="flex-col py-1 text-center"
                    onClick={() => {
                      onHaptic();
                      setSelectedDayIdx(pt.idx);
                    }}
                  >
                    <span className="text-[9px] font-bold leading-none">{pt.label}</span>
                    <span
                      className={`mt-0.5 font-mono text-[8.5px] leading-none tabular-nums ${
                        isSelected ? 'text-[#0B1A13]/85 font-bold' : 'text-[#9CA3A0]'
                      }`}
                    >
                      {pt.score.toFixed(1)}
                    </span>
                  </ExpressiveSegmentButton>
                );
              })}
            </div>

            {/* Selected Day Biometric Context Strip */}
            {activeDay && (
              <div className="mt-2.5 rounded-[12px] border border-[#2B312F] bg-[#121514] px-2.5 py-2 text-center font-mono text-[10px] text-[#D1D6D4] tabular-nums">
                <span className="font-sans font-semibold text-[#F4F6F5]">
                  {activeDay.dateShort}
                </span>
                {` · Sleep ${activeDay.sleepHours.toFixed(1)}h · HRV ${activeDay.avgHrv}ms · ${activeDay.steps.toLocaleString()} steps`}
              </div>
            )}
          </div>

          {/* 3. Burnout Resilience Gauge — Autonomic Load Model */}
          <div className="rounded-[22px] border border-[#2B312F] bg-[#181C1B] p-3.5">
            <div className="flex items-center gap-1.5 text-[9.5px] font-semibold text-[#9CA3A0]">
              <Activity className="h-3 w-3 text-[#63D4A3]" />
              <span>Autonomic Load Model</span>
            </div>
            <h3 className="mt-0.5 text-[12.5px] font-bold text-[#F4F6F5]">
              Burnout Resilience Gauge
            </h3>

            {/* Live / Balanced / Strained / High Interactive Selector */}
            <div className="mt-2 grid grid-cols-4 gap-1 rounded-[14px] border border-[#2B312F] bg-[#121514] p-0.5">
              {(
                [
                  { id: 'live', label: 'Live' },
                  { id: 'balanced', label: 'Bal' },
                  { id: 'strained', label: 'Strain' },
                  { id: 'high', label: 'High' },
                ] as const
              ).map((tab) => {
                const active = gaugeMode === tab.id;
                return (
                  <ExpressiveSegmentButton
                    key={tab.id}
                    selected={active}
                    selectedBg="#262C2A"
                    selectedColor="#F4F6F5"
                    selectedBorder="transparent"
                    idleBg="transparent"
                    idleColor="#9CA3A0"
                    selectedRadius="9px"
                    idleRadius="999px"
                    className="py-1 text-[10px]"
                    onClick={() => {
                      onHaptic();
                      setGaugeMode(tab.id);
                    }}
                  >
                    {tab.label}
                  </ExpressiveSegmentButton>
                );
              })}
            </div>

            {/* Semi-Circular 3-Zone Segmented Arc Gauge */}
            <div className="relative mt-2 flex flex-col items-center">
              <svg width="212" height="114" viewBox="0 0 212 114" className="overflow-visible">
                {/* 3 Segmented Arc Zones: Balanced (180..236), Strained (242..298), High (304..360) */}
                <path
                  d={describeSemiArc(106, 98, 74, 180, 236)}
                  fill="none"
                  stroke="#63D4A3"
                  strokeWidth="9"
                  strokeLinecap="round"
                  opacity={gaugeData.status === 'Balanced' ? 1 : 0.45}
                />
                <path
                  d={describeSemiArc(106, 98, 74, 242, 298)}
                  fill="none"
                  stroke="#E8C96D"
                  strokeWidth="9"
                  strokeLinecap="round"
                  opacity={gaugeData.status === 'Strained' ? 1 : 0.45}
                />
                <path
                  d={describeSemiArc(106, 98, 74, 304, 360)}
                  fill="none"
                  stroke="#E89B8C"
                  strokeWidth="9"
                  strokeLinecap="round"
                  opacity={gaugeData.status === 'High' ? 1 : 0.45}
                />

                {/* Top zone status label */}
                <text
                  x="106"
                  y="14"
                  textAnchor="middle"
                  fill={gaugeData.color}
                  fontSize="10"
                  fontWeight="600"
                >
                  {gaugeData.status}
                </text>

                {/* Gauge Needle (GPU-composited transform rotation around pivot 106,98) */}
                <line
                  x1="106"
                  y1="98"
                  x2="50"
                  y2="98"
                  stroke="#F4F6F5"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '106px 98px',
                    transform: `rotate(${needleRotateDeg.toFixed(1)}deg)`,
                    transition: 'transform 320ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
                <circle cx="106" cy="98" r="5" fill="#F4F6F5" />
                <circle cx="106" cy="98" r="2.2" fill="#181C1B" />

                {/* 0 - Balanced & 100 - Risk labels */}
                <text x="16" y="112" fill="#9CA3A0" fontSize="8.5" className="font-mono">
                  0 - Balanced
                </text>
                <text x="196" y="112" textAnchor="end" fill="#9CA3A0" fontSize="8.5" className="font-mono">
                  100 - Risk
                </text>
              </svg>

              {/* Numeric Score with 140ms Micro-Rolling Transition */}
              <div className="mt-1 text-center">
                <p className="font-mono text-[24px] font-bold leading-none text-[#F4F6F5] tabular-nums">
                  <MicroRollNumber value={gaugeData.score} />
                  <span className="text-[11px] font-normal text-[#9CA3A0]"> /100</span>
                </p>
                <p className="mt-0.5 text-[11px] font-semibold" style={{ color: gaugeData.color }}>
                  {gaugeData.status}
                </p>
              </div>
            </div>

            {/* 3-Column Autonomic Metrics Strip */}
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              <div className="rounded-[12px] border border-[#2B312F] bg-[#121514] py-1.5 text-center">
                <p className="text-[9px] text-[#9CA3A0]">Avg Sleep</p>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-[#F4F6F5] tabular-nums">
                  <MicroRollNumber value={gaugeData.sleep} />
                </p>
              </div>
              <div className="rounded-[12px] border border-[#2B312F] bg-[#121514] py-1.5 text-center">
                <p className="text-[9px] text-[#9CA3A0]">Resting HR</p>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-[#F4F6F5] tabular-nums">
                  <MicroRollNumber value={gaugeData.rhr} />
                </p>
              </div>
              <div className="rounded-[12px] border border-[#2B312F] bg-[#121514] py-1.5 text-center">
                <p className="text-[9px] text-[#9CA3A0]">Low-Energy</p>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-[#F4F6F5] tabular-nums">
                  <MicroRollNumber value={gaugeData.lowDays} />
                </p>
              </div>
            </div>

            {/* Insight Note + Start Reset in Routines CTA */}
            <p className="mt-2 text-[10.5px] leading-snug text-[#D1D6D4]">{gaugeData.note}</p>

            <ExpressiveButton
              variant="filled"
              size="sm"
              fullWidth
              leadingIcon={<Wind className="h-3.5 w-3.5" />}
              className="mt-2.5 font-bold"
              onClick={() => {
                onHaptic();
                onStartReset('4-7-8');
              }}
            >
              Start Reset in Routines
            </ExpressiveButton>
          </div>

          {/* 4. Mind-Body Pattern: Sleep & Mood Pattern (with Sleep / Steps Toggle) */}
          <div className="rounded-[22px] border border-[#2B312F] bg-[#181C1B] p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9.5px] font-semibold text-[#9CA3A0]">Mind-Body Pattern</p>
                <h3 className="text-[12px] font-bold text-[#F4F6F5]">
                  {mindBodyMetric === 'sleep' ? 'Sleep & Mood' : 'Steps & Mood'}
                </h3>
              </div>

              <div className="inline-flex gap-0.5 rounded-full border border-[#2B312F] bg-[#121514] p-0.5">
                {(['sleep', 'steps'] as const).map((m) => {
                  const active = mindBodyMetric === m;
                  return (
                    <ExpressiveSegmentButton
                      key={m}
                      selected={active}
                      selectedBg="#262C2A"
                      selectedColor="#F4F6F5"
                      selectedBorder="transparent"
                      idleBg="transparent"
                      idleColor="#9CA3A0"
                      selectedRadius="10px"
                      idleRadius="999px"
                      className="px-2.5 py-0.5 text-[10px] capitalize"
                      onClick={() => {
                        onHaptic();
                        setMindBodyMetric(m);
                      }}
                    >
                      {m}
                    </ExpressiveSegmentButton>
                  );
                })}
              </div>
            </div>

            {/* Insight Callout Box */}
            <div className="mt-2.5 rounded-[14px] border border-[#2B312F] bg-[#141817] p-2.5">
              <div className="flex items-start gap-1.5">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#63D4A3]" />
                <div>
                  <p className="text-[11px] font-bold leading-snug text-[#F4F6F5]">
                    {mindBodyMetric === 'sleep'
                      ? 'More restful nights lined up with steadier days'
                      : 'More active days lined up with steadier moods'}
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-[#9CA3A0]">
                    {mindBodyMetric === 'sleep'
                      ? `7+ hrs sleep averaged ${summary.goodSleepMoodAvg}/5 mood vs ${summary.shortSleepMoodAvg}/5 after shorter nights.`
                      : `7k+ step days averaged ${summary.highStepsMoodAvg}/5 mood vs ${summary.lowStepsMoodAvg}/5 on lighter days.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Dual-Axis Combined Bars (Sleep/Steps) + Mint Mood Line Chart */}
            <svg
              width="100%"
              height="102"
              viewBox="0 0 240 102"
              className="mt-2.5 overflow-visible"
            >
              {/* Subtle horizontal gridlines */}
              {[12, 44, 76].map((y, idx) => (
                <g key={y}>
                  <line x1="22" y1={y} x2="218" y2={y} stroke="#242A27" strokeWidth="1" />
                  <text x="18" y={y + 3} textAnchor="end" fill="#6E7774" fontSize="7.5" className="font-mono">
                    {mindBodyMetric === 'sleep'
                      ? idx === 0
                        ? '10h'
                        : idx === 1
                        ? '8h'
                        : '6h'
                      : idx === 0
                      ? '12k'
                      : idx === 1
                      ? '7k'
                      : '3k'}
                  </text>
                  <text x="224" y={y + 3} fill="#6E7774" fontSize="7.5" className="font-mono">
                    {idx === 0 ? '5' : idx === 1 ? '3' : '1'}
                  </text>
                </g>
              ))}

              {/* Background Sleep or Steps Vertical Bars */}
              {curvePoints.map((pt, i) => {
                const x = 32 + (i / Math.max(1, curvePoints.length - 1)) * 176;
                const ratio =
                  mindBodyMetric === 'sleep'
                    ? Math.max(0.08, Math.min(1, (pt.sleepHours - 4.5) / 5.5))
                    : Math.max(0.08, Math.min(1, (pt.steps - 2000) / 10000));
                const barH = ratio * 66;
                const barY = 78 - barH;
                return (
                  <g key={pt.dateISO}>
                    <rect
                      x={x - 7}
                      y={barY}
                      width="14"
                      height={barH}
                      rx="4"
                      fill="#2B3431"
                      stroke="#3A4642"
                      strokeWidth="0.7"
                    />
                    <text
                      x={x}
                      y="93"
                      textAnchor="middle"
                      fill={pt.isToday ? '#63D4A3' : '#9CA3A0'}
                      fontSize="8"
                      fontWeight={pt.isToday ? '700' : '500'}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}

              {/* Foreground Mint Mood Line Overlay */}
              <polyline
                fill="none"
                stroke="#63D4A3"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={curvePoints
                  .map((pt, i) => {
                    const x = 32 + (i / Math.max(1, curvePoints.length - 1)) * 176;
                    const y = 76 - ((Math.max(1, Math.min(5, pt.score)) - 1) / 4) * 64;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')}
              />
              {curvePoints.map((pt, i) => {
                const x = 32 + (i / Math.max(1, curvePoints.length - 1)) * 176;
                const y = 76 - ((Math.max(1, Math.min(5, pt.score)) - 1) / 4) * 64;
                return (
                  <circle
                    key={`m-${pt.dateISO}`}
                    cx={x}
                    cy={y}
                    r="3.2"
                    fill="#181C1B"
                    stroke="#63D4A3"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            {/* Footer caption */}
            <p className="mt-1.5 text-center font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
              {mindBodyMetric === 'sleep'
                ? `Average sleep ${summary.avgSleep.toFixed(1)}h/night · Over ${rangeDays} days`
                : `Average ${summary.avgSteps.toLocaleString()} steps/day · Over ${rangeDays} days`}
            </p>
          </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </WearScrollColumn>
    </div>
  );
};
