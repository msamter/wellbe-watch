import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
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
  onCloseVerticalOverlay?: () => void;
  verticalOverlay?: 'none' | 'notifications' | 'settings';
  topSheet?: React.ReactNode;
  bottomSheet?: React.ReactNode;
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

const VIEWPORT_PX = 412;
const CASE_PX = 448;
const BEZEL_INSET_PX = (CASE_PX - VIEWPORT_PX) / 2;
// 25% of the 412px circular display from top & bottom edges (103px inside display + 18px glass bezel rim)
const VERTICAL_EDGE_ZONE_RATIO = 0.25;
const VERTICAL_EDGE_ZONE_PX = VIEWPORT_PX * VERTICAL_EDGE_ZONE_RATIO;

const SHEET_SPRING = {
  type: 'spring' as const,
  stiffness: 430,
  damping: 36,
  mass: 0.85,
};

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
  onCloseVerticalOverlay,
  verticalOverlay = 'none',
  topSheet,
  bottomSheet,
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
  const [mountedSheet, setMountedSheet] = useState<'none' | 'notifications' | 'settings'>(
    verticalOverlay
  );

  // Zero-rerender GPU MotionValues for butter-smooth 1:1 horizontal, vertical, and back-peek swiping
  const dragX = useMotionValue(0);
  const backPeekX = useMotionValue(0);
  const topSheetY = useMotionValue(verticalOverlay === 'notifications' ? 0 : -VIEWPORT_PX);
  const bottomSheetY = useMotionValue(verticalOverlay === 'settings' ? 0 : VIEWPORT_PX);

  const stageX = useTransform([dragX, backPeekX], ([dx, bx]: number[]) => (bx > 0 ? bx : dx));

  // Smooth stage scale & depth response synchronized to vertical sheets, horizontal drag, and back-peek
  const stageScale = useTransform(
    [dragX, backPeekX, topSheetY, bottomSheetY],
    ([dx, bx, ty, by]: number[]) => {
      if (bx > 0) {
        return 1 - Math.min(1, bx / 92) * 0.06;
      }
      const topProgress = Math.max(0, Math.min(1, (ty + VIEWPORT_PX) / VIEWPORT_PX));
      const botProgress = Math.max(0, Math.min(1, (VIEWPORT_PX - by) / VIEWPORT_PX));
      const vProgress = Math.max(topProgress, botProgress);
      const hProgress = Math.min(1, Math.abs(dx) / 140);
      return 1 - vProgress * 0.08 - hProgress * 0.045;
    }
  );

  const backChevronOpacity = useTransform(backPeekX, [4, 52], [0, 1]);
  const backChevronScale = useTransform(backPeekX, [4, 64], [0.72, 1.08]);

  const stageOpacity = useTransform([topSheetY, bottomSheetY], ([ty, by]: number[]) => {
    const topProgress = Math.max(0, Math.min(1, (ty + VIEWPORT_PX) / VIEWPORT_PX));
    const botProgress = Math.max(0, Math.min(1, (VIEWPORT_PX - by) / VIEWPORT_PX));
    return 1 - Math.max(topProgress, botProgress) * 0.45;
  });

  const stageYOffset = useTransform([topSheetY, bottomSheetY], ([ty, by]: number[]) => {
    const topProgress = Math.max(0, Math.min(1, (ty + VIEWPORT_PX) / VIEWPORT_PX));
    const botProgress = Math.max(0, Math.min(1, (VIEWPORT_PX - by) / VIEWPORT_PX));
    return topProgress * 34 - botProgress * 34;
  });

  const pointerStartRef = useRef<{
    x: number;
    y: number;
    sheetDragOriginY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    vy: number;
    rect: DOMRect;
    scroller: HTMLElement | null;
    startScrollTop: number;
    pointerId: number;
    pointerType: string;
    swiped: boolean;
    axis: 'none' | 'x' | 'y' | 'scroll' | 'back';
    activeSheet: 'none' | 'notifications' | 'settings';
  } | null>(null);

  const wheelCooldownRef = useRef(0);
  const crownRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageAnimRef = useRef<Animation | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const topAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const botAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const dragXAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const backPeekAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const gestureHandledOverlayRef = useRef<'none' | 'notifications' | 'settings' | null>(null);

  useEffect(() => {
    if (hapticPulseSeq > 0 && hapticsEnabled) {
      setPulseKey(hapticPulseSeq);
    }
  }, [hapticPulseSeq, hapticsEnabled]);

  useEffect(() => {
    return () => {
      stageAnimRef.current?.cancel();
      topAnimRef.current?.stop();
      botAnimRef.current?.stop();
      dragXAnimRef.current?.stop();
      backPeekAnimRef.current?.stop();
      if (suppressClickTimerRef.current) window.clearTimeout(suppressClickTimerRef.current);
    };
  }, []);

  // Sync top/bottom vertical sheet animations whenever verticalOverlay state changes programmatically
  useEffect(() => {
    if (gestureHandledOverlayRef.current === verticalOverlay) {
      gestureHandledOverlayRef.current = null;
      return;
    }
    gestureHandledOverlayRef.current = null;

    if (verticalOverlay === 'notifications') {
      setMountedSheet('notifications');
      topAnimRef.current?.stop();
      botAnimRef.current?.stop();
      bottomSheetY.set(VIEWPORT_PX);
      topAnimRef.current = animate(topSheetY, 0, SHEET_SPRING);
    } else if (verticalOverlay === 'settings') {
      setMountedSheet('settings');
      topAnimRef.current?.stop();
      botAnimRef.current?.stop();
      topSheetY.set(-VIEWPORT_PX);
      botAnimRef.current = animate(bottomSheetY, 0, SHEET_SPRING);
    } else {
      topAnimRef.current?.stop();
      botAnimRef.current?.stop();
      const topNeedClose = topSheetY.get() > -VIEWPORT_PX + 1;
      const botNeedClose = bottomSheetY.get() < VIEWPORT_PX - 1;

      if (topNeedClose) {
        topAnimRef.current = animate(topSheetY, -VIEWPORT_PX, {
          ...SHEET_SPRING,
          onComplete: () => setMountedSheet((cur) => (cur === 'notifications' ? 'none' : cur)),
        });
      } else {
        topSheetY.set(-VIEWPORT_PX);
      }

      if (botNeedClose) {
        botAnimRef.current = animate(bottomSheetY, VIEWPORT_PX, {
          ...SHEET_SPRING,
          onComplete: () => setMountedSheet((cur) => (cur === 'settings' ? 'none' : cur)),
        });
      } else {
        bottomSheetY.set(VIEWPORT_PX);
      }

      if (!topNeedClose && !botNeedClose) {
        setMountedSheet('none');
      }
    }
  }, [verticalOverlay, topSheetY, bottomSheetY]);

  // Run GPU-composited directional entrance synchronously before paint
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || !stageTransition || stageTransition.seq === 0 || stageTransition.kind === 'none') {
      return;
    }

    stageAnimRef.current?.cancel();

    let keyframes: Keyframe[];
    let duration = 210;

    if (stageTransition.kind === 'right') {
      keyframes = [
        { transform: 'translate3d(48px, 0, 0) scale(0.94)', opacity: 0.48 },
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      ];
    } else if (stageTransition.kind === 'left') {
      keyframes = [
        { transform: 'translate3d(-48px, 0, 0) scale(0.94)', opacity: 0.48 },
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      ];
    } else {
      duration = 220;
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

  // Native non-passive wheel listener ONLY on the 3 o'clock hardware crown widget
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

  const armClickSuppression = () => {
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current) window.clearTimeout(suppressClickTimerRef.current);
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 100);
  };

  const snapDragBack = (vx = 0, vy = 0) => {
    if (backPeekX.get() !== 0) {
      backPeekAnimRef.current?.stop();
      backPeekAnimRef.current = animate(backPeekX, 0, { ...SHEET_SPRING, velocity: vx * 1000 });
    }
    if (dragX.get() !== 0) {
      dragXAnimRef.current?.stop();
      dragXAnimRef.current = animate(dragX, 0, { ...SHEET_SPRING, velocity: vx * 1000 });
    }
    if (verticalOverlay === 'notifications') {
      topAnimRef.current?.stop();
      topAnimRef.current = animate(topSheetY, 0, { ...SHEET_SPRING, velocity: vy * 1000 });
    } else if (verticalOverlay === 'settings') {
      botAnimRef.current?.stop();
      botAnimRef.current = animate(bottomSheetY, 0, { ...SHEET_SPRING, velocity: vy * 1000 });
    } else {
      if (topSheetY.get() > -VIEWPORT_PX + 1) {
        topAnimRef.current?.stop();
        topAnimRef.current = animate(topSheetY, -VIEWPORT_PX, {
          ...SHEET_SPRING,
          velocity: vy * 1000,
          onComplete: () => setMountedSheet((cur) => (cur === 'notifications' ? 'none' : cur)),
        });
      }
      if (bottomSheetY.get() < VIEWPORT_PX - 1) {
        botAnimRef.current?.stop();
        botAnimRef.current = animate(bottomSheetY, VIEWPORT_PX, {
          ...SHEET_SPRING,
          velocity: vy * 1000,
          onComplete: () => setMountedSheet((cur) => (cur === 'settings' ? 'none' : cur)),
        });
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('input, textarea, select, [data-no-swipe]') !== null) {
      pointerStartRef.current = null;
      return;
    }

    const scroller = target ? (target.closest('.wear-scroll') as HTMLElement | null) : null;
    const rect = e.currentTarget.getBoundingClientRect();
    const now = performance.now();
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      sheetDragOriginY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      vx: 0,
      vy: 0,
      rect,
      scroller,
      startScrollTop: scroller ? scroller.scrollTop : 0,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      swiped: false,
      axis: 'none',
      activeSheet: verticalOverlay,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start || panicActive) return;

    // Ignore non-vertical modal overlays (like stress alert)
    if (overlayOpen && verticalOverlay === 'none') return;

    // On non-vertical-sheet tiles, yield to native touch scroll if list already scrolled
    if (
      verticalOverlay === 'none' &&
      !start.swiped &&
      start.scroller &&
      Math.abs(start.scroller.scrollTop - start.startScrollTop) > 4
    ) {
      pointerStartRef.current = null;
      return;
    }

    const prevY = start.lastY;
    const now = performance.now();
    const dt = Math.max(1, now - start.lastTime);
    const instVx = (e.clientX - start.lastX) / dt;
    const instVy = (e.clientY - start.lastY) / dt;
    // Smooth exponential velocity filter for silky flick physics
    start.vx = start.vx * 0.45 + instVx * 0.55;
    start.vy = start.vy * 0.45 + instVy * 0.55;
    start.lastX = e.clientX;
    start.lastY = e.clientY;
    start.lastTime = now;

    // Normalize screen-space drag into 412px watch-display coordinates (handles responsive watchScale + 448px bezel)
    const scaleFactor = start.rect.width > 0 ? CASE_PX / start.rect.width : 1;
    const dx = (e.clientX - start.x) * scaleFactor;
    const dy = (e.clientY - start.y) * scaleFactor;
    const stepDy = (e.clientY - prevY) * scaleFactor;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const localStartX = (start.x - start.rect.left) * scaleFactor - BEZEL_INSET_PX;
    const localStartY = (start.y - start.rect.top) * scaleFactor - BEZEL_INSET_PX;

    // Case 1: Vertical sheet (Notifications above OR Pixel Settings below) is open
    // Full-screen + bezel surface area for fluid 1:1 vertical dragging with seamless scroll-to-dismiss handoff
    if (verticalOverlay !== 'none') {
      const scroller = start.scroller;
      const maxScroll = scroller ? Math.max(0, scroller.scrollHeight - scroller.clientHeight) : 0;
      const hasOverflow = maxScroll > 3;
      const scrollerAtTop = !scroller || scroller.scrollTop <= 3;
      const scrollerAtBottom = !scroller || !hasOverflow || scroller.scrollTop >= maxScroll - 3;
      const isMouseOrPen = start.pointerType !== 'touch';

      const captureVertical = (mode: 'y' | 'scroll') => {
        if (!start.swiped) {
          start.swiped = true;
          topAnimRef.current?.stop();
          botAnimRef.current?.stop();
          try {
            e.currentTarget.setPointerCapture(start.pointerId);
          } catch {
            // Ignore synthetic pointer capture failures
          }
        }
        start.axis = mode;
      };

      // Decide initial vertical mode once past forgiving 5px deadzone
      if (start.axis === 'none' && absY > 5 && absY > absX * 0.85) {
        if (verticalOverlay === 'notifications') {
          if (dy < 0) {
            // Swiping UP on Notifications -> dismiss across 100% of screen on mouse, or bottom 60% / top 25% edge / at-bottom on touch
            const inWideDismissZone =
              isMouseOrPen ||
              scrollerAtBottom ||
              localStartY >= VIEWPORT_PX * 0.4 ||
              localStartY <= VERTICAL_EDGE_ZONE_PX;
            if (inWideDismissZone) {
              start.sheetDragOriginY = start.y;
              captureVertical('y');
            } else {
              captureVertical('scroll');
            }
          } else {
            // Swiping DOWN on Notifications -> scroll back up if scrolled, else elastic rubber-band
            if (scroller && scroller.scrollTop > 3) {
              captureVertical('scroll');
            } else {
              start.sheetDragOriginY = start.y;
              captureVertical('y');
            }
          }
        } else {
          // verticalOverlay === 'settings'
          if (dy > 0) {
            // Swiping DOWN on Settings -> dismiss across 100% of screen on mouse, or top 60% / bottom 25% edge / at-top on touch
            const inWideDismissZone =
              isMouseOrPen ||
              scrollerAtTop ||
              localStartY <= VIEWPORT_PX * 0.6 ||
              localStartY >= VIEWPORT_PX - VERTICAL_EDGE_ZONE_PX;
            if (inWideDismissZone) {
              start.sheetDragOriginY = start.y;
              captureVertical('y');
            } else {
              captureVertical('scroll');
            }
          } else {
            // Swiping UP on Settings -> scroll down through settings categories, or elastic rubber-band at bottom
            if (scroller && !scrollerAtBottom) {
              captureVertical('scroll');
            } else {
              start.sheetDragOriginY = start.y;
              captureVertical('y');
            }
          }
        }
      }

      if (start.axis === 'scroll' && scroller) {
        const nextTop = scroller.scrollTop - stepDy;
        if (verticalOverlay === 'notifications' && stepDy < 0 && nextTop >= maxScroll) {
          scroller.scrollTop = maxScroll;
          // Seamless handoff into dismissing Notifications once the bottom of the list is reached
          start.axis = 'y';
          start.sheetDragOriginY = e.clientY;
        } else if (verticalOverlay === 'settings' && stepDy > 0 && nextTop <= 0) {
          scroller.scrollTop = 0;
          // Seamless handoff into dismissing Settings once the top of the list is reached
          start.axis = 'y';
          start.sheetDragOriginY = e.clientY;
        } else {
          scroller.scrollTop = Math.max(0, Math.min(maxScroll, nextTop));
          return;
        }
      }

      if (start.axis === 'y') {
        const sheetDy = (e.clientY - start.sheetDragOriginY) * scaleFactor;
        if (verticalOverlay === 'notifications') {
          if (sheetDy <= 0) {
            topSheetY.set(Math.max(-VIEWPORT_PX, sheetDy));
          } else {
            // Subtle damped elastic pull when swiping down at top of Notifications
            topSheetY.set(Math.min(26, sheetDy * 0.18));
          }
        } else {
          if (sheetDy >= 0) {
            bottomSheetY.set(Math.min(VIEWPORT_PX, sheetDy));
          } else {
            // Subtle damped elastic pull when swiping up at bottom of Settings
            bottomSheetY.set(Math.max(-26, sheetDy * 0.18));
          }
        }
      }
      return;
    }

    // Case 2: Vertical 1:1 drag-to-open -> Top 25% pulls Notifications down, Bottom 25% pulls Quick Settings up
    // Works across all tiles from the expanded 25% top/bottom edge zones (plus full-screen vertical drag on Watch Home)
    if (!hasSubView && !aodEnabled) {
      const inTopEdgeZone = localStartY <= VERTICAL_EDGE_ZONE_PX;
      const inBottomEdgeZone = localStartY >= VIEWPORT_PX - VERTICAL_EDGE_ZONE_PX;
      const scroller = start.scroller;
      const maxScroll = scroller ? Math.max(0, scroller.scrollHeight - scroller.clientHeight) : 0;
      const hasOverflow = maxScroll > 3;
      const scrollerAtTop = !scroller || scroller.scrollTop <= 3;
      const scrollerAtBottom = !scroller || !hasOverflow || scroller.scrollTop >= maxScroll - 3;

      const canPullNotifications =
        dy > 0 &&
        (activeTile === 0 || (inTopEdgeZone && (scrollerAtTop || localStartY <= 52)));
      const canPullSettings =
        dy < 0 &&
        (activeTile === 0 ||
          (inBottomEdgeZone && (scrollerAtBottom || localStartY >= VIEWPORT_PX - 52)));

      const inActiveEdgeZone = (inTopEdgeZone && dy > 0) || (inBottomEdgeZone && dy < 0);
      const shouldLockVertical =
        start.axis === 'none' &&
        (canPullNotifications || canPullSettings) &&
        (inActiveEdgeZone
          ? absY > 5 && absY > absX * 0.85
          : absY > 6 && absY > absX * 1.05);

      if (start.axis === 'y' || shouldLockVertical) {
        if (!start.swiped) {
          start.swiped = true;
          start.axis = 'y';
          start.sheetDragOriginY = start.y;
          stageAnimRef.current?.cancel();
          topAnimRef.current?.stop();
          botAnimRef.current?.stop();
          try {
            e.currentTarget.setPointerCapture(start.pointerId);
          } catch {
            // Ignore synthetic pointer capture failures
          }
        }

        const allowSwitchAcrossZero = activeTile === 0;
        const targetSheet: 'notifications' | 'settings' =
          allowSwitchAcrossZero || start.activeSheet === 'none'
            ? dy >= 0
              ? 'notifications'
              : 'settings'
            : start.activeSheet;

        if (targetSheet === 'notifications') {
          if (start.activeSheet !== 'notifications') {
            start.activeSheet = 'notifications';
            setMountedSheet('notifications');
            bottomSheetY.set(VIEWPORT_PX);
          }
          topSheetY.set(Math.max(-VIEWPORT_PX, Math.min(0, -VIEWPORT_PX + Math.max(0, dy))));
        } else {
          if (start.activeSheet !== 'settings') {
            start.activeSheet = 'settings';
            setMountedSheet('settings');
            topSheetY.set(-VIEWPORT_PX);
          }
          bottomSheetY.set(Math.min(VIEWPORT_PX, Math.max(0, VIEWPORT_PX + Math.min(0, dy))));
        }
        return;
      }
    }

    // Case 3: Vertical scroll on non-Home tiles -> yield cleanly to native scroll
    if (!start.swiped && absY > 12 && absY > absX) {
      pointerStartRef.current = null;
      return;
    }

    // Case 4: Left-edge back peek on sub-views
    if (
      hasSubView &&
      (start.axis === 'back' ||
        (start.axis === 'none' && localStartX < 80 && dx > 8 && dx > absY * 1.25))
    ) {
      if (!start.swiped) {
        start.swiped = true;
        start.axis = 'back';
        stageAnimRef.current?.cancel();
        backPeekAnimRef.current?.stop();
      }
      backPeekX.set(Math.max(0, Math.min(92, dx * 0.72)));
      return;
    }

    // Case 5: Fluid 1:1 horizontal tile swiping
    if (
      !hasSubView &&
      (start.axis === 'x' || (start.axis === 'none' && absX > 7 && absX > absY * 1.15))
    ) {
      if (!start.swiped) {
        start.swiped = true;
        start.axis = 'x';
        stageAnimRef.current?.cancel();
        dragXAnimRef.current?.stop();
        try {
          e.currentTarget.setPointerCapture(start.pointerId);
        } catch {
          // Ignore synthetic pointer capture failures
        }
      }
      // Subtle edge resistance beyond 90px so horizontal drag feels crisp and responsive
      const clamped = Math.max(-110, Math.min(110, dx * 0.58));
      dragX.set(clamped);
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
    snapDragBack();
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

    if (
      !start.swiped &&
      start.scroller &&
      Math.abs(start.scroller.scrollTop - start.startScrollTop) > 4
    ) {
      return;
    }

    if (start.axis === 'scroll') {
      return;
    }

    const scaleFactor = start.rect.width > 0 ? CASE_PX / start.rect.width : 1;
    const dx = (e.clientX - start.x) * scaleFactor;
    const dy = (e.clientY - start.y) * scaleFactor;
    const sheetDy = (e.clientY - start.sheetDragOriginY) * scaleFactor;
    const vx = start.vx * scaleFactor;
    const vy = start.vy * scaleFactor;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Commit or snap back open vertical sheet dismissal
    if (verticalOverlay === 'notifications' && start.axis === 'y') {
      if (sheetDy < -48 || (sheetDy < -16 && vy < -0.22)) {
        gestureHandledOverlayRef.current = 'none';
        topAnimRef.current?.stop();
        topAnimRef.current = animate(topSheetY, -VIEWPORT_PX, {
          ...SHEET_SPRING,
          velocity: vy * 1000,
          onComplete: () => setMountedSheet((cur) => (cur === 'notifications' ? 'none' : cur)),
        });
        onCloseVerticalOverlay?.();
      } else {
        snapDragBack(vx, vy);
      }
      return;
    }

    if (verticalOverlay === 'settings' && start.axis === 'y') {
      if (sheetDy > 48 || (sheetDy > 16 && vy > 0.22)) {
        gestureHandledOverlayRef.current = 'none';
        botAnimRef.current?.stop();
        botAnimRef.current = animate(bottomSheetY, VIEWPORT_PX, {
          ...SHEET_SPRING,
          velocity: vy * 1000,
          onComplete: () => setMountedSheet((cur) => (cur === 'settings' ? 'none' : cur)),
        });
        onCloseVerticalOverlay?.();
      } else {
        snapDragBack(vx, vy);
      }
      return;
    }

    // Commit or snap back vertical overlay pull (Home full-screen or any tile's 25% top/bottom edge zone)
    if (start.axis === 'y' && !overlayOpen && !panicActive && !aodEnabled) {
      if (start.activeSheet === 'notifications' && (dy > 48 || (dy > 16 && vy > 0.22))) {
        gestureHandledOverlayRef.current = 'notifications';
        topAnimRef.current?.stop();
        topAnimRef.current = animate(topSheetY, 0, { ...SHEET_SPRING, velocity: vy * 1000 });
        onOpenNotifications();
        return;
      }
      if (start.activeSheet === 'settings' && (dy < -48 || (dy < -16 && vy < -0.22))) {
        gestureHandledOverlayRef.current = 'settings';
        botAnimRef.current?.stop();
        botAnimRef.current = animate(bottomSheetY, 0, { ...SHEET_SPRING, velocity: vy * 1000 });
        onOpenQuickSettings();
        return;
      }
      snapDragBack(vx, vy);
      return;
    }

    // Commit left-edge back gesture on sub-views
    if (start.axis === 'back' && hasSubView && onBackGesture) {
      backPeekAnimRef.current?.stop();
      if (dx > 52 || (dx > 22 && vx > 0.35)) {
        backPeekX.set(0);
        onBackGesture();
      } else {
        backPeekAnimRef.current = animate(backPeekX, 0, { ...SHEET_SPRING, velocity: vx * 1000 });
      }
      return;
    }

    // Commit responsive horizontal tile swipe (distance OR quick flick velocity)
    if (
      start.axis === 'x' &&
      !overlayOpen &&
      !panicActive &&
      !hasSubView &&
      (absX > 42 || (absX > 18 && Math.abs(vx) > 0.32)) &&
      absX > absY * 1.1
    ) {
      dragXAnimRef.current?.stop();
      dragX.set(0);
      if (dx < 0) {
        const next = ((activeTile + 1) % TILES.length) as TileId;
        onSelectTile(next, false, 'right');
      } else {
        const prev = ((activeTile - 1 + TILES.length) % TILES.length) as TileId;
        onSelectTile(prev, false, 'left');
      }
      return;
    }

    snapDragBack(vx, vy);
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
          <button
            type="button"
            onClick={() => handleCrownStep(-1)}
            aria-label="Rotate crown up"
            className="flex h-6 w-7 items-center justify-center rounded-t-md text-slate-400 transition-colors hover:text-white active:scale-90"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>

          <div
            className="relative flex h-[62px] w-[22px] flex-col items-center justify-between overflow-hidden rounded-r-[10px] rounded-l-[3px] border border-white/25 py-1.5 shadow-[4px_4px_16px_rgba(0,0,0,0.85)]"
            style={{ background: finish.crownGradient }}
          >
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

          <button
            type="button"
            onClick={() => handleCrownStep(1)}
            aria-label="Rotate crown down"
            className="flex h-6 w-7 items-center justify-center rounded-b-md text-slate-400 transition-colors hover:text-white active:scale-90"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Outer Anodized Aluminum Watch Case + Domed Glass Rim (Full 448x448 Swipe Surface) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClickCapture={handleClickCapture}
          onDragStart={(e) => e.preventDefault()}
          className={`relative flex h-[448px] w-[448px] items-center justify-center rounded-full p-[18px] shadow-[0_32px_90px_rgba(0,0,0,0.88),inset_0_2px_4px_rgba(255,255,255,0.25)] ${
            ((activeTile === 0 || !hasScrollOverflow) && !overlayOpen && !hasSubView) ||
            verticalOverlay !== 'none'
              ? 'touch-none'
              : 'touch-pan-y'
          }`}
          style={{
            background: finish.outerGradient,
            border: `1.5px solid ${finish.rimBorder}`,
          }}
        >
          {/* Black Domed 3D Bezel Ring */}
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-black shadow-[inset_0_0_24px_rgba(255,255,255,0.08)]">
            {/* Active 412x412 Circular AMOLED Display */}
            <div
              className="relative h-[412px] w-[412px] overflow-hidden rounded-full bg-[#121514] text-[#F4F6F5]"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
              }}
            >
              {/* Tile Content Stage: 120fps GPU MotionValue Horizontal + Vertical Parallax */}
              <motion.div
                className="relative h-full w-full will-change-transform"
                style={{
                  x: stageX,
                  y: stageYOffset,
                  scale: stageScale,
                  opacity: aodEnabled && activeTile !== 0 ? 0.45 : stageOpacity,
                  filter: aodEnabled && activeTile !== 0 ? 'grayscale(0.75)' : undefined,
                }}
              >
                <div ref={stageRef} className="relative h-full w-full">
                  {children}
                </div>
              </motion.div>

              {/* Top Vertical Sheet (Notifications Tile Screen ABOVE Home — 1:1 GPU Slide) */}
              {mountedSheet === 'notifications' && topSheet && (
                <motion.div
                  className="absolute inset-0 z-30 will-change-transform"
                  style={{ y: topSheetY }}
                >
                  {topSheet}
                </motion.div>
              )}

              {/* Bottom Vertical Sheet (Pixel Watch Wear OS 5 Settings BELOW Home — 1:1 GPU Slide) */}
              {mountedSheet === 'settings' && bottomSheet && (
                <motion.div
                  className="absolute inset-0 z-30 will-change-transform"
                  style={{ y: bottomSheetY }}
                >
                  {bottomSheet}
                </motion.div>
              )}

              {/* Interactive Curved Left-Arc Back Chevron During Right-Swipe Back Peek */}
              {hasSubView && (
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-2 z-30 flex items-center will-change-transform"
                  style={{
                    opacity: backChevronOpacity,
                    scale: backChevronScale,
                  }}
                >
                  <div className="flex h-12 w-7 items-center justify-center rounded-full border border-white/20 bg-[#181C1B]/90 text-[#63D4A3] shadow-lg backdrop-blur-sm">
                    <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                  </div>
                </motion.div>
              )}

              {/* Curved Right-Arc Wear OS Rotary Scrollbar */}
              {hasScrollOverflow && !aodEnabled && !panicActive && (
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
      <div className="mt-3 flex items-center gap-2.5 text-[11px] text-[#9CA3A0]">
        <button
          type="button"
          onClick={onSideButtonPress}
          className="flex items-center gap-1.5 text-[#D1D6D4] transition-colors hover:text-[#F0D57B]"
        >
          <Sun className="h-3.5 w-3.5 text-[#F0D57B]" />
          <span>2 o&apos;clock: Emotions</span>
        </button>
        <span aria-hidden="true" className="text-[#4B5350]">·</span>
        <span>Swipe ← → Tiles</span>
        <span aria-hidden="true" className="text-[#4B5350]">·</span>
        <span>Swipe ↑ ↓ Edge</span>
      </div>
    </div>
  );
};
