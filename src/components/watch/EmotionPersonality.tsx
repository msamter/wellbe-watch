import React from 'react';
import { motion } from 'motion/react';
import { RULER_THEMES, RulerQuadrant } from '../../types';
import { m3Shapes, m3Springs } from '../../styles/m3Tokens';

interface EmotionPersonalityHeroProps {
  quadrant: RulerQuadrant;
  emotion: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const YELLOW_SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const BLUE_DROPLETS = [
  { x: -16, delay: 0, duration: 2.4, size: 5 },
  { x: 2, delay: 0.75, duration: 2.7, size: 6 },
  { x: 17, delay: 1.45, duration: 2.3, size: 4.5 },
];

/**
 * Shared per-letter bounce choreography tailored to all 4 RULER colors:
 * - Yellow (Excitable): Energetic trampoline double-hop with squash & stretch + playful tilt
 * - Red (Stressed): Sharp, high-tension rapid snap bounce with tight micro-jitter recoil
 * - Blue (Sad): Slow, weighted gravity drop with soft heavy cushion and minimal rebound
 * - Green (Calm): Smooth, buoyant water-ripple wave bounce with unhurried float
 */
function getLetterBounceSpec(quadrant: RulerQuadrant, idx: number, scaleFactor = 1) {
  const s = scaleFactor;

  if (quadrant === 'yellow') {
    return {
      initial: { opacity: 0, y: 16 * s, scaleX: 0.86, scaleY: 1.14, rotate: -7 },
      animate: {
        opacity: 1,
        y: [16 * s, -9 * s, 3 * s, -4.5 * s, 0],
        scaleX: [0.86, 0.9, 1.12, 0.96, 1],
        scaleY: [1.14, 1.18, 0.88, 1.07, 1],
        rotate: [-7, 6, -4, 2, 0],
      },
      transition: {
        duration: 0.68,
        delay: idx * 0.036,
        ease: [0.22, 1.35, 0.36, 1] as const,
      },
    };
  }

  if (quadrant === 'red') {
    return {
      initial: { opacity: 0, y: 9 * s, x: 0, scale: 0.88 },
      animate: {
        opacity: 1,
        y: [9 * s, -7.5 * s, 4 * s, -3 * s, 1.5 * s, 0],
        x: [0, -3.5 * s, 3.5 * s, -2.5 * s, 2 * s, -1 * s, 0],
        scale: [0.88, 1.15, 0.93, 1.07, 0.97, 1],
        rotate: [0, -4, 4, -2.5, 2, 0],
      },
      transition: {
        duration: 0.56,
        delay: idx * 0.022,
        ease: [0.3, 0.05, 0.2, 1] as const,
      },
    };
  }

  if (quadrant === 'blue') {
    return {
      initial: { opacity: 0, y: -11 * s, scaleY: 1.04, rotate: 0 },
      animate: {
        opacity: 1,
        y: [-11 * s, 6.5 * s, 2 * s, 4 * s, 0],
        scaleY: [1.04, 0.9, 0.98, 0.94, 1],
        scaleX: [0.97, 1.06, 0.99, 1.03, 1],
        rotate: [0, -3.5, -1.5, -2, 0],
      },
      transition: {
        duration: 1.05,
        delay: idx * 0.055,
        ease: [0.25, 0.85, 0.35, 1] as const,
      },
    };
  }

  // Green — Calm / Grounded: serene undulating buoyant ripple bounce
  return {
    initial: { opacity: 0, y: 9 * s, scale: 0.94 },
    animate: {
      opacity: 1,
      y: [9 * s, -5 * s, 2 * s, -1 * s, 0],
      scale: [0.94, 1.05, 0.98, 1.01, 1],
    },
    transition: {
      duration: 0.86,
      delay: idx * 0.048,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };
}

/**
 * Personality-driven emotion animation for the Emotion Logged confirmation screen:
 * - Yellow (Excitable): Bouncy squash-and-stretch hops, golden spark bursts, lively trampoline letter bounce.
 * - Blue (Sad): Slow heavy sigh / gentle droop, drifting misty droplets, weighted soft-sink letter bounce.
 * - Red (Stressed): Crisp micro-tremor jitter bursts, rapid tension pulse rings, snappy tense letter bounce.
 * - Green (Calm): Serene buoyant inhale/exhale float, breathing aura, gentle water-ripple letter bounce.
 */
export const EmotionPersonalityHero: React.FC<EmotionPersonalityHeroProps> = ({
  quadrant,
  emotion,
  Icon,
}) => {
  const theme = RULER_THEMES[quadrant];
  const letters = Array.from(emotion);

  const emblemMotion = (() => {
    if (quadrant === 'yellow') {
      return {
        initial: { scale: 0.45, y: 18, rotate: -14, opacity: 0 },
        animate: {
          opacity: 1,
          y: [0, -11, 2, -6, 0, 0],
          scaleX: [1, 0.9, 1.12, 0.95, 1.04, 1],
          scaleY: [1, 1.15, 0.88, 1.07, 0.97, 1],
          rotate: [0, -10, 9, -5, 3, 0],
        },
        transition: {
          opacity: { duration: 0.18 },
          duration: 1.35,
          repeat: Infinity,
          repeatDelay: 0.35,
          ease: 'easeInOut' as const,
        },
      };
    }

    if (quadrant === 'blue') {
      return {
        initial: { scale: 0.92, y: -10, opacity: 0 },
        animate: {
          opacity: [0.85, 1, 0.85],
          y: [-3, 6, 3, -3],
          rotate: [0, -6, -4, 0],
          scale: [1, 0.93, 0.96, 1],
        },
        transition: {
          duration: 3.4,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };
    }

    if (quadrant === 'red') {
      return {
        initial: { scale: 0.78, opacity: 0 },
        animate: {
          opacity: 1,
          x: [0, -3.5, 3.5, -3, 2.5, -1.5, 1, 0, 0, 0],
          y: [0, -1, 1, -1.5, 1, 0, 0, 0, 0, 0],
          rotate: [0, -4.5, 4.5, -3.5, 3, -1.5, 0, 0, 0, 0],
          scale: [1, 1.07, 0.96, 1.05, 0.98, 1.02, 1, 1, 1, 1],
        },
        transition: {
          opacity: { duration: 0.14 },
          duration: 1.15,
          repeat: Infinity,
          repeatDelay: 0.45,
          ease: 'easeInOut' as const,
        },
      };
    }

    // Green — Calm / Grounded
    return {
      initial: { scale: 0.75, opacity: 0 },
      animate: {
        opacity: 1,
        y: [0, -5, 0],
        scale: [0.97, 1.05, 0.97],
      },
      transition: {
        opacity: { duration: 0.25 },
        duration: 3.4,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    };
  })();

  // Subtle living secondary cadence on the whole emotion name after the entrance bounce lands
  const ambientNameBounce = (() => {
    if (quadrant === 'yellow') {
      return {
        animate: { y: [0, -3.5, 0.5, -1.5, 0] },
        transition: { duration: 1.15, delay: 0.85, repeat: Infinity, repeatDelay: 0.75, ease: 'easeInOut' as const },
      };
    }
    if (quadrant === 'red') {
      return {
        animate: { x: [0, -1.8, 1.8, -1.2, 1.2, 0], y: [0, -1, 0.5, 0] },
        transition: { duration: 0.55, delay: 0.85, repeat: Infinity, repeatDelay: 1.1, ease: 'easeInOut' as const },
      };
    }
    if (quadrant === 'blue') {
      return {
        animate: { y: [0, 2.5, 0] },
        transition: { duration: 3.2, delay: 1.1, repeat: Infinity, ease: 'easeInOut' as const },
      };
    }
    return {
      animate: { y: [0, -2.5, 0] },
      transition: { duration: 3.2, delay: 0.95, repeat: Infinity, ease: 'easeInOut' as const },
    };
  })();

  return (
    <div className="flex flex-col items-center">
      {/* Personality-Driven Animated Emblem Stage */}
      <div className="relative flex h-[68px] w-[108px] items-center justify-center">
        {/* YELLOW (Excitable): Radiating golden spark bursts + warm pop halo */}
        {quadrant === 'yellow' && (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute h-[62px] w-[62px] rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.accent}55 0%, ${theme.accent}00 72%)`,
              }}
              animate={{ scale: [0.95, 1.35, 1.02], opacity: [0.55, 0.95, 0.55] }}
              transition={{ duration: 1.35, repeat: Infinity, repeatDelay: 0.35, ease: 'easeOut' }}
            />
            {YELLOW_SPARK_ANGLES.map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const startR = 24;
              const endR = i % 2 === 0 ? 44 : 38;
              return (
                <motion.span
                  key={deg}
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    width: i % 2 === 0 ? 5 : 3.5,
                    height: i % 2 === 0 ? 5 : 3.5,
                    backgroundColor: theme.accent,
                    boxShadow: `0 0 8px ${theme.accent}`,
                  }}
                  initial={{ x: Math.cos(rad) * startR, y: Math.sin(rad) * startR, scale: 0, opacity: 0 }}
                  animate={{
                    x: [Math.cos(rad) * startR, Math.cos(rad) * endR],
                    y: [Math.sin(rad) * startR, Math.sin(rad) * endR],
                    scale: [0.2, 1.15, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.05,
                    delay: i * 0.045,
                    repeat: Infinity,
                    repeatDelay: 0.65,
                    ease: 'easeOut',
                  }}
                />
              );
            })}
          </>
        )}

        {/* BLUE (Sad): Soft falling droplets + quiet misty bottom ripple */}
        {quadrant === 'blue' && (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute h-[58px] w-[58px] rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.accent}35 0%, ${theme.accent}00 72%)`,
              }}
              animate={{ scale: [1.04, 0.9, 1.04], opacity: [0.45, 0.25, 0.45] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {BLUE_DROPLETS.map((drop, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: drop.size,
                  height: drop.size * 1.45,
                  borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
                  backgroundColor: theme.accent,
                  left: `calc(50% + ${drop.x}px)`,
                  top: '54%',
                }}
                initial={{ y: -4, opacity: 0, scale: 0.7 }}
                animate={{
                  y: [-2, 24],
                  opacity: [0, 0.72, 0],
                  scale: [0.75, 1, 0.6],
                }}
                transition={{
                  duration: drop.duration,
                  delay: drop.delay,
                  repeat: Infinity,
                  ease: 'easeIn',
                }}
              />
            ))}
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 h-[8px] w-[42px] rounded-full border"
              style={{ borderColor: `${theme.accent}66` }}
              animate={{ scaleX: [0.55, 1.25], opacity: [0.55, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
            />
          </>
        )}

        {/* RED (Stressed): Rapid concentric tension pulse rings + pressure aura */}
        {quadrant === 'red' && (
          <>
            {[0, 0.42].map((delay, idx) => (
              <motion.span
                key={idx}
                aria-hidden="true"
                className="pointer-events-none absolute h-[56px] w-[56px] rounded-full border-[1.75px]"
                style={{
                  borderColor: theme.accent,
                  boxShadow: `0 0 14px ${theme.accent}88`,
                }}
                initial={{ scale: 0.86, opacity: 0.8 }}
                animate={{ scale: [0.86, 1.42], opacity: [0.8, 0] }}
                transition={{
                  duration: 1.05,
                  delay,
                  repeat: Infinity,
                  repeatDelay: 0.55,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}

        {/* GREEN (Calm): Serene slow breathing halo */}
        {quadrant === 'green' && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute h-[62px] w-[62px] rounded-full border"
            style={{
              borderColor: `${theme.accent}70`,
              background: `radial-gradient(circle, ${theme.accent}30 0%, transparent 72%)`,
            }}
            animate={{ scale: [0.92, 1.22, 0.92], opacity: [0.45, 0.85, 0.45] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Core Glowing Emotion Badge */}
        <motion.div
          initial={emblemMotion.initial}
          animate={emblemMotion.animate}
          transition={emblemMotion.transition}
          className="relative z-10 flex h-[54px] w-[54px] items-center justify-center rounded-full border-2"
          style={{
            background: `radial-gradient(circle at 38% 30%, ${theme.accent}42 0%, ${theme.surface} 74%)`,
            borderColor: theme.accent,
            color: theme.accent,
            boxShadow: `0 0 24px ${theme.accent}85, inset 0 0 14px ${theme.accent}44`,
          }}
        >
          <Icon className="h-[26px] w-[26px] stroke-[2.2]" />
        </motion.div>
      </div>

      {/* Emotion Name with Distinct Yellow / Red / Blue / Green Bounce Personality */}
      <motion.h3
        animate={ambientNameBounce.animate}
        transition={ambientNameBounce.transition}
        className="mt-1.5 flex items-center justify-center text-[25px] font-bold leading-none tracking-tight text-[#F4F6F5]"
        style={{ textShadow: `0 0 18px ${theme.accent}66` }}
        aria-label={emotion}
      >
        {letters.map((ch, idx) => {
          const spec = getLetterBounceSpec(quadrant, idx, 1);
          return (
            <motion.span
              key={`${emotion}-${quadrant}-${idx}`}
              className="inline-block origin-bottom"
              initial={spec.initial}
              animate={spec.animate}
              transition={spec.transition}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          );
        })}
      </motion.h3>
    </div>
  );
};

interface AnimatedLogEmotionNameProps {
  emotion: string;
  quadrant: RulerQuadrant;
  isJustLogged: boolean;
  className?: string;
}

/**
 * UI Animation for the emotion name listed in the Emotion Log as it's logged:
 * - Bounces per-letter with yellow (excitable), red (stressed), blue (sad), or green (calm) personality
 * - Sweeps a luminous color-matched shimmer highlight across the name as it lands in the log
 * - Smoothly eases its glow bloom into crisp white OLED legibility
 */
export const AnimatedLogEmotionName: React.FC<AnimatedLogEmotionNameProps> = ({
  emotion,
  quadrant,
  isJustLogged,
  className = 'text-[12.5px] font-bold text-[#F4F6F5]',
}) => {
  const theme = RULER_THEMES[quadrant];

  if (!isJustLogged) {
    return <span className={`truncate ${className}`}>{emotion}</span>;
  }

  const letters = Array.from(emotion);

  return (
    <span
      className={`relative inline-flex items-center overflow-visible py-0.5 ${className}`}
      aria-label={emotion}
    >
      <span className="inline-flex items-center">
        {letters.map((ch, idx) => {
          const spec = getLetterBounceSpec(quadrant, idx, 0.62);
          return (
            <motion.span
              key={`${emotion}-log-${quadrant}-${idx}`}
              className="inline-block origin-bottom"
              initial={{
                ...spec.initial,
                color: theme.accent,
              }}
              animate={{
                ...spec.animate,
                color: [theme.accent, theme.accent, '#F4F6F5'],
                textShadow: [
                  `0 0 12px ${theme.accent}BB`,
                  `0 0 8px ${theme.accent}66`,
                  `0 0 0px ${theme.accent}00`,
                ],
              }}
              transition={{
                ...spec.transition,
                delay: 0.08 + spec.transition.delay,
                color: { duration: 1.45, delay: 0.1 + idx * 0.025, times: [0, 0.45, 1] },
                textShadow: { duration: 1.55, delay: 0.1 + idx * 0.025, times: [0, 0.45, 1] },
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          );
        })}
      </span>

      {/* Luminous color-matched shimmer highlight sweeping across the newly logged emotion name */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4px]">
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 -left-4 w-8 -skew-x-12"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${theme.accent}92 50%, transparent 100%)`,
          }}
          initial={{ x: '-140%', opacity: 0 }}
          animate={{ x: '440%', opacity: [0, 1, 0.9, 0] }}
          transition={{ duration: 0.85, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        />
      </span>
    </span>
  );
};

interface LiveLogEntryPreviewProps {
  quadrant: RulerQuadrant;
  emotion: string;
  onOpenLog?: () => void;
}

/**
 * Compact live Emotion Log row shown on the Logged screen as the emotion lands in the log.
 */
export const LiveLogEntryPreview: React.FC<LiveLogEntryPreviewProps> = ({
  quadrant,
  emotion,
  onOpenLog,
}) => {
  const theme = RULER_THEMES[quadrant];

  return (
    <motion.button
      type="button"
      onClick={onOpenLog}
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ ...m3Springs.defaultSpatial, delay: 0.16 }}
      className="relative mt-2.5 flex w-full max-w-[238px] items-center justify-between gap-2 overflow-hidden rounded-[16px] border px-3 py-1.5 text-left backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(18, 21, 20, 0.72)',
        borderColor: `${theme.accent}66`,
        boxShadow: `0 0 18px ${theme.accent}28`,
      }}
    >
      {/* Arrival shimmer sweep across the log card */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-16 -skew-x-12"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${theme.accent}2E 50%, transparent 100%)`,
        }}
        initial={{ x: '-120%' }}
        animate={{ x: '420%' }}
        transition={{ duration: 1.0, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="relative z-10 flex min-w-0 items-center gap-2">
        <motion.span
          initial={{ scale: 0.4, rotate: -35 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...m3Springs.fastSpatial, delay: 0.18 }}
          className="grid h-6 w-6 shrink-0 place-items-center"
          style={{
            clipPath: m3Shapes.cookie8,
            backgroundColor: theme.surface,
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: theme.accent,
              boxShadow: `0 0 8px ${theme.accent}`,
            }}
          />
        </motion.span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <AnimatedLogEmotionName
              emotion={emotion}
              quadrant={quadrant}
              isJustLogged
              className="text-[11.5px] font-bold text-[#F4F6F5]"
            />
          </div>
          <p className="text-[9px] font-medium text-[#9CA3A0]">
            Added to Emotion Log · Just now
          </p>
        </div>
      </div>

      <span
        className="relative z-10 shrink-0 text-[9.5px] font-semibold"
        style={{ color: theme.accent }}
      >
        Log
      </span>
    </motion.button>
  );
};
