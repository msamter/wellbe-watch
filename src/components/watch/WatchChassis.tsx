import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronUp, Sun } from 'lucide-react';
import { TILES, TileId, WatchCaseFinish } from '../../types';

export interface WatchStageTransition {
  seq: number;
  kind: 'none' | 'left' | 'right' | 'radial';
}

interface WatchChassisProps {
  activeTile: TileId;
  onSelectTile: (tile: TileId, radial?: boolean, directionOverride?: 'left' | 'right') => void;
  onCrownNudge: (delta: number) => void;
  onSideButtonPress: () => void;
  onOpenQuickSettings: () => void;
  onOpenNotifications: () => void;
  onBackGesture?: () => void;
  hasSubView?: boolean;
  scrollProgress: number;
  hasScrollOverflow: boolean;
  scrollActive: boolean;
  hapticPulseSeq: number;
  hapticColor?: string;
  hapticsEnabled: boolean;
  stageTransition?: WatchStageTransition;
  caseFinish: WatchCaseFinish;
  aodEnabled: boolean;
  panicActive: boolean;
  overlayOpen: boolean;
  children: React.ReactNode;
}

const CASE_STYLES: Record<
  WatchCaseFinish,
  {
    outerGradient: string;
    crownGradient: string;
    lugColor: string;
    rimBorder: string;
  }
> = {
  obsidian: {
    outerGradient: 'radial-gradient(circle at 30% 20%, #3a3f4a 0%, #1c1f26 42%, #0c0d11 100%)',
    crownGradient: 'linear-gradient(180deg, #4b5262 0%, #1f232b 50%, #0e1015 100%)',
    lugColor: '#12141a',
    rimBorder: 'rgba(255,255,255,0.16)',
  },
  silver: {
    outerGradient: 'radial-gradient(circle at 30% 20%, #f1f5f9 0%, #cbd5e1 44%, #64748b 100%)',
    crownGradient: 'linear-gradient(180deg, #f8fafc 0%, #94a3b8 52%, #475569 100%)',
    lugColor: '#1e242d',
    rimBorder: 'rgba(255,255,255,0.55)',
  },
  champagne: {
    outerGradient: 'radial-gradient(circle at 30% 20%, #f7e6c4 0%, #c8ad7f 46%, #6f5a38 100%)',
    crownGradient: 'linear-gradient(180deg, #faebd0 0%, #b89b6a 52%, #645032 100%)',
    lugColor: '#1c1814',
    rimBorder: 'rgba(250,235,208,0.45)',
  },
};

