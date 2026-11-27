import React from 'react';
import { Footprints, Plus } from 'lucide-react';
import { DailyBiometricDay } from '../../types';
import { CurvedEdgeArc, CurvedTimeText, MicroRollNumber } from '../watch/WearPrimitives';
import { ExpressiveButton } from '../watch/ExpressiveControls';

interface StepCounterTileProps {
  timeText: string;
  steps: number;
  goal?: number;
  dailyBiometrics?: DailyBiometricDay[];
  onAddSteps: (delta: number) => void;
  onHaptic: (color?: string) => void;
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const StepCounterTile: React.FC<StepCounterTileProps> = ({
  timeText,
  steps,
  goal = 10000,
  dailyBiometrics = [],
  onAddSteps,
  onHaptic,
}) => {
  const progress = Math.min(1, Math.max(0, steps / Math.max(1, goal)));
  const pct = Math.round((steps / Math.max(1, goal)) * 100);
  const goalReached = steps >= goal;
  const miles = (steps * 0.00047).toFixed(1);
  const kcal = Math.round(steps * 0.04);
  const activeMin = Math.round(steps / 115);

  // Authentic Google Health / Fitbit Wear OS 5 Steps Cyan-Teal palette
  const accent = goalReached ? '#7CE8B9' : '#4FD8EB';
  const trackColor = '#152528';
  const formattedSteps = steps.toLocaleString();

  // Last 7 days mini activity bars (Google Health weekly rhythm strip)
  const last7 = dailyBiometrics.slice(-7);
  const barDays =
    last7.length > 0
      ? last7.map((d, idx) => {
          const dt = new Date(`${d.dateISO}T12:00:00`);
          const isToday = idx === last7.length - 1;
          const val = isToday ? steps : d.steps ?? 6500;
          return {
            key: d.dateISO,
            initial: DAY_INITIALS[dt.getDay()] || '·',
            value: val,
            isToday,
          };
        })
      : [
          { key: 'd1', initial: 'M', value: 6800, isToday: false },
          { key: 'd2', initial: 'T', value: 8400, isToday: false },
          { key: 'd3', initial: 'W', value: 5900, isToday: false },
          { key: 'd4', initial: 'T', value: 9200, isToday: false },
          { key: 'd5', initial: 'F', value: 7800, isToday: false },
          { key: 'd6', initial: 'S', value: 10400, isToday: false },
          { key: 'd7', initial: 'S', value: steps, isToday: true },
        ];

  const maxBarSteps = Math.max(goal, ...barDays.map((b) => b.value));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between bg-[#000000] px-11 pb-[34px] pt-[46px] text-center">
      {/* Subtle Google Health OLED top ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-6 h-[160px] rounded-full blur-2xl"
        style={{
          background: goalReached
            ? 'radial-gradient(circle, rgba(124,232,185,0.16) 0%, rgba(0,0,0,0) 72%)'
            : 'radial-gradient(circle, rgba(79,216,235,0.14) 0%, rgba(0,0,0,0) 72%)',
        }}
      />

      {/* Signature Google Health 276° Open Horseshoe Perimeter Progress Gauge */}
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
      <CurvedTimeText timeText={timeText} label="Steps" />

      {/* Top Google Health Activity Emblem */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: goalReached ? '#112E24' : '#0E2429',
            color: accent,
          }}
        >
          <Footprints className="h-[18px] w-[18px] stroke-[2.2]" />
        </div>
      </div>

      {/* Center Material 3 Hero Metric + Unboxed Google Health Metadata */}
      <div className="relative z-10 -mt-1 flex flex-col items-center">
        <div
          className={`font-bold leading-[0.92] tracking-[-0.045em] text-white tabular-nums ${
            formattedSteps.length >= 6 ? 'text-[52px]' : 'text-[60px]'
          }`}
        >
          <MicroRollNumber value={formattedSteps} />
        </div>

        <p className="mt-1.5 text-[12px] font-medium text-[#A4B1B3] tabular-nums">
          <span className="font-semibold" style={{ color: accent }}>
            {`${pct}%`}
          </span>
          <span aria-hidden="true" className="mx-1.5 text-[#525E60]">
            ·
          </span>
          <span>{`of ${goal.toLocaleString()} goal`}</span>
        </p>

        <p className="mt-0.5 font-mono text-[10.5px] text-[#7D8A8C] tabular-nums">
          {`${miles} mi · ${kcal} kcal · ${activeMin} min`}
        </p>

        {/* Google Health 7-Day Mini Step Bars */}
        <div className="relative mt-3.5 w-[182px]">
          {/* Subtle goal reference hairline */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#4FD8EB]/25"
            style={{ bottom: `${Math.round((goal / maxBarSteps) * 28) + 14}px` }}
          />
          <div className="grid grid-cols-7 items-end gap-2">
            {barDays.map((bar) => {
              const barHeight = Math.max(4, Math.round((bar.value / maxBarSteps) * 28));
              const metGoal = bar.value >= goal;
              return (
                <div key={bar.key} className="flex flex-col items-center gap-1">
                  <div className="flex h-[28px] items-end">
                    <span
                      className="w-[7px] rounded-full transition-all duration-300"
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: bar.isToday
                          ? accent
                          : metGoal
                          ? 'rgba(79,216,235,0.52)'
                          : '#243538',
                      }}
                    />
                  </div>
                  <span
                    className={`font-mono text-[8.5px] leading-none ${
                      bar.isToday ? 'font-bold text-white' : 'text-[#6A7678]'
                    }`}
                  >
                    {bar.initial}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Material 3 Expressive Tonal Action Pill Nestled in the 6 O'Clock Horseshoe Opening */}
      <div className="relative z-10 flex items-center justify-center">
        <ExpressiveButton
          size="sm"
          surfaceColor={goalReached ? '#133025' : '#11272C'}
          accentColor={accent}
          borderColor="transparent"
          leadingIcon={<Plus className="h-3.5 w-3.5 stroke-[2.4]" />}
          onClick={() => {
            onHaptic(accent);
            onAddSteps(250);
          }}
          aria-label="Add 250 steps"
        >
          250 steps
        </ExpressiveButton>
      </div>
    </div>
  );
};
