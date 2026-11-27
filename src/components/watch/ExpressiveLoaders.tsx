import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { m3Colors, m3Shapes, m3Springs } from '../../styles/m3Tokens';

interface SkeletonBoneProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  clipPath?: string;
  className?: string;
}

/**
 * 1. Tonal Shimmer Bone
 * Uses dark M3 surfaceContainerHigh + calming mint-tinted primaryContainer light sweep
 */
export const ExpressiveSkeletonBone: React.FC<SkeletonBoneProps> = ({
  width = '100%',
  height = 14,
  borderRadius = m3Shapes.pill,
  clipPath,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius: clipPath ? 0 : borderRadius,
        clipPath,
        backgroundColor: m3Colors.surfaceContainerHigh,
      }}
    >
      {!prefersReducedMotion && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.45,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(99, 212, 163, 0.14) 45%, rgba(164, 220, 192, 0.24) 50%, rgba(99, 212, 163, 0.14) 55%, transparent 100%)',
          }}
        />
      )}
    </div>
  );
};

/**
 * 2. M3 Expressive Morphing Shape Indicator
 * Cycles through Pill -> Squircle -> Organic Cookie -> Soft Burst with spring rotation
 */
const MORPH_SHAPES = [
  { borderRadius: '999px', scale: 1 },
  { borderRadius: '30%', scale: 0.92 },
  { borderRadius: '38% 62% 63% 37% / 41% 44% 56% 59%', scale: 1.05 },
  { borderRadius: '24% 76% 35% 65% / 64% 31% 69% 36%', scale: 0.96 },
];

interface ExpressiveMorphLoaderProps {
  size?: number;
  accent?: string;
  containerBg?: string;
  label?: string;
}

export const ExpressiveMorphLoader: React.FC<ExpressiveMorphLoaderProps> = ({
  size = 28,
  accent = m3Colors.primary,
  containerBg = m3Colors.primaryContainer,
  label = 'Syncing',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setStep((prev) => (prev + 1) % MORPH_SHAPES.length);
    }, 620);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  const current = prefersReducedMotion ? MORPH_SHAPES[1] : MORPH_SHAPES[step];

  return (
    <div
      role="status"
      aria-label={label}
      className="grid shrink-0 place-items-center rounded-full border border-white/10"
      style={{
        width: size,
        height: size,
        backgroundColor: containerBg,
      }}
    >
      <motion.div
        animate={{
          borderRadius: current.borderRadius,
          scale: current.scale,
          rotate: prefersReducedMotion ? 0 : step * 90,
        }}
        transition={prefersReducedMotion ? m3Springs.defaultEffects : m3Springs.fastSpatial}
        style={{
          width: Math.round(size * 0.5),
          height: Math.round(size * 0.5),
          backgroundColor: accent,
        }}
      />
    </div>
  );
};

/**
 * 3. Watch-Proportioned Expressive Skeleton Card (Zero Layout Shift)
 * Matches MoodLogTile and TrendsAnalyticsTile card footprints with 8-point scalloped cookie avatar
 */
export const ExpressiveWatchCardSkeleton: React.FC<{ variant?: 'timeline' | 'analytics' }> = ({
  variant = 'timeline',
}) => {
  if (variant === 'analytics') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={m3Springs.defaultEffects}
        className="flex flex-col gap-3 border border-[#2B312F] bg-[#181C1B] p-3.5"
        style={{ borderRadius: m3Shapes.cardWatch }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <ExpressiveSkeletonBone width="62%" height={13} />
            <ExpressiveSkeletonBone width="38%" height={10} />
          </div>
          <ExpressiveSkeletonBone width={42} height={42} clipPath={m3Shapes.cookie8} />
        </div>
        <ExpressiveSkeletonBone width="100%" height={76} borderRadius="16px" />
        <div className="flex gap-2">
          <ExpressiveSkeletonBone width={68} height={22} borderRadius={m3Shapes.pill} />
          <ExpressiveSkeletonBone width={76} height={22} borderRadius={m3Shapes.selectedChip} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={m3Springs.defaultEffects}
      className="flex w-full items-center gap-2.5 border border-[#2B312F] bg-[#181C1B] px-3 py-2.5"
      style={{ borderRadius: '18px' }}
    >
      <ExpressiveSkeletonBone width={34} height={34} clipPath={m3Shapes.cookie8} />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <ExpressiveSkeletonBone width="48%" height={12} />
          <ExpressiveSkeletonBone width="22%" height={9} />
        </div>
        <ExpressiveSkeletonBone width="74%" height={9} />
      </div>
    </motion.div>
  );
};
