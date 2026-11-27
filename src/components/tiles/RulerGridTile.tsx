import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
import { m3Springs } from '../../styles/m3Tokens';
import { ExpressiveButton } from '../watch/ExpressiveControls';
import { CurvedTimeText } from '../watch/WearPrimitives';
import {
  EmotionPersonalityHero,
  LiveLogEntryPreview,
} from '../watch/EmotionPersonality';

interface RulerGridTileProps {
  timeText: string;
  preselectedTags: string[];
  latestEmotion?: string;
  onLogMood: (quadrant: RulerQuadrant, emotion: string, tags: string[]) => MoodEntry;
  onLaunchPanic: () => void;
  onLaunchProtocol: (protocolId: string) => void;
  onOpenMoodLog?: () => void;
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

const SELECTED_EMOTION_STYLES: Record<
  RulerQuadrant,
  { fill: string; border: string; glow: string; ink: string }
> = {
  yellow: {
    fill: '#EAC463',
    border: '#F5DA8D',
    glow: '#EAC463',
    ink: '#1A1508',
  },
  green: {
    fill: '#7BD7A8',
    border: '#A7E8C6',
    glow: '#7BD7A8',
    ink: '#0C1C14',
  },
  blue: {
    fill: '#7FB3E3',
    border: '#ABD0F1',
    glow: '#7FB3E3',
    ink: '#0D1924',
  },
  red: {
    fill: '#EA9586',
    border: '#F5B8AD',
    glow: '#EA9586',
    ink: '#22100D',
  },
};

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
  latestEmotion,
  onLogMood,
  onLaunchPanic,
  onLaunchProtocol,
  onOpenMoodLog,
  onSubViewChange,
  onHaptic,
  backSignal = 0,
}) => {
  const [loggedEntry, setLoggedEntry] = useState<MoodEntry | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number; color: string; seq: number } | null>(null);
  const selectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onSubViewChange?.(Boolean(loggedEntry));
  }, [loggedEntry, onSubViewChange]);

  useEffect(() => {
    if (backSignal > 0) {
      setLoggedEntry(null);
      setSelectedEmotion(null);
    }
  }, [backSignal]);

  useEffect(() => {
    return () => {
      if (selectTimerRef.current) window.clearTimeout(selectTimerRef.current);
    };
  }, []);

  // Auto-dismiss confirmation sheet after 6.2s unless user interacts
  useEffect(() => {
    if (!loggedEntry) return;
    const t = window.setTimeout(() => {
      setLoggedEntry(null);
    }, 6200);
    return () => window.clearTimeout(t);
  }, [loggedEntry]);

  const handleDirectSelect = (
    quadrant: RulerQuadrant,
    emotion: string,
    ripplePos?: { x: number; y: number }
  ) => {
    if (selectedEmotion) return;

    const theme = RULER_THEMES[quadrant];
    onHaptic(theme.accent);
    setSelectedEmotion(emotion);
    if (ripplePos) {
      setTapRipple({ x: ripplePos.x, y: ripplePos.y, color: theme.accent, seq: Date.now() });
    }

    const saved = onLogMood(quadrant, emotion, preselectedTags);

    // Let the selected emotion button vividly glow in its color before switching to the Logged screen
    if (selectTimerRef.current) window.clearTimeout(selectTimerRef.current);
    selectTimerRef.current = window.setTimeout(() => {
      setSelectedEmotion(null);
      setLoggedEntry(saved);
    }, 280);
  };

  // Instant Save Confirmation Overlay — personality-driven animation based on emotion color
  if (loggedEntry) {
    const theme = RULER_THEMES[loggedEntry.quadrant];
    const matchedDef = RULER_EMOTIONS_16.find((e) => e.emotion === loggedEntry.emotion);
    const LoggedIcon = matchedDef ? EMOTION_ICONS[matchedDef.icon] : Check;
    const isRed = loggedEntry.quadrant === 'red';
    const isBlue = loggedEntry.quadrant === 'blue';

    return (
      <div
        key={`logged-${loggedEntry.id}`}
        className="animate-radial-reveal relative flex h-full w-full flex-col items-center justify-center px-8 text-center transition-colors duration-200"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${theme.accent}52 0%, ${theme.surface} 58%, #101413 100%)`,
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

        {/* Personality-Animated Emotion Emblem & Bouncing Emotion Name */}
        <div className="mt-3">
          <EmotionPersonalityHero
            quadrant={loggedEntry.quadrant}
            emotion={loggedEntry.emotion}
            Icon={LoggedIcon}
          />
        </div>

        <p className="mt-1.5 font-mono text-[10.5px] text-[#E5E9E7]/85 tabular-nums">
          {`${loggedEntry.hrAtLog} bpm · HRV ${loggedEntry.hrvAtLog}ms`}
        </p>

        {/* Live Emotion Log Arrival Row — Emotion Name Animates as It's Logged */}
        <LiveLogEntryPreview
          quadrant={loggedEntry.quadrant}
          emotion={loggedEntry.emotion}
          onOpenLog={() => {
            onHaptic(theme.accent);
            setLoggedEntry(null);
            onOpenMoodLog?.();
          }}
        />

        {/* Adaptive Suggestion CTA (Red/Blue only) + Done */}
        <div className="mt-2.5 flex w-full max-w-[238px] flex-col items-center gap-1.5">
          {isRed && (
            <ExpressiveButton
              variant="danger"
              size="sm"
              fullWidth
              surfaceColor="rgba(27, 18, 17, 0.85)"
              borderColor="rgba(232, 155, 140, 0.7)"
              accentColor="#F4F6F5"
              leadingIcon={<ShieldAlert className="h-3.5 w-3.5 text-[#E89B8C]" />}
              onClick={() => {
                onHaptic();
                setLoggedEntry(null);
                onLaunchPanic();
              }}
              className="min-h-[38px] font-bold backdrop-blur-sm"
            >
              Voice Panic Anchor
            </ExpressiveButton>
          )}

          {isBlue && (
            <ExpressiveButton
              variant="blue"
              size="sm"
              fullWidth
              surfaceColor="rgba(18, 26, 34, 0.85)"
              borderColor="rgba(147, 187, 224, 0.65)"
              accentColor="#F4F6F5"
              onClick={() => {
                onHaptic();
                setLoggedEntry(null);
                onLaunchProtocol('body-drop');
              }}
              className="min-h-[38px] backdrop-blur-sm"
            >
              Try Somatic Body Drop
            </ExpressiveButton>
          )}

          <ExpressiveButton
            variant="outlined"
            size="sm"
            surfaceColor="rgba(18, 21, 20, 0.58)"
            borderColor={theme.border}
            accentColor="#F4F6F5"
            onClick={() => {
              onHaptic();
              setLoggedEntry(null);
            }}
            className="min-w-[108px] px-5 backdrop-blur-sm"
          >
            Done
          </ExpressiveButton>
        </div>
      </div>
    );
  }

  // Primary Circular 16-Emotion Watch Face — Full-Bleed Enlarged Bubbles with Color-Matched Selection Glow
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
        const selectedStyle = SELECTED_EMOTION_STYLES[item.quadrant];
        const Icon = EMOTION_ICONS[item.icon];
        const isInner = item.ring === 'inner';
        const circleSize = isInner ? INNER_CIRCLE_SIZE : OUTER_CIRCLE_SIZE;
        const ringRadius = isInner ? INNER_RING_RADIUS : OUTER_RING_RADIUS;
        const pos = getCirclePosition(item.angleDeg, ringRadius, circleSize);
        const isSelected = selectedEmotion === item.emotion;
        const isDimmed = Boolean(selectedEmotion && !isSelected);
        const isRecent = !selectedEmotion && latestEmotion === item.emotion;
        const isActive = isSelected || isRecent;

        return (
          <motion.button
            key={item.emotion}
            type="button"
            title={`${item.emotion} (${theme.name}: ${theme.energyLabel} · ${theme.valenceLabel})`}
            onClick={() =>
              handleDirectSelect(item.quadrant, item.emotion, {
                x: pos.left + circleSize / 2,
                y: pos.top + circleSize / 2,
              })
            }
            animate={{
              scale: isSelected ? 1.09 : isDimmed ? 0.94 : 1,
              opacity: isDimmed ? 0.44 : 1,
              borderColor: isActive ? selectedStyle.border : theme.border,
              boxShadow: isSelected
                ? `0 0 8px ${selectedStyle.glow}E0, 0 0 18px ${selectedStyle.glow}A6, 0 0 30px ${selectedStyle.glow}52`
                : isRecent
                ? `0 0 6px ${selectedStyle.glow}BA, 0 0 15px ${selectedStyle.glow}80, 0 0 26px ${selectedStyle.glow}3D`
                : 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            whileHover={
              selectedEmotion
                ? undefined
                : isRecent
                ? {
                    scale: 1.06,
                    borderColor: selectedStyle.border,
                    boxShadow: `0 0 8px ${selectedStyle.glow}D4, 0 0 18px ${selectedStyle.glow}99, 0 0 28px ${selectedStyle.glow}4A`,
                  }
                : {
                    scale: 1.07,
                    borderColor: theme.accent,
                    boxShadow: `0 0 20px ${theme.accent}88, inset 0 0 14px ${theme.accent}3D`,
                  }
            }
            whileTap={{
              scale: 0.94,
              borderColor: selectedStyle.border,
              boxShadow: `0 0 8px ${selectedStyle.glow}D9, 0 0 18px ${selectedStyle.glow}99, 0 0 28px ${selectedStyle.glow}4A`,
            }}
            transition={m3Springs.fastSpatial}
            style={{
              left: `${pos.left}px`,
              top: `${pos.top}px`,
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              zIndex: isSelected ? 30 : isRecent ? 12 : 1,
              background: isActive
                ? selectedStyle.fill
                : `linear-gradient(155deg, ${theme.surface} 0%, #1C201F 145%)`,
              color: isActive ? selectedStyle.ink : theme.accent,
            }}
            className="group absolute flex flex-col items-center justify-center gap-[5px] rounded-full border px-1.5 text-center hover:z-20 focus-visible:z-20 focus-visible:outline-none"
          >
            {/* Expanding Color Halo Ring on Selection */}
            {isSelected && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-full border-2"
                style={{
                  borderColor: selectedStyle.border,
                  boxShadow: `0 0 16px ${selectedStyle.glow}`,
                }}
                initial={{ scale: 0.92, opacity: 0.9 }}
                animate={{ scale: 1.28, opacity: 0 }}
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              />
            )}

            <Icon
              className={
                isInner
                  ? 'relative z-10 h-[21px] w-[21px] shrink-0 stroke-[1.9]'
                  : 'relative z-10 h-[18px] w-[18px] shrink-0 stroke-[1.85]'
              }
            />
            <span
              className={
                isInner
                  ? 'relative z-10 max-w-full truncate text-[11.5px] font-semibold leading-none tracking-[-0.015em]'
                  : 'relative z-10 max-w-full truncate text-[10.5px] font-semibold leading-none tracking-[-0.015em]'
              }
            >
              {item.emotion}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
