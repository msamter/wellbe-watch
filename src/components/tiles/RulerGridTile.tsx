import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryLow,
  Check,
  CircleDashed,
  CircleDot,
  Droplet,
  Heart,
  Meh,
  Moon,
  ShieldAlert,
  Smile,
  Sparkle,
  Sun,
  Target,
  Waves,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  EmotionIconKey,
  MoodEntry,
  RULER_EMOTIONS_16,
  RULER_THEMES,
  RulerQuadrant,
} from '../../types';
import { CurvedTimeText } from '../watch/WearPrimitives';

interface RulerGridTileProps {
  timeText: string;
  preselectedTags: string[];
  onLogMood: (quadrant: RulerQuadrant, emotion: string, tags: string[]) => MoodEntry;
  onLaunchPanic: () => void;
  onLaunchProtocol: (protocolId: string) => void;
  onSubViewChange?: (active: boolean) => void;
  onHaptic: (color?: string) => void;
  backSignal?: number;
}

const EMOTION_ICONS: Record<EmotionIconKey, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  smile: Smile,
  zap: Zap,
  sparkle: Sparkle,
  heart: Heart,
  waves: Waves,
  'circle-dot': CircleDot,
  moon: Moon,
  meh: Meh,
  'battery-low': BatteryLow,
  droplet: Droplet,
  'circle-dashed': CircleDashed,
  activity: Activity,
  'alert-triangle': AlertTriangle,
  'x-circle': XCircle,
  target: Target,
};

const CENTER = 206;
const OUTER_CIRCLE_SIZE = 80;
const OUTER_RING_RADIUS = 161.5;
const INNER_CIRCLE_SIZE = 94;
const INNER_RING_RADIUS = 69;

function getCirclePosition(angleDeg: number, ringRadius: number, size: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const cx = CENTER + ringRadius * Math.cos(rad);
  const cy = CENTER + ringRadius * Math.sin(rad);
  return {
    left: cx - size / 2,
    top: cy - size / 2,
  };
}

