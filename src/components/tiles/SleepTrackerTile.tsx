import React from 'react';
import { Minus, Moon, Plus } from 'lucide-react';
import { CurvedEdgeArc, CurvedTimeText, MicroRollNumber } from '../watch/WearPrimitives';
import { ExpressiveButton } from '../watch/ExpressiveControls';

interface SleepTrackerTileProps {
  timeText: string;
  sleepHours: number;
  deepPct?: number;
  remPct?: number;
  goalHours?: number;
  onUpdateSleep: (hours: number) => void;
  onHaptic: (color?: string) => void;
}

function formatClockMinutes(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const suffix = h24 >= 12 ? 'p' : 'a';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

export const SleepTrackerTile: React.FC<SleepTrackerTileProps> = ({
  timeText,
  sleepHours,
  deepPct = 21,
  remPct = 24,
  goalHours = 8.0,
  onUpdateSleep,
  onHaptic,
}) => {
  const clampedHours = Math.max(3, Math.min(11, sleepHours));
  const totalMins = Math.round(clampedHours * 60);
  const wholeHours = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;

  const progress = Math.min(1, Math.max(0.05, clampedHours / Math.max(1, goalHours)));
  const goalMet = clampedHours >= goalHours;

  // Derive realistic Google Health sleep score & stage breakdown from current sleep duration
  const awakePct = clampedHours < 6.0 ? 8 : clampedHours < 7.0 ? 6 : 4;
  const adjDeepPct = Math.max(12, Math.min(30, Math.round(deepPct + (clampedHours - 7.4) * 2)));
  const adjRemPct = Math.max(15, Math.min(32, Math.round(remPct + (clampedHours - 7.4) * 1.5)));
  const lightPct = Math.max(25, 100 - adjDeepPct - adjRemPct - awakePct);

  const durationScore = Math.min(55, (clampedHours / goalHours) * 55);
  const qualityScore = Math.min(40, (adjDeepPct + adjRemPct) * 0.85);
  const sleepScore = Math.max(48, Math.min(98, Math.round(durationScore + qualityScore)));

  // Anchored gentle wake time ~6:40 AM -> compute bedtime window
  const wakeMinutes = 6 * 60 + 40;
  const bedMinutes = wakeMinutes - totalMins;
  const sleepWindow = `${formatClockMinutes(bedMinutes)} – ${formatClockMinutes(wakeMinutes)}`;

  // Authentic Google Health / Fitbit Wear OS 5 Sleep Periwinkle & Indigo palette
  const accent = '#A8C7FA';
  const deepColor = '#5B7FFF';
  const remColor = '#A8C7FA';
  const lightColor = '#7C89C9';
  const awakeColor = '#E89B8C';
  const trackColor = '#171F33';

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between bg-[#000000] px-11 pb-[34px] pt-[46px] text-center">
      {/* Subtle Google Health Midnight Indigo top ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-6 h-[160px] rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(168,199,250,0.14) 0%, rgba(91,127,255,0.06) 44%, rgba(0,0,0,0) 74%)',
        }}
      />

      {/* Signature Google Health 276° Open Horseshoe Sleep Goal Gauge */}
      <CurvedEdgeArc
        startAngle={-138}
        endAngle={138}
        progress={progress}
        radius={190}
        strokeWidth={10}
        color={accent}
        trackColor={trackColor}
      />

      {/* Top Curved Wear OS Time & Tile Title */}
      <CurvedTimeText timeText={timeText} label="Sleep" />

      {/* Top Google Health Sleep Moon Emblem */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141D31] text-[#A8C7FA]">
          <Moon className="h-[18px] w-[18px] stroke-[2.2]" />
        </div>
      </div>

      {/* Center Material 3 Hero Sleep Duration + Google Health Sleep Stages Bar */}
      <div className="relative z-10 -mt-1 flex flex-col items-center">
        <div className="flex items-baseline justify-center font-bold leading-[0.92] tracking-[-0.04em] text-white tabular-nums">
          <MicroRollNumber value={wholeHours} className="text-[54px]" />
          <span className="ml-0.5 mr-2 text-[24px] font-semibold text-[#94A7CB]">h</span>
          <MicroRollNumber
            value={String(remMins).padStart(2, '0')}
            className="text-[54px]"
          />
          <span className="ml-0.5 text-[24px] font-semibold text-[#94A7CB]">m</span>
        </div>

        {/* Clean Unboxed Sleep Score & Bedtime Window */}
        <p className="mt-1.5 text-[12px] font-medium text-[#A4B0C4] tabular-nums">
          <span className="font-semibold text-[#A8C7FA]">{`${sleepScore} score`}</span>
          <span aria-hidden="true" className="mx-1.5 text-[#4E5A70]">
            ·
          </span>
          <span>{sleepWindow}</span>
        </p>

        <p className="mt-0.5 font-mono text-[10px] text-[#78849B] tabular-nums">
          {goalMet ? `Goal reached · ${goalHours.toFixed(0)}h target` : `${goalHours.toFixed(0)}h sleep goal`}
        </p>

        {/* Authentic Google Health 4-Stage Sleep Distribution Bar */}
        <div className="mt-3.5 w-[204px]">
          <div
            className="flex h-[8px] w-full overflow-hidden rounded-full bg-[#171F33] gap-[2px]"
            role="img"
            aria-label={`Sleep stages: Deep ${adjDeepPct}%, REM ${adjRemPct}%, Light ${lightPct}%, Awake ${awakePct}%`}
          >
            <span
              className="h-full rounded-l-full transition-all duration-300"
              style={{ width: `${adjDeepPct}%`, backgroundColor: deepColor }}
            />
            <span
              className="h-full transition-all duration-300"
              style={{ width: `${adjRemPct}%`, backgroundColor: remColor }}
            />
            <span
              className="h-full transition-all duration-300"
              style={{ width: `${lightPct}%`, backgroundColor: lightColor }}
            />
            <span
              className="h-full rounded-r-full transition-all duration-300"
              style={{ width: `${awakePct}%`, backgroundColor: awakeColor }}
            />
          </div>

          {/* Unboxed Inline Stage Legend */}
          <div className="mt-2 flex items-center justify-center gap-2.5 font-mono text-[9.5px] text-[#9AA6BC] tabular-nums">
            <span className="inline-flex items-center gap-1">
              <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: deepColor }} />
              {`Deep ${adjDeepPct}%`}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: remColor }} />
              {`REM ${adjRemPct}%`}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: lightColor }} />
              {`Light ${lightPct}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Material 3 Expressive Tonal Quick-Adjust Pills Nestled in the 6 O'Clock Horseshoe Opening */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        <ExpressiveButton
          size="sm"
          surfaceColor="#141D31"
          accentColor="#A8C7FA"
          borderColor="transparent"
          leadingIcon={<Minus className="h-3 w-3 stroke-[2.4]" />}
          onClick={() => {
            onHaptic(accent);
            onUpdateSleep(clampedHours - 0.25);
          }}
          disabled={clampedHours <= 3.0}
          aria-label="Subtract 15 minutes of sleep"
        >
          15m
        </ExpressiveButton>
        <ExpressiveButton
          size="sm"
          surfaceColor="#141D31"
          accentColor="#A8C7FA"
          borderColor="transparent"
          leadingIcon={<Plus className="h-3 w-3 stroke-[2.4]" />}
          onClick={() => {
            onHaptic(accent);
            onUpdateSleep(clampedHours + 0.25);
          }}
          disabled={clampedHours >= 11.0}
          aria-label="Add 15 minutes of sleep"
        >
          15m
        </ExpressiveButton>
      </div>
    </div>
  );
};