export const WatchChassis: React.FC<WatchChassisProps> = ({
  activeTile,
  onSelectTile,
  onCrownNudge,
  onSideButtonPress,
  onOpenQuickSettings,
  onOpenNotifications,
  onBackGesture,
  hasSubView = false,
  scrollProgress,
  hasScrollOverflow,
  scrollActive,
  hapticPulseSeq,
  hapticColor = '#63D4A3',
  hapticsEnabled,
  stageTransition,
  caseFinish,
  aodEnabled,
  panicActive,
  overlayOpen,
  children,
}) => {
  const finish = CASE_STYLES[caseFinish];
  const [crownAngle, setCrownAngle] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [backPeekPx, setBackPeekPx] = useState(0);
  const [snappingBack, setSnappingBack] = useState(false);

  const pointerStartRef = useRef<{
    x: number;
    y: number;
    rect: DOMRect;
    time: number;
    scroller: HTMLElement | null;
    startScrollTop: number;
    pointerId: number;
    swiped: boolean;
  } | null>(null);
  const wheelCooldownRef = useRef(0);
  const crownRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageAnimRef = useRef<Animation | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const snapBackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hapticPulseSeq > 0 && hapticsEnabled) {
      setPulseKey(hapticPulseSeq);
    }
  }, [hapticPulseSeq, hapticsEnabled]);

  useEffect(() => {
    return () => {
      stageAnimRef.current?.cancel();
      if (suppressClickTimerRef.current) window.clearTimeout(suppressClickTimerRef.current);
      if (snapBackTimerRef.current) window.clearTimeout(snapBackTimerRef.current);
    };
  }, []);

  // Run GPU-composited directional entrance synchronously before paint — zero DOM remount & zero CSS forwards lock
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || !stageTransition || stageTransition.seq === 0 || stageTransition.kind === 'none') {
      return;
    }

    stageAnimRef.current?.cancel();

    let keyframes: Keyframe[];
    let duration = 220;

    if (stageTransition.kind === 'right') {
      keyframes = [
        { transform: 'translate3d(42px, 0, 0) scale(0.94)', opacity: 0.45 },
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      ];
    } else if (stageTransition.kind === 'left') {
      keyframes = [
        { transform: 'translate3d(-42px, 0, 0) scale(0.94)', opacity: 0.45 },
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      ];
    } else {
      duration = 230;
      keyframes = [
        { clipPath: 'circle(14% at 50% 78%)', opacity: 0.55 },
        { clipPath: 'circle(75% at 50% 50%)', opacity: 1 },
      ];
    }

    const anim = el.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
    stageAnimRef.current = anim;
    anim.onfinish = () => {
      if (stageAnimRef.current === anim) {
        stageAnimRef.current = null;
      }
    };
  }, [stageTransition]);

  const handleCrownStep = useCallback(
    (delta: number) => {
      setCrownAngle((a) => a + delta * 18);
      onCrownNudge(delta);
    },
    [onCrownNudge]
  );

  // Native non-passive wheel listener ONLY on the 3 o'clock hardware crown widget;
  // scrolling anywhere on the watch face itself uses 100% pure native fluid scrolling!
  useEffect(() => {
    const el = crownRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - wheelCooldownRef.current < 55) return;
      wheelCooldownRef.current = now;
      if (Math.abs(e.deltaY) > 4) {
        handleCrownStep(e.deltaY > 0 ? 1 : -1);
      }
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, [handleCrownStep]);

  const triggerSnapBack = () => {
    setSnappingBack(true);
    setDragOffsetX(0);
    setBackPeekPx(0);
    if (snapBackTimerRef.current) window.clearTimeout(snapBackTimerRef.current);
    snapBackTimerRef.current = window.setTimeout(() => setSnappingBack(false), 190);
  };

  const armClickSuppression = () => {
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current) window.clearTimeout(suppressClickTimerRef.current);
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 100);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement | null;
    // Never hijack drags on sliders, text inputs, textareas, or explicitly opted-out controls
    if (
      target &&
      (target.closest('input, textarea, select, [data-no-swipe]') !== null)
    ) {
      pointerStartRef.current = null;
      return;
    }

    const scroller = target ? (target.closest('.wear-scroll') as HTMLElement | null) : null;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rect,
      time: Date.now(),
      scroller,
      startScrollTop: scroller ? scroller.scrollTop : 0,
      pointerId: e.pointerId,
      swiped: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start || overlayOpen || panicActive) return;

    // If the vertical list is actively scrolling, yield completely to native fluid scroll
    if (start.scroller && Math.abs(start.scroller.scrollTop - start.startScrollTop) > 4) {
      pointerStartRef.current = null;
      if (dragOffsetX !== 0 || backPeekPx !== 0) triggerSnapBack();
      return;
    }

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.swiped && Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
      pointerStartRef.current = null;
      if (dragOffsetX !== 0 || backPeekPx !== 0) triggerSnapBack();
      return;
    }

    const localStartX = start.x - start.rect.left;
    // Interactive 1:1 left-edge back peek while dragging right on a sub-view
    if (hasSubView && localStartX < 78 && dx > 10 && dx > Math.abs(dy) * 1.35) {
      if (!start.swiped) {
        start.swiped = true;
        stageAnimRef.current?.cancel();
        setSnappingBack(false);
      }
      setBackPeekPx(Math.max(0, Math.min(88, dx * 0.72)));
      return;
    }

    if (!hasSubView && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.45) {
      if (!start.swiped) {
        start.swiped = true;
        stageAnimRef.current?.cancel();
        setSnappingBack(false);
        try {
          e.currentTarget.setPointerCapture(start.pointerId);
        } catch {
          // Ignore if capture is unavailable for synthetic pointer events
        }
      }
      setDragOffsetX(Math.max(-52, Math.min(52, dx * 0.34)));
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start?.swiped) {
      try {
        if (e.currentTarget.hasPointerCapture(start.pointerId)) {
          e.currentTarget.releasePointerCapture(start.pointerId);
        }
      } catch {
        // Ignore release errors
      }
    }
    if (dragOffsetX !== 0 || backPeekPx !== 0) triggerSnapBack();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    if (start.swiped) {
      armClickSuppression();
      try {
        if (e.currentTarget.hasPointerCapture(start.pointerId)) {
          e.currentTarget.releasePointerCapture(start.pointerId);
        }
      } catch {
        // Ignore release errors
      }
    }

    // Abort swipe actions if the user actually scrolled vertically
    if (start.scroller && Math.abs(start.scroller.scrollTop - start.startScrollTop) > 4) {
      if (dragOffsetX !== 0 || backPeekPx !== 0) triggerSnapBack();
      return;
    }

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const localStartY = start.y - start.rect.top;
    const localStartX = start.x - start.rect.left;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const scrollerAtTop = !start.scroller || start.scroller.scrollTop <= 2;
    const scrollerAtBottom =
      !start.scroller ||
      start.scroller.scrollTop + start.scroller.clientHeight >= start.scroller.scrollHeight - 2;

    // Swipe down from top pole -> Quick Settings (only if scroller is at top)
    if (
      !overlayOpen &&
      !panicActive &&
      scrollerAtTop &&
      localStartY < 56 &&
      dy > 52 &&
      absY > absX * 1.4
    ) {
      setSnappingBack(false);
      setDragOffsetX(0);
      setBackPeekPx(0);
      onOpenQuickSettings();
      return;
    }

    // Swipe up from bottom pole -> Notifications drawer (only if scroller is at bottom)
    if (
      !overlayOpen &&
      !panicActive &&
      scrollerAtBottom &&
      localStartY > start.rect.height - 56 &&
      dy < -52 &&
      absY > absX * 1.4
    ) {
      setSnappingBack(false);
      setDragOffsetX(0);
      setBackPeekPx(0);
      onOpenNotifications();
      return;
    }

    // Left-edge swipe right -> Pop sub-view
    if (hasSubView && localStartX < 74 && dx > 56 && absX > absY * 1.5 && onBackGesture) {
      setSnappingBack(false);
      setDragOffsetX(0);
      setBackPeekPx(0);
      onBackGesture();
      return;
    }

    // Horizontal tile swipe commit (zero CSS snap-back fight; WAAPI handles smooth entrance)
    if (!overlayOpen && !panicActive && !hasSubView && absX > 48 && absX > absY * 1.35) {
      setSnappingBack(false);
      setDragOffsetX(0);
      setBackPeekPx(0);
      if (dx < 0) {
        const next = ((activeTile + 1) % TILES.length) as TileId;
        onSelectTile(next, false, 'right');
      } else {
        const prev = ((activeTile - 1 + TILES.length) % TILES.length) as TileId;
        onSelectTile(prev, false, 'left');
      }
      return;
    }

    // Released before threshold: smoothly spring back to center
    if (dragOffsetX !== 0 || backPeekPx !== 0) {
      triggerSnapBack();
    }
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  // Compute curved right-arc scrollbar segment (between 64° and 116° on right side)
  const clampedScroll = Number.isFinite(scrollProgress)
    ? Math.max(0, Math.min(1, scrollProgress))
    : 0;
  const trackStartDeg = 64;
  const trackEndDeg = 116;
  const thumbSpan = 16;
  const thumbStart = trackStartDeg + clampedScroll * (trackEndDeg - trackStartDeg - thumbSpan);
  const thumbEnd = thumbStart + thumbSpan;

  const arcPt = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: 206 + r * Math.cos(rad), y: 206 + r * Math.sin(rad) };
  };
  const makeArc = (r: number, a1: number, a2: number) => {
    const p1 = arcPt(r, a1);
    const p2 = arcPt(r, a2);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Top Active Band / Watch Strap Stub */}
      <div
        className="h-14 w-[142px] rounded-t-[26px] border-x border-t border-white/[0.08] shadow-inner"
        style={{
          background: `linear-gradient(180deg, #0b0d12 0%, ${finish.lugColor} 80%, #090b0f 100%)`,
          marginBottom: '-22px',
          zIndex: 0,
        }}
      />

      {/* Main 448x448 Circular Pixel Watch 3 (45mm) Hardware Chassis */}
      <div className="relative z-10 flex h-[448px] w-[448px] items-center justify-center">
        {/* Color-Tinted 1px Bezel Haptic Pulse Ring (180ms GPU-only) */}
        {hapticsEnabled && pulseKey > 0 && (
          <div
            key={pulseKey}
            className="animate-haptic-ring pointer-events-none absolute -inset-1.5 rounded-full border"
            style={{
              borderColor: hapticColor,
              boxShadow: `0 0 18px ${hapticColor}66`,
            }}
          />
        )}

        {/* Side Button (2 o'clock) — Instant Emotions Check-In Shortcut */}
        <button
          type="button"
          onClick={onSideButtonPress}
          title="Side Button: Open Emotions (Space)"
          aria-label="Side button: Open Emotions"
          className="group absolute -right-[8px] top-[98px] z-0 flex h-[54px] w-[20px] origin-left rotate-[-28deg] items-center justify-end rounded-r-lg border border-white/15 shadow-lg transition-transform duration-150 hover:translate-x-[1px] active:translate-x-[-2px]"
          style={{ background: finish.crownGradient }}
        >
          <span
            className={`mr-1 h-5 w-[2px] rounded-full transition-colors ${
              activeTile === 1 ? 'bg-[#F0D57B]' : 'bg-white/30 group-hover:bg-[#F0D57B]'
            }`}
          />
        </button>

        {/* Interactive Rotating Crown (3 o'clock) */}
        <div
          ref={crownRef}
          className="absolute -right-[24px] top-1/2 z-20 flex -translate-y-1/2 flex-col items-center"
          title="Rotating Crown: Scroll or click top/bottom to nudge (ArrowUp / ArrowDown)"
        >
          {/* Top Nudge Zone */}
          <button
            type="button"
            onClick={() => handleCrownStep(-1)}
            aria-label="Rotate crown up"
            className="flex h-6 w-7 items-center justify-center rounded-t-md text-slate-400 transition-colors hover:text-white active:scale-90"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>

          {/* Knurled Metallic Crown Body */}
          <div
            className="relative flex h-[62px] w-[22px] flex-col items-center justify-between overflow-hidden rounded-r-[10px] rounded-l-[3px] border border-white/25 py-1.5 shadow-[4px_4px_16px_rgba(0,0,0,0.85)]"
            style={{ background: finish.crownGradient }}
          >
            {/* Moving knurl ridges */}
            <div
              className="flex w-full flex-col gap-[4px] transition-transform duration-150"
              style={{ transform: `translateY(${(crownAngle % 12) - 6}px)` }}
            >
              {Array.from({ length: 11 }).map((_, idx) => (
                <div
                  key={idx}
                  className="mx-auto h-[1.5px] w-[14px] rounded-full bg-black/45 shadow-[0_1px_0_rgba(255,255,255,0.22)]"
                />
              ))}
            </div>
            {/* Click overlay split into up/down halves */}
            <button
              type="button"
              onClick={() => handleCrownStep(-1)}
              aria-label="Crown scroll up"
              className="absolute inset-x-0 top-0 h-1/2 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleCrownStep(1)}
              aria-label="Crown scroll down"
              className="absolute inset-x-0 bottom-0 h-1/2 cursor-pointer"
            />
          </div>

          {/* Bottom Nudge Zone */}
          <button
            type="button"
            onClick={() => handleCrownStep(1)}
            aria-label="Rotate crown down"
            className="flex h-6 w-7 items-center justify-center rounded-b-md text-slate-400 transition-colors hover:text-white active:scale-90"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Outer Anodized Aluminum Watch Case + Domed Glass Rim */}
        <div
          className="relative flex h-[448px] w-[448px] items-center justify-center rounded-full p-[18px] shadow-[0_32px_90px_rgba(0,0,0,0.88),inset_0_2px_4px_rgba(255,255,255,0.25)]"
          style={{
            background: finish.outerGradient,
            border: `1.5px solid ${finish.rimBorder}`,
          }}
        >
          {/* Black Domed 3D Bezel Ring */}
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-black shadow-[inset_0_0_24px_rgba(255,255,255,0.08)]">
            {/* Active 412x412 Circular AMOLED Display */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onClickCapture={handleClickCapture}
              onDragStart={(e) => e.preventDefault()}
              className="relative h-[412px] w-[412px] overflow-hidden rounded-full bg-[#121514] text-[#F4F6F5] touch-pan-y"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
              }}
            >
              {/* Tile Content Stage: Synchronous WAAPI Carousel + 1:1 Drag & Back Peek (zero DOM remount) */}
              <div
                ref={stageRef}
                className={`relative h-full w-full will-change-transform ${
                  snappingBack ? 'transition-transform duration-[180ms] ease-out' : ''
                }`}
                style={{
                  transform:
                    backPeekPx > 0
                      ? `translate3d(${backPeekPx}px, 0, 0) scale(${(1 - (backPeekPx / 88) * 0.06).toFixed(3)})`
                      : dragOffsetX
                      ? `translate3d(${dragOffsetX}px, 0, 0) scale(${(1 - (Math.abs(dragOffsetX) / 52) * 0.045).toFixed(3)})`
                      : undefined,
                  opacity: aodEnabled && activeTile !== 0 ? 0.45 : 1,
                  filter: aodEnabled && activeTile !== 0 ? 'grayscale(0.75)' : undefined,
                }}
              >
                {children}
              </div>

              {/* Interactive Curved Left-Arc Back Chevron During Right-Swipe Back Peek */}
              {backPeekPx > 4 && (
                <div
                  className="pointer-events-none absolute inset-y-0 left-2 z-30 flex items-center"
                  style={{
                    opacity: Math.min(1, backPeekPx / 52),
                    transform: `scale(${(0.72 + Math.min(1, backPeekPx / 64) * 0.36).toFixed(3)})`,
                  }}
                >
                  <div className="flex h-12 w-7 items-center justify-center rounded-full border border-white/20 bg-[#181C1B]/90 text-[#63D4A3] shadow-lg backdrop-blur-sm">
                    <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                  </div>
                </div>
              )}

              {/* Curved Right-Arc Wear OS Rotary Scrollbar (80ms illuminate, 500ms hold, 250ms fade) */}
              {hasScrollOverflow && !aodEnabled && !panicActive && !overlayOpen && (
                <svg
                  width="412"
                  height="412"
                  viewBox="0 0 412 412"
                  className={`pointer-events-none absolute inset-0 z-30 transition-opacity ${
                    scrollActive
                      ? 'opacity-100 duration-75 ease-out'
                      : 'opacity-0 duration-[250ms] ease-in'
                  }`}
                >
                  <path
                    d={makeArc(200, trackStartDeg, trackEndDeg)}
                    fill="none"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={makeArc(200, thumbStart, thumbEnd)}
                    fill="none"
                    stroke="#63D4A3"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}

              {/* Curved Bottom Tile Indicator Dots (hidden in AOD, Panic, or overlays) */}
              {!aodEnabled && !panicActive && !overlayOpen && !hasSubView && (
                <div className="pointer-events-none absolute inset-x-0 bottom-[3px] z-30 flex items-center justify-center">
                  <div className="pointer-events-auto flex items-center gap-[5px] rounded-full border border-white/[0.08] bg-[#181C1B]/85 px-2.5 py-[3px] backdrop-blur-sm">
                    {TILES.map((t) => {
                      const isActive = t.id === activeTile;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onSelectTile(t.id)}
                          aria-label={`Switch to ${t.label}`}
                          className={`rounded-full transition-all duration-200 ${
                            isActive
                              ? 'h-[5px] w-[14px] bg-[#63D4A3]'
                              : 'h-[5px] w-[5px] bg-[#5E6864] hover:bg-[#9CA3A0]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subtle Top Pull Handle Hint for Quick Settings (only on non-overlay) */}
              {!aodEnabled && !panicActive && !overlayOpen && (
                <button
                  type="button"
                  onClick={onOpenQuickSettings}
                  aria-label="Open Quick Settings"
                  title="Quick Settings (or swipe down from top)"
                  className="absolute left-1/2 top-[3px] z-30 flex h-4 w-16 -translate-x-1/2 items-start justify-center opacity-40 transition-opacity hover:opacity-90"
                >
                  <span className="mt-1 h-[2.5px] w-7 rounded-full bg-white/45" />
                </button>
              )}

              {/* Domed 3D Glass Specular Reflection Overlay */}
              <div
                className="pointer-events-none absolute inset-0 z-40 rounded-full"
                style={{
                  background:
                    'radial-gradient(120% 75% at 28% 12%, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.02) 34%, transparent 56%)',
                  boxShadow:
                    'inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -10px 24px rgba(0,0,0,0.45)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Active Band / Watch Strap Stub */}
      <div
        className="h-14 w-[142px] rounded-b-[26px] border-x border-b border-white/[0.08] shadow-inner"
        style={{
          background: `linear-gradient(0deg, #0b0d12 0%, ${finish.lugColor} 80%, #090b0f 100%)`,
          marginTop: '-22px',
          zIndex: 0,
        }}
      />

      {/* Compact Subtle Hardware Cue Legend Below Strap */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-[#9CA3A0]">
        <button
          type="button"
          onClick={onSideButtonPress}
          className="flex items-center gap-1.5 text-[#D1D6D4] transition-colors hover:text-[#F0D57B]"
        >
          <Sun className="h-3.5 w-3.5 text-[#F0D57B]" />
          <span>2 o&apos;clock: Emotions</span>
        </button>
        <span aria-hidden="true" className="text-[#4B5350]">·</span>
        <span>3 o&apos;clock: Rotary Crown</span>
        <span aria-hidden="true" className="text-[#4B5350]">·</span>
        <span>Swipe or ← → Tiles</span>
      </div>
    </div>
  );
};