export const RulerGridTile: React.FC<RulerGridTileProps> = ({
  timeText,
  preselectedTags,
  onLogMood,
  onLaunchPanic,
  onLaunchProtocol,
  onSubViewChange,
  onHaptic,
  backSignal = 0,
}) => {
  const [loggedEntry, setLoggedEntry] = useState<MoodEntry | null>(null);
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number; color: string; seq: number } | null>(null);

  useEffect(() => {
    onSubViewChange?.(Boolean(loggedEntry));
  }, [loggedEntry, onSubViewChange]);

  useEffect(() => {
    if (backSignal > 0) {
      setLoggedEntry(null);
    }
  }, [backSignal]);

  // Auto-dismiss confirmation sheet after 4.5s unless user interacts
  useEffect(() => {
    if (!loggedEntry) return;
    const t = window.setTimeout(() => {
      setLoggedEntry(null);
    }, 4500);
    return () => window.clearTimeout(t);
  }, [loggedEntry]);

  const handleDirectSelect = (
    quadrant: RulerQuadrant,
    emotion: string,
    ripplePos?: { x: number; y: number }
  ) => {
    const theme = RULER_THEMES[quadrant];
    onHaptic(theme.accent);
    if (ripplePos) {
      setTapRipple({ x: ripplePos.x, y: ripplePos.y, color: theme.accent, seq: Date.now() });
    }
    const saved = onLogMood(quadrant, emotion, preselectedTags);
    setLoggedEntry(saved);
  };

  // Instant Save Confirmation Overlay — full circular screen lights up in emotion's color
  if (loggedEntry) {
    const theme = RULER_THEMES[loggedEntry.quadrant];
    const matchedDef = RULER_EMOTIONS_16.find((e) => e.emotion === loggedEntry.emotion);
    const LoggedIcon = matchedDef ? EMOTION_ICONS[matchedDef.icon] : Check;
    const isRed = loggedEntry.quadrant === 'red';
    const isBlue = loggedEntry.quadrant === 'blue';

    return (
      <div
        className="animate-radial-reveal relative flex h-full w-full flex-col items-center justify-center px-9 text-center transition-colors duration-200"
        style={{
          background: `radial-gradient(circle at 50% 44%, ${theme.accent}52 0%, ${theme.surface} 58%, #101413 100%)`,
          boxShadow: `inset 0 0 70px ${theme.accent}42`,
        }}
      >
        <CurvedTimeText timeText={timeText} label="Logged" />

        {/* Illuminated perimeter bezel glow + 180ms color-matched haptic pulse ring */}
        <div
          className="pointer-events-none absolute inset-2 rounded-full border-2 opacity-65"
          style={{
            borderColor: theme.accent,
            boxShadow: `0 0 28px ${theme.accent}66, inset 0 0 24px ${theme.accent}33`,
          }}
        />
        <div
          className="animate-haptic-ring pointer-events-none absolute inset-4 rounded-full border-2"
          style={{ borderColor: theme.accent }}
        />

        {tapRipple && (
          <div
            key={tapRipple.seq}
            className="animate-tap-ripple pointer-events-none absolute h-24 w-24 rounded-full border-2"
            style={{
              left: `${tapRipple.x - 48}px`,
              top: `${tapRipple.y - 48}px`,
              borderColor: tapRipple.color,
              backgroundColor: `${tapRipple.color}30`,
            }}
          />
        )}

        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: theme.accent, opacity: 0.9 }}
        >
          Logged in 1 Tap
        </p>

        {/* Emotion Icon Next to Emotion Name */}
        <div
          className="mt-2.5 flex items-center justify-center gap-2.5"
          style={{ color: theme.accent }}
        >
          <LoggedIcon className="h-7 w-7 shrink-0 stroke-[2.2]" />
          <h3 className="text-[26px] font-bold tracking-tight leading-none text-[#F4F6F5]">
            {loggedEntry.emotion}
          </h3>
        </div>

        <p className="mt-2.5 font-mono text-[11.5px] text-[#E5E9E7]/90 tabular-nums">
          {`${loggedEntry.hrAtLog} bpm · HRV ${loggedEntry.hrvAtLog}ms`}
        </p>

        {/* Adaptive Suggestion CTA (Red/Blue only) + Done */}
        <div className="mt-5 flex w-full max-w-[236px] flex-col items-center gap-2">
          {isRed && (
            <button
              type="button"
              onClick={() => {
                onHaptic();
                setLoggedEntry(null);
                onLaunchPanic();
              }}
              className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full border border-[#E89B8C]/70 bg-[#1B1211]/85 px-4 text-[12px] font-bold text-[#F4F6F5] backdrop-blur-sm transition-transform hover:bg-[#2A1917] active:scale-95"
            >
              <ShieldAlert className="h-4 w-4 text-[#E89B8C]" />
              <span>Voice Panic Anchor</span>
            </button>
          )}

          {isBlue && (
            <button
              type="button"
              onClick={() => {
                onHaptic();
                setLoggedEntry(null);
                onLaunchProtocol('body-drop');
              }}
              className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full border border-[#93BBE0]/65 bg-[#121A22]/85 px-4 text-[12px] font-semibold text-[#F4F6F5] backdrop-blur-sm transition-transform hover:bg-[#192531] active:scale-95"
            >
              <span>Try Somatic Body Drop</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onHaptic();
              setLoggedEntry(null);
            }}
            className="min-h-[38px] min-w-[116px] rounded-full border px-6 text-[12.5px] font-semibold text-[#F4F6F5] backdrop-blur-sm transition-transform active:scale-95"
            style={{
              backgroundColor: 'rgba(18, 21, 20, 0.58)',
              borderColor: theme.border,
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Primary Circular 16-Emotion Watch Face — Full-Bleed Enlarged Bubbles with No Center Hub
  return (
    <div className="relative h-full w-full bg-[#101312]">
      {/* Subtle Grey-Scale Quadrant Hairlines & Concentric Ring Guide */}
      <div className="pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-[#232826]" />
      <div className="pointer-events-none absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-[#232826]" />
      <div
        className="pointer-events-none absolute rounded-full border border-[#232826]/75"
        style={{
          left: `${CENTER - 119}px`,
          top: `${CENTER - 119}px`,
          width: '238px',
          height: '238px',
        }}
      />

      {/* 16 Enlarged Circular Emotion Buttons (12 Outer 80px + 4 Inner 94px filling the center space) */}
      {RULER_EMOTIONS_16.map((item) => {
        const theme = RULER_THEMES[item.quadrant];
        const Icon = EMOTION_ICONS[item.icon];
        const isInner = item.ring === 'inner';
        const circleSize = isInner ? INNER_CIRCLE_SIZE : OUTER_CIRCLE_SIZE;
        const ringRadius = isInner ? INNER_RING_RADIUS : OUTER_RING_RADIUS;
        const pos = getCirclePosition(item.angleDeg, ringRadius, circleSize);

        return (
          <button
            key={item.emotion}
            type="button"
            title={`${item.emotion} (${theme.name}: ${theme.energyLabel} · ${theme.valenceLabel})`}
            onClick={() =>
              handleDirectSelect(item.quadrant, item.emotion, {
                x: pos.left + circleSize / 2,
                y: pos.top + circleSize / 2,
              })
            }
            style={{
              left: `${pos.left}px`,
              top: `${pos.top}px`,
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              background: `linear-gradient(155deg, ${theme.surface} 0%, #1C201F 145%)`,
              borderColor: theme.border,
              color: theme.accent,
            }}
            className="wear-press group absolute flex flex-col items-center justify-center gap-[5px] rounded-full border px-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:z-10 hover:scale-[1.05] hover:brightness-115 active:scale-[0.93]"
          >
            <Icon
              className={
                isInner
                  ? 'h-[21px] w-[21px] shrink-0 stroke-[1.85]'
                  : 'h-[18px] w-[18px] shrink-0 stroke-[1.8]'
              }
            />
            <span
              className={
                isInner
                  ? 'max-w-full truncate text-[11.5px] font-semibold leading-none tracking-[-0.015em]'
                  : 'max-w-full truncate text-[10.5px] font-semibold leading-none tracking-[-0.015em]'
              }
            >
              {item.emotion}
            </span>
          </button>
        );
      })}
    </div>
  );
};
