import React, { useEffect, useId, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { m3Shapes, m3Springs } from '../../styles/m3Tokens';

export function formatClock(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const h12 = h % 12 || 12;
  return `${h12}:${m}`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatSleepHours(hours: number): string {
  const whole = Math.floor(hours);
  const mins = Math.round((hours - whole) * 60);
  return `${whole}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * CurvedTimeText: SVG <textPath> hugging the 12 o'clock curved top bezel on interior Wear OS screens.
 */
interface CurvedTimeTextProps {
  timeText: string;
  label?: string;
}

export const CurvedTimeText: React.FC<CurvedTimeTextProps> = ({ timeText, label }) => {
  const pathId = useId();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center">
      <svg width="412" height="62" viewBox="0 0 412 62" className="overflow-visible">
        <defs>
          {/* Top circular arc centered at (206, 206), radius 190 */}
          <path
            id={pathId}
            d="M 106 44 A 190 190 0 0 1 306 44"
            fill="none"
          />
        </defs>
        <text
          fill="rgba(241,245,249,0.88)"
          fontSize="11"
          fontWeight="600"
          letterSpacing="0.1em"
          className="font-mono uppercase"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label ? `${timeText} · ${label}` : timeText}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

/**
 * CurvedEdgeArc: SVG radial bezel gauge hugging the circular 412x412 watch perimeter.
 * Angles: 0° is 12 o'clock, increasing clockwise (90° = 3 o'clock, 180° = 6 o'clock, 270° = 9 o'clock).
 */
interface CurvedEdgeArcProps {
  startAngle: number;
  endAngle: number;
  progress: number; // 0 to 1
  radius?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  className?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const delta = endAngle - startAngle;
  const largeArcFlag = Math.abs(delta) > 180 ? 1 : 0;
  const sweepFlag = delta >= 0 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const CurvedEdgeArc: React.FC<CurvedEdgeArcProps> = ({
  startAngle,
  endAngle,
  progress,
  radius = 195,
  strokeWidth = 6,
  color,
  trackColor = 'rgba(255,255,255,0.12)',
  className = '',
}) => {
  const clamped = Math.max(0.01, Math.min(1, progress));
  const trackPath = describeArc(206, 206, radius, startAngle, endAngle);
  const dashOffset = 100 - clamped * 100;

  return (
    <svg
      width="412"
      height="412"
      viewBox="0 0 412 412"
      className={`pointer-events-none absolute inset-0 ${className}`}
    >
      <path
        d={trackPath}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d={trackPath}
        pathLength={100}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="100 100"
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 220ms cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
};

/**
 * WearScrollColumn: Wear OS ScalingLazyColumn-inspired vertically scrollable circular container.
 * Supports external rotary crown delta signals and reports scroll progress for the curved right-arc scrollbar.
 */
interface WearScrollColumnProps {
  children: React.ReactNode;
  className?: string;
  crownDelta?: { seq: number; delta: number };
  onScrollReport?: (ratio: number, hasOverflow: boolean) => void;
  paddingBottomClass?: string;
  paddingTopClass?: string;
  resetScrollKey?: string | number;
}

export const WearScrollColumn: React.FC<WearScrollColumnProps> = ({
  children,
  className = '',
  crownDelta,
  onScrollReport,
  paddingBottomClass = 'pb-[76px]',
  paddingTopClass = 'pt-[42px]',
  resetScrollKey,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastSeqRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastReportedRef = useRef<{ ratio: number; overflow: boolean }>({
    ratio: -1,
    overflow: false,
  });
  const onScrollReportRef = useRef(onScrollReport);
  onScrollReportRef.current = onScrollReport;

  const measureAndReport = (force = false) => {
    const el = scrollRef.current;
    const cb = onScrollReportRef.current;
    if (!el || !cb) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    const hasOverflow = maxScroll > 4;
    const ratio = hasOverflow ? Math.max(0, Math.min(1, el.scrollTop / maxScroll)) : 0;

    const prev = lastReportedRef.current;
    if (force || prev.overflow !== hasOverflow || Math.abs(prev.ratio - ratio) >= 0.01) {
      lastReportedRef.current = { ratio, overflow: hasOverflow };
      cb(ratio, hasOverflow);
    }
  };

  // Two-pass batched ScalingLazyColumn polar falloff: collects all DOM geometry reads first,
  // then applies GPU transform & opacity writes together to eliminate forced synchronous layout thrashing.
  // Tall containers (>62% viewport height) are never scaled so transform-origin can never displace content.
  const applyPolarFalloff = () => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;

    const stack = contentEl.firstElementChild;
    const items = stack ? Array.from(stack.children) : Array.from(contentEl.children);
    if (items.length === 0) return;

    const containerRect = scrollEl.getBoundingClientRect();
    const midY = containerRect.top + containerRect.height * 0.5;
    const halfH = Math.max(1, containerRect.height * 0.5);
    const maxScalableHeight = containerRect.height * 0.62;

    // Pass 1: Read geometry only
    const stylesToApply: Array<{ node: HTMLElement; transform: string; opacity: string }> = [];
    for (let i = 0; i < items.length; i++) {
      const node = items[i] as HTMLElement;
      if (node.offsetHeight > maxScalableHeight) {
        stylesToApply.push({ node, transform: '', opacity: '' });
        continue;
      }

      const rect = node.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height * 0.5;
      const normDist = Math.abs(itemCenterY - midY) / halfH;

      // Keep central 64% zone razor-sharp at 1.0; gently taper toward extreme top/bottom circular bezel poles
      if (normDist <= 0.64) {
        stylesToApply.push({ node, transform: '', opacity: '' });
      } else {
        const t = Math.min(1, (normDist - 0.64) / 0.48);
        const scale = 1 - t * 0.12; // 1.0 -> 0.88
        const opacity = 1 - t * 0.48; // 1.0 -> 0.52
        stylesToApply.push({
          node,
          transform: `scale(${scale.toFixed(3)})`,
          opacity: opacity.toFixed(3),
        });
      }
    }

    // Pass 2: Write styles only
    for (let i = 0; i < stylesToApply.length; i++) {
      const { node, transform, opacity } = stylesToApply[i];
      if (node.style.transform !== transform) node.style.transform = transform;
      if (node.style.opacity !== opacity) node.style.opacity = opacity;
    }
  };

  const triggerElasticBounce = (edge: 'top' | 'bottom') => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const cls = edge === 'top' ? 'animate-bounce-top' : 'animate-bounce-bottom';
    contentEl.classList.remove('animate-bounce-top', 'animate-bounce-bottom');
    // Force reflow to restart 180ms spring cleanly
    void contentEl.offsetWidth;
    contentEl.classList.add(cls);
  };

  const scheduleScrollUpdate = () => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      applyPolarFalloff();
      measureAndReport(false);
    });
  };

  // Reset scroll to top cleanly when filter or view key changes
  useEffect(() => {
    if (resetScrollKey === undefined) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
    }
    const id = window.requestAnimationFrame(() => {
      applyPolarFalloff();
      measureAndReport(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [resetScrollKey]);

  // Measure overflow & apply initial polar falloff on mount & when content dimensions or direct children change
  useEffect(() => {
    measureAndReport(true);
    applyPolarFalloff();
    const contentEl = contentRef.current;
    const scrollEl = scrollRef.current;
    if (!contentEl || !scrollEl) {
      return;
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleScrollUpdate();
          })
        : null;
    if (resizeObserver) {
      resizeObserver.observe(contentEl);
      resizeObserver.observe(scrollEl);
    }

    const mutationObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            scheduleScrollUpdate();
          })
        : null;
    if (mutationObserver) {
      mutationObserver.observe(contentEl, { childList: true });
      if (contentEl.firstElementChild) {
        mutationObserver.observe(contentEl.firstElementChild, { childList: true });
      }
    }

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Respond only to explicit hardware crown / keyboard nudges + elastic overscroll bounce at bounds
  useEffect(() => {
    if (!crownDelta || crownDelta.seq === lastSeqRef.current) return;
    lastSeqRef.current = crownDelta.seq;
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    if (crownDelta.delta < 0 && el.scrollTop <= 2) {
      triggerElasticBounce('top');
      return;
    }
    if (crownDelta.delta > 0 && el.scrollTop >= maxScroll - 2) {
      triggerElasticBounce('bottom');
      return;
    }
    el.scrollBy({ top: crownDelta.delta * 96, behavior: 'smooth' });
  }, [crownDelta]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={scheduleScrollUpdate}
        className={`wear-scroll h-full w-full overflow-y-auto overflow-x-hidden px-9 ${paddingTopClass} ${paddingBottomClass} ${className}`}
      >
        <div ref={contentRef} className="will-change-transform">
          {children}
        </div>
      </div>

      {/* Hardware-accelerated non-scrolling top & bottom circular fade vignettes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-11 bg-gradient-to-b from-[#121514] via-[#121514]/75 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[#121514] via-[#121514]/75 to-transparent"
      />
    </div>
  );
};

/**
 * EdgeActionButton: Bottom bezel-hugging curved primary CTA pill (Wear OS EdgeButton).
 */
interface EdgeActionButtonProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'surface' | 'red';
  disabled?: boolean;
}

export const EdgeActionButton: React.FC<EdgeActionButtonProps> = ({
  onClick,
  label,
  icon,
  variant = 'emerald',
  disabled = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const styles =
    variant === 'emerald'
      ? 'bg-[#63D4A3] text-[#0B1A13] hover:bg-[#76DDB0] shadow-[0_-4px_22px_rgba(99,212,163,0.24)]'
      : variant === 'red'
      ? 'bg-[#2F1C19] text-[#E89B8C] border border-[#E89B8C]/50 hover:bg-[#3B231F]'
      : 'bg-[#202523] text-[#F4F6F5] border border-[#313835] hover:bg-[#282E2C]';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex justify-center">
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onClick}
        whileHover={disabled || prefersReducedMotion ? undefined : { scale: 1.03 }}
        whileTap={
          disabled || prefersReducedMotion
            ? undefined
            : { scale: 0.93, borderRadius: m3Shapes.squirclePress }
        }
        animate={{ borderRadius: m3Shapes.pill }}
        transition={prefersReducedMotion ? m3Springs.defaultEffects : m3Springs.fastSpatial}
        className={`pointer-events-auto flex min-h-[42px] items-center justify-center gap-1.5 px-6 text-[13px] font-semibold tracking-tight disabled:opacity-50 whitespace-nowrap ${styles}`}
      >
        {icon}
        <span>{label}</span>
      </motion.button>
    </div>
  );
};

/**
 * WearChip: Tactile full-pill Wear OS button (min-height: 44px) with M3 Expressive pill -> squircle morph.
 */
interface WearChipProps {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  accentColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  className?: string;
}

export const WearChip: React.FC<WearChipProps> = ({
  onClick,
  children,
  active = false,
  accentColor,
  surfaceColor,
  borderColor,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }}
      whileTap={
        prefersReducedMotion
          ? undefined
          : { scale: 0.94, borderRadius: m3Shapes.squirclePress }
      }
      animate={{ borderRadius: active ? m3Shapes.large : m3Shapes.pill }}
      transition={prefersReducedMotion ? m3Springs.defaultEffects : m3Springs.fastSpatial}
      style={
        active && accentColor
          ? {
              backgroundColor: surfaceColor || 'rgba(99,212,163,0.16)',
              borderColor: borderColor || accentColor,
              color: accentColor,
            }
          : undefined
      }
      className={`flex min-h-[44px] w-full items-center justify-between border px-4 py-2 text-left text-[13px] font-medium ${
        active
          ? 'bg-[#222826] border-[#38403D] text-[#F4F6F5]'
          : 'bg-[#181C1B] border-[#2B312F] text-[#E5E9E7] hover:bg-[#202523]'
      } ${className}`}
    >
      {children}
    </motion.button>
  );
};

/**
 * MicroRollNumber: 140ms GPU-only vertical roll + fade swap for live BPM, HRV, and badge counts.
 */
interface MicroRollNumberProps {
  value: string | number;
  className?: string;
}

export const MicroRollNumber: React.FC<MicroRollNumberProps> = ({ value, className = '' }) => {
  const str = String(value);
  return (
    <span className={`inline-block overflow-hidden align-baseline tabular-nums ${className}`}>
      <span key={str} className="animate-micro-roll inline-block">
        {str}
      </span>
    </span>
  );
};
