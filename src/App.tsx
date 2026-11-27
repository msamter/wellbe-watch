import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { SOMATIC_PROTOCOLS } from './data/seedData';
import { useWellbeStore } from './hooks/useWellbeStore';
import { TILES, TileId } from './types';
import {
  playConfirmChime,
  playCrownClick,
  playTapTick,
  primeVoiceAudio,
  setAnchorVoicePreset,
  stopSanctuaryAudio,
  stopSpeech,
} from './utils/audioHaptics';
import { WatchChassis, WatchStageTransition } from './components/watch/WatchChassis';
import { formatClock } from './components/watch/WearPrimitives';
import {
  NotificationsDrawer,
  QuickSettingsShade,
  StressAlertOverlay,
} from './components/watch/Overlays';
import { WatchFaceTile } from './components/tiles/WatchFaceTile';
import { RulerGridTile } from './components/tiles/RulerGridTile';
import { SomaticResetsTile, SomaticSubView } from './components/tiles/SomaticResetsTile';
import { MoodLogTile } from './components/tiles/MoodLogTile';
import { TrendsAnalyticsTile } from './components/tiles/TrendsAnalyticsTile';
import { VoicePanicAnchorTile } from './components/tiles/VoicePanicAnchorTile';
import { StepCounterTile } from './components/tiles/StepCounterTile';
import { SleepTrackerTile } from './components/tiles/SleepTrackerTile';
import { CompanionPanel } from './components/studio/CompanionPanel';
import { TherapistSummaryModal } from './components/studio/TherapistSummaryModal';
import { ExpressiveButton, ExpressiveIconButton } from './components/watch/ExpressiveControls';

const IDLE_CROWN = { seq: 0, delta: 0 } as const;
const NOOP_SCROLL_REPORT = () => {};
const NON_SCROLLABLE_TILES = new Set<TileId>([0, 1, 5, 6, 7]);

export default function App() {
  const {
    state,
    activeStressAlert,
    logMood,
    toggleTagOnMood,
    deleteMood,
    logGratitude,
    deleteGratitude,
    logResetSession,
    addScheduledRoutine,
    toggleScheduledRoutine,
    updateBiometrics,
    triggerStressSpike,
    dismissStressAlert,
    clearNotifications,
    syncNow,
    updateTodaySteps,
    updateTodaySleep,
    updateSettings,
    resetDemoData,
    exportJSON,
    exportCSV,
    exportMarkdown,
  } = useWellbeStore();

  const [activeTile, setActiveTile] = useState<TileId>(0);
  const [now, setNow] = useState<Date>(() => new Date());
  const [trendsRange, setTrendsRange] = useState<7 | 30>(7);

  // Overlays & Studio UI
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [therapistModalOpen, setTherapistModalOpen] = useState(false);
  const [exportFlashSeq, setExportFlashSeq] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentlyLoggedMood, setRecentlyLoggedMood] = useState<{ id: string; seq: number } | null>(
    null
  );
  const syncTimerRef = useRef<number | null>(null);

  // Watch sub-view & rotary crown plumbing
  const [somaticExternalSubView, setSomaticExternalSubView] = useState<SomaticSubView | null>(null);
  const [hasSubView, setHasSubView] = useState(false);
  const [panicActive, setPanicActive] = useState(false);
  const [autoStartPanicSeq, setAutoStartPanicSeq] = useState(0);
  const [backSignal, setBackSignal] = useState(0);

  const [crownDelta, setCrownDelta] = useState({ seq: 0, delta: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrollOverflow, setHasScrollOverflow] = useState(false);
  const [scrollActive, setScrollActive] = useState(false);
  const [hapticPulseSeq, setHapticPulseSeq] = useState(0);
  const [hapticColor, setHapticColor] = useState<string>('#63D4A3');
  const [stageTransition, setStageTransition] = useState<WatchStageTransition>({
    seq: 0,
    kind: 'none',
  });
  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 820,
  }));

  const scrollHideTimerRef = useRef<number | null>(null);
  const exportFlashTimerRef = useRef<number | null>(null);

  // Track viewport size (rAF-throttled) so the entire watch fits cleanly on any mobile or desktop screen
  useEffect(() => {
    let rafId: number | null = null;
    const updateViewport = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const w = window.innerWidth;
        const h = window.innerHeight;
        setViewport((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      });
    };
    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Keep watch clock accurate every 15s
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Keep Anchor Voice tone preset synced with the voice engine
  useEffect(() => {
    setAnchorVoicePreset(state.settings.anchorVoice || 'tender');
  }, [state.settings.anchorVoice]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (scrollHideTimerRef.current) window.clearTimeout(scrollHideTimerRef.current);
      if (exportFlashTimerRef.current) window.clearTimeout(exportFlashTimerRef.current);
    };
  }, []);

  const triggerHaptic = useCallback(
    (color?: string) => {
      playTapTick(state.settings.audioEnabled);
      if (state.settings.hapticsEnabled) {
        setHapticColor(color || '#63D4A3');
        setHapticPulseSeq((n) => n + 1);
      }
    },
    [state.settings.audioEnabled, state.settings.hapticsEnabled]
  );

  // Curved Rotary Arc Flash: illuminate immediately (75ms), hold 500ms, then fade out (250ms)
  const handleScrollReport = useCallback((ratio: number, overflow: boolean) => {
    setScrollProgress((prev) => (Math.abs(prev - ratio) >= 0.008 ? ratio : prev));
    setHasScrollOverflow((prev) => (prev !== overflow ? overflow : prev));
    if (overflow) {
      setScrollActive((prev) => (prev ? prev : true));
      if (scrollHideTimerRef.current) window.clearTimeout(scrollHideTimerRef.current);
      scrollHideTimerRef.current = window.setTimeout(() => setScrollActive(false), 500);
    }
  }, []);

  const handleSelectTile = useCallback(
    (tile: TileId, radial = false, directionOverride?: 'left' | 'right') => {
      if (tile !== 5 && panicActive) {
        stopSpeech();
        stopSanctuaryAudio();
        setPanicActive(false);
      } else if (tile !== 2 && tile !== 5) {
        stopSpeech();
        stopSanctuaryAudio();
      }
      setQuickSettingsOpen(false);
      setNotificationsOpen(false);
      setHasSubView(false);
      setHasScrollOverflow(false);
      setScrollProgress(0);

      if (tile !== activeTile) {
        const diff = (tile - activeTile + TILES.length) % TILES.length;
        const kind: WatchStageTransition['kind'] = radial
          ? 'radial'
          : directionOverride
          ? directionOverride
          : diff <= TILES.length / 2
          ? 'right'
          : 'left';
        setStageTransition((prev) => ({ seq: prev.seq + 1, kind }));
      }
      setActiveTile(tile);
      triggerHaptic();
    },
    [activeTile, panicActive, triggerHaptic]
  );

  const launchVoicePanicAnchor = useCallback(() => {
    primeVoiceAudio();
    dismissStressAlert();
    setQuickSettingsOpen(false);
    setNotificationsOpen(false);
    setHasScrollOverflow(false);
    setScrollProgress(0);
    setStageTransition((prev) => ({ seq: prev.seq + 1, kind: 'radial' }));
    setActiveTile(5);
    setAutoStartPanicSeq((n) => n + 1);
    triggerHaptic('#F0B0A3');
  }, [dismissStressAlert, triggerHaptic]);

  const launchProtocol = useCallback(
    (protocolId: string, minsOverride?: number) => {
      primeVoiceAudio();
      const proto = SOMATIC_PROTOCOLS.find((p) => p.id === protocolId) || SOMATIC_PROTOCOLS[0];
      setActiveTile(2);
      setSomaticExternalSubView({
        type: 'player',
        protocol: proto,
        durationMin: minsOverride ?? state.settings.defaultResetMinutes,
      });
      triggerHaptic();
    },
    [state.settings.defaultResetMinutes, triggerHaptic]
  );

  const handleSideButtonPress = useCallback(() => {
    dismissStressAlert();
    setQuickSettingsOpen(false);
    setNotificationsOpen(false);
    if (panicActive) {
      stopSpeech();
      stopSanctuaryAudio();
      setPanicActive(false);
    }
    if (activeTile === 1 && !hasSubView) {
      handleSelectTile(0, true);
    } else {
      handleSelectTile(1, true);
      triggerHaptic('#F0D57B');
    }
  }, [activeTile, hasSubView, panicActive, dismissStressAlert, handleSelectTile, triggerHaptic]);

  const handleCrownNudge = useCallback(
    (delta: number) => {
      playCrownClick(state.settings.audioEnabled);
      if (state.settings.hapticsEnabled) {
        setHapticPulseSeq((n) => n + 1);
      }

      // Context-aware crown physics on Watch Home (0):
      // Scroll/Arrow Up -> Notifications tile screen above Home
      // Scroll/Arrow Down -> Pixel Watch Wear OS 5 Settings tile screen below Home
      if (
        activeTile === 0 &&
        !hasSubView &&
        !quickSettingsOpen &&
        !notificationsOpen &&
        !activeStressAlert &&
        !state.settings.aodEnabled
      ) {
        if (delta < 0) {
          setQuickSettingsOpen(false);
          setNotificationsOpen(true);
          triggerHaptic('#E8C96D');
        } else if (delta > 0) {
          setNotificationsOpen(false);
          setQuickSettingsOpen(true);
          triggerHaptic('#93BBE0');
        }
        return;
      }

      setScrollActive(true);
      if (scrollHideTimerRef.current) window.clearTimeout(scrollHideTimerRef.current);
      scrollHideTimerRef.current = window.setTimeout(() => setScrollActive(false), 1200);
      setCrownDelta((prev) => ({ seq: prev.seq + 1, delta }));
    },
    [
      state.settings.audioEnabled,
      state.settings.hapticsEnabled,
      state.settings.aodEnabled,
      activeTile,
      hasSubView,
      quickSettingsOpen,
      notificationsOpen,
      activeStressAlert,
      triggerHaptic,
    ]
  );

  const handleOpenQuickSettings = useCallback(() => {
    triggerHaptic('#93BBE0');
    setNotificationsOpen(false);
    setQuickSettingsOpen(true);
  }, [triggerHaptic]);

  const handleOpenNotifications = useCallback(() => {
    triggerHaptic('#E8C96D');
    setQuickSettingsOpen(false);
    setNotificationsOpen(true);
  }, [triggerHaptic]);

  const handleCloseVerticalOverlay = useCallback(() => {
    triggerHaptic();
    setQuickSettingsOpen(false);
    setNotificationsOpen(false);
    if (NON_SCROLLABLE_TILES.has(activeTile)) {
      setHasScrollOverflow(false);
      setScrollProgress(0);
      setScrollActive(false);
    }
  }, [activeTile, triggerHaptic]);

  const handleBackGesture = useCallback(() => {
    triggerHaptic();
    if (quickSettingsOpen) {
      setQuickSettingsOpen(false);
      if (NON_SCROLLABLE_TILES.has(activeTile)) {
        setHasScrollOverflow(false);
        setScrollProgress(0);
        setScrollActive(false);
      }
      return;
    }
    if (notificationsOpen) {
      setNotificationsOpen(false);
      if (NON_SCROLLABLE_TILES.has(activeTile)) {
        setHasScrollOverflow(false);
        setScrollProgress(0);
        setScrollActive(false);
      }
      return;
    }
    if (activeStressAlert) {
      dismissStressAlert();
      return;
    }
    if (hasSubView) {
      setBackSignal((n) => n + 1);
      return;
    }
    if (activeTile !== 0) {
      setActiveTile(0);
    }
  }, [
    triggerHaptic,
    quickSettingsOpen,
    notificationsOpen,
    activeStressAlert,
    dismissStressAlert,
    hasSubView,
    activeTile,
  ]);

  const handleWatchExport = useCallback(() => {
    exportJSON();
    playConfirmChime(state.settings.audioEnabled);
    setExportFlashSeq((n) => n + 1);
    if (exportFlashTimerRef.current) window.clearTimeout(exportFlashTimerRef.current);
    exportFlashTimerRef.current = window.setTimeout(() => {
      setExportFlashSeq(0);
      exportFlashTimerRef.current = null;
    }, 2600);
  }, [exportJSON, state.settings.audioEnabled]);

  const handleSyncWatch = useCallback(() => {
    triggerHaptic('#63D4A3');
    setIsSyncing(true);
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      syncNow();
      setIsSyncing(false);
    }, 950);
  }, [syncNow, triggerHaptic]);

  const handleCloseCompanion = useCallback(() => setCompanionOpen(false), []);
  const handleOpenTherapistModal = useCallback(() => setTherapistModalOpen(true), []);
  const handleTriggerStressSpike = useCallback(() => {
    triggerHaptic();
    triggerStressSpike();
  }, [triggerHaptic, triggerStressSpike]);
  const handleExportMarkdownCurrentRange = useCallback(
    () => exportMarkdown(trendsRange),
    [exportMarkdown, trendsRange]
  );

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  // Global keyboard shortcuts (ArrowLeft/Right tiles, ArrowUp/Down crown, Escape back, Space panic)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!hasSubView && !quickSettingsOpen && !notificationsOpen && !activeStressAlert) {
          handleSelectTile((((activeTile + 1) % TILES.length) as TileId), false, 'right');
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!hasSubView && !quickSettingsOpen && !notificationsOpen && !activeStressAlert) {
          handleSelectTile((((activeTile - 1 + TILES.length) % TILES.length) as TileId), false, 'left');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeTile === 2 && !hasSubView && e.shiftKey) {
          const presets = [1, 2, 3, 5, 8];
          const idx = presets.indexOf(state.settings.defaultResetMinutes);
          const next = idx > 0 ? presets[idx - 1] : presets[0];
          updateSettings({ defaultResetMinutes: next });
        } else if (activeTile === 4 && !hasSubView && e.shiftKey) {
          setTrendsRange(7);
        } else {
          handleCrownNudge(-1);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeTile === 2 && !hasSubView && e.shiftKey) {
          const presets = [1, 2, 3, 5, 8];
          const idx = presets.indexOf(state.settings.defaultResetMinutes);
          const next = idx >= 0 && idx < presets.length - 1 ? presets[idx + 1] : presets[presets.length - 1];
          updateSettings({ defaultResetMinutes: next });
        } else if (activeTile === 4 && !hasSubView && e.shiftKey) {
          setTrendsRange(30);
        } else {
          handleCrownNudge(1);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (therapistModalOpen) {
          setTherapistModalOpen(false);
        } else {
          handleBackGesture();
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleSideButtonPress();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTile,
    hasSubView,
    quickSettingsOpen,
    notificationsOpen,
    activeStressAlert,
    therapistModalOpen,
    state.settings.defaultResetMinutes,
    handleSelectTile,
    handleCrownNudge,
    handleBackGesture,
    handleSideButtonPress,
    updateSettings,
  ]);

  const latestMood = state.moods[0];
  const todayBio = state.dailyBiometrics[state.dailyBiometrics.length - 1];
  const todaySteps = todayBio?.steps ?? 7200;
  const timeText = formatClock(now);
  const verticalOverlay: 'none' | 'notifications' | 'settings' = notificationsOpen
    ? 'notifications'
    : quickSettingsOpen
    ? 'settings'
    : 'none';
  const overlayOpen = quickSettingsOpen || notificationsOpen || Boolean(activeStressAlert);
  const showCompanion = !showcaseMode && companionOpen;
  const tileCrownDelta = verticalOverlay === 'none' ? crownDelta : IDLE_CROWN;
  const tileScrollReport = verticalOverlay === 'none' ? handleScrollReport : NOOP_SCROLL_REPORT;

  // Compute exact viewport-fit scale so the entire watch (bezel, straps, crown & screen) never clips on mobile
  const WATCH_BASE_W = 504;
  const WATCH_BASE_H = 556;
  const isSideBySide = viewport.w >= 920 && showCompanion;
  const sidePanelW = viewport.w >= 1280 ? 356 : 340;
  const availWatchW = isSideBySide
    ? Math.max(320, viewport.w - sidePanelW - 64)
    : Math.max(260, viewport.w - 16);
  const reservedH = showcaseMode ? 76 : viewport.w < 640 ? 124 : 138;
  const availWatchH = Math.max(280, viewport.h - reservedH);
  const watchScale = Math.max(
    0.45,
    Math.min(1, availWatchW / WATCH_BASE_W, availWatchH / WATCH_BASE_H)
  );
  const scaledWatchW = Math.round(WATCH_BASE_W * watchScale);
  const scaledWatchH = Math.round(WATCH_BASE_H * watchScale);

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="no-scrollbar relative flex min-h-[100dvh] w-full flex-col overflow-x-clip bg-[#272525] text-[#F5F4F2] min-[920px]:h-[100dvh] min-[920px]:overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 92% 82% at 50% 42%, #323030 0%, #272525 48%, #171616 100%)',
      }}
    >
      {/* Overhead Neutral Studio Light Shining onto the Watch Showcase */}
      <div
        className="pointer-events-none fixed inset-0 transition-all duration-700"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 64% 46% at 50% -6%, rgba(255, 255, 255, 0.17) 0%, rgba(248, 247, 245, 0.08) 36%, rgba(39, 37, 37, 0) 74%)',
            'linear-gradient(155deg, rgba(255, 255, 255, 0.055) 0%, rgba(39, 37, 37, 0) 42%, rgba(12, 11, 11, 0.34) 100%)',
          ].join(', '),
        }}
      />

      {/* Minimal Floating Top Studio Controls */}
      <div className="no-print relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-4">
        {!showcaseMode ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold tracking-tight text-[#F5F4F2] sm:text-base">
              WELLBE+ <span className="hidden min-[380px]:inline">Watch</span>
            </span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ExpressiveButton
            variant="outlined"
            size="sm"
            selected={showcaseMode}
            leadingIcon={
              showcaseMode ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />
            }
            className="backdrop-blur-sm"
            onClick={() => setShowcaseMode((s) => !s)}
          >
            {showcaseMode ? (
              'Exit Showcase'
            ) : (
              <>
                <span className="hidden sm:inline">Pure </span>Showcase
              </>
            )}
          </ExpressiveButton>

          {!showcaseMode && (
            <ExpressiveButton
              variant="outlined"
              size="sm"
              selected={companionOpen}
              leadingIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              className="backdrop-blur-sm"
              onClick={() => setCompanionOpen((o) => !o)}
            >
              <span className="hidden sm:inline">Studio </span>Controls
            </ExpressiveButton>
          )}
        </div>
      </div>

      {/* Main Full-Width Stage: Centered Pixel Watch 3 + Far-Right Docked Companion Panel */}
      <main
        className={`no-print relative z-10 flex w-full flex-1 flex-col items-center gap-8 px-2 pb-10 sm:gap-10 sm:px-4 min-[920px]:min-h-0 min-[920px]:flex-row min-[920px]:items-center min-[920px]:justify-between min-[920px]:gap-6 min-[920px]:pb-6 min-[920px]:pl-6 min-[920px]:pr-4 ${
          showCompanion ? 'justify-start pt-1 min-[920px]:pt-0' : 'justify-center'
        }`}
      >
        {/* Balancing spacer on ultra-wide screens so watch stays true viewport-center while panel hugs the far-right wall */}
        {showCompanion && (
          <div className="hidden 2xl:block 2xl:w-[356px] 2xl:shrink-0" aria-hidden="true" />
        )}

        {/* Center Watch Stage */}
        <div className="relative flex w-full flex-1 flex-col items-center justify-center">
          {/* Soft Neutral Key-Light Halo Centered Behind Watch */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(640px,100vw)] w-[min(640px,100vw)] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 255, 255, 0.095) 0%, rgba(245, 244, 242, 0.04) 36%, rgba(39, 37, 37, 0) 70%)',
            }}
          />

          {/* Tile Switcher Header Above Watch (hidden in Pure Showcase Mode) */}
          {!showcaseMode && (
            <div className="relative z-10 mb-2 sm:mb-4 flex items-center gap-3">
              <ExpressiveIconButton
                variant="outlined"
                size={32}
                ariaLabel="Previous tile"
                onClick={() =>
                  handleSelectTile(
                    (((activeTile - 1 + TILES.length) % TILES.length) as TileId),
                    false,
                    'left'
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </ExpressiveIconButton>

              <div className="min-w-[164px] sm:min-w-[172px] text-center">
                <p className="text-xs font-semibold text-[#F5F4F2]">{TILES[activeTile].label}</p>
                <p className="font-mono text-[11px] text-[#A8A4A4] tabular-nums">
                  {`Screen ${activeTile + 1} of ${TILES.length}`}
                </p>
              </div>

              <ExpressiveIconButton
                variant="outlined"
                size={32}
                ariaLabel="Next tile"
                onClick={() =>
                  handleSelectTile((((activeTile + 1) % TILES.length) as TileId), false, 'right')
                }
              >
                <ChevronRight className="h-4 w-4" />
              </ExpressiveIconButton>
            </div>
          )}

          {/* Layout-sized responsive wrapper: guarantees the entire watch fits cleanly on any mobile screen */}
          <div
            className="relative z-10 shrink-0"
            style={{
              width: `${scaledWatchW}px`,
              height: `${scaledWatchH}px`,
            }}
          >
            <div
              className="flex origin-top-left items-start justify-center"
              style={{
                width: `${WATCH_BASE_W}px`,
                height: `${WATCH_BASE_H}px`,
                transform: `scale(${watchScale})`,
              }}
            >
            <WatchChassis
              activeTile={activeTile}
              onSelectTile={handleSelectTile}
              onCrownNudge={handleCrownNudge}
              onSideButtonPress={handleSideButtonPress}
              onOpenQuickSettings={handleOpenQuickSettings}
              onOpenNotifications={handleOpenNotifications}
              onCloseVerticalOverlay={handleCloseVerticalOverlay}
              verticalOverlay={verticalOverlay}
              topSheet={
                <NotificationsDrawer
                  timeText={timeText}
                  notifications={state.notifications}
                  crownDelta={notificationsOpen ? crownDelta : IDLE_CROWN}
                  onScrollReport={notificationsOpen ? handleScrollReport : NOOP_SCROLL_REPORT}
                  onLaunchPanic={launchVoicePanicAnchor}
                  onOpenEmotions={() => handleSelectTile(1, true)}
                  onOpenRoutines={() => handleSelectTile(2, true)}
                  onOpenTrends={() => handleSelectTile(4, false)}
                  onClearAll={clearNotifications}
                  onClose={handleCloseVerticalOverlay}
                  onHaptic={triggerHaptic}
                />
              }
              bottomSheet={
                <QuickSettingsShade
                  timeText={timeText}
                  settings={state.settings}
                  biometrics={state.liveBiometrics}
                  crownDelta={quickSettingsOpen ? crownDelta : IDLE_CROWN}
                  onScrollReport={quickSettingsOpen ? handleScrollReport : NOOP_SCROLL_REPORT}
                  onUpdateSettings={updateSettings}
                  onToggleCharging={() =>
                    updateBiometrics({ isCharging: !state.liveBiometrics.isCharging })
                  }
                  onQuickExport={handleWatchExport}
                  onClose={handleCloseVerticalOverlay}
                  onHaptic={triggerHaptic}
                />
              }
              onBackGesture={handleBackGesture}
              hasSubView={hasSubView}
              scrollProgress={scrollProgress}
              hasScrollOverflow={hasScrollOverflow}
              scrollActive={scrollActive}
              hapticPulseSeq={hapticPulseSeq}
              hapticColor={hapticColor}
              hapticsEnabled={state.settings.hapticsEnabled}
              stageTransition={stageTransition}
              caseFinish={state.settings.caseFinish}
              aodEnabled={state.settings.aodEnabled}
              panicActive={panicActive}
              overlayOpen={overlayOpen}
            >
              {/* Active Tile Content: 0 Home | 1 Emotions | 2 Routines | 3 Log | 4 Trends | 5 Panic Anchor */}
              {activeTile === 0 && (
                <WatchFaceTile
                  now={now}
                  latestMood={latestMood}
                  biometrics={state.liveBiometrics}
                  aodEnabled={state.settings.aodEnabled}
                  unreadCount={state.notifications.length}
                  isSyncing={isSyncing}
                  onJumpTile={handleSelectTile}
                  onLaunchPanic={launchVoicePanicAnchor}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  onToggleCharging={() =>
                    updateBiometrics({ isCharging: !state.liveBiometrics.isCharging })
                  }
                  onHaptic={triggerHaptic}
                />
              )}

              {activeTile === 1 && (
                <RulerGridTile
                  timeText={timeText}
                  preselectedTags={[]}
                  latestEmotion={latestMood?.emotion}
                  onLogMood={(q, emo, tags) => {
                    playConfirmChime(state.settings.audioEnabled);
                    const saved = logMood(q, emo, tags);
                    setRecentlyLoggedMood((prev) => ({
                      id: saved.id,
                      seq: (prev?.seq ?? 0) + 1,
                    }));
                    return saved;
                  }}
                  onLaunchPanic={launchVoicePanicAnchor}
                  onLaunchProtocol={(id) => launchProtocol(id)}
                  onOpenMoodLog={() => handleSelectTile(3, true)}
                  onSubViewChange={setHasSubView}
                  onHaptic={triggerHaptic}
                  backSignal={backSignal}
                />
              )}

              {activeTile === 2 && (
                <SomaticResetsTile
                  timeText={timeText}
                  biometrics={state.liveBiometrics}
                  latestMood={latestMood}
                  scheduledRoutines={state.scheduledRoutines}
                  durationMin={state.settings.defaultResetMinutes}
                  audioEnabled={state.settings.audioEnabled}
                  externalSubView={somaticExternalSubView}
                  onConsumeExternalSubView={() => setSomaticExternalSubView(null)}
                  onChangeDuration={(mins) => updateSettings({ defaultResetMinutes: mins })}
                  onToggleAudio={() =>
                    updateSettings({ audioEnabled: !state.settings.audioEnabled })
                  }
                  onLaunchPanic={launchVoicePanicAnchor}
                  onCompleteReset={(params) => {
                    playConfirmChime(state.settings.audioEnabled);
                    logResetSession(params);
                  }}
                  onSaveGratitude={(text, tag) => {
                    logGratitude(text, tag);
                    const saved = logMood('green', 'Grateful', [tag], text);
                    setRecentlyLoggedMood((prev) => ({
                      id: saved.id,
                      seq: (prev?.seq ?? 0) + 1,
                    }));
                  }}
                  onAddRoutine={addScheduledRoutine}
                  onToggleRoutine={toggleScheduledRoutine}
                  onSubViewChange={setHasSubView}
                  crownDelta={tileCrownDelta}
                  onScrollReport={tileScrollReport}
                  onHaptic={triggerHaptic}
                  backSignal={backSignal}
                />
              )}

              {activeTile === 3 && (
                <MoodLogTile
                  timeText={timeText}
                  moods={state.moods}
                  gratitudes={state.gratitudes}
                  onToggleTag={toggleTagOnMood}
                  onDeleteMood={deleteMood}
                  onDeleteGratitude={deleteGratitude}
                  onJumpToEmotions={() => handleSelectTile(1, true)}
                  onSyncNow={handleSyncWatch}
                  isSyncing={isSyncing}
                  onSubViewChange={setHasSubView}
                  crownDelta={tileCrownDelta}
                  onScrollReport={tileScrollReport}
                  onHaptic={triggerHaptic}
                  backSignal={backSignal}
                  recentlyLoggedMood={recentlyLoggedMood}
                  onConsumeRecentlyLogged={() => setRecentlyLoggedMood(null)}
                />
              )}

              {activeTile === 4 && (
                <TrendsAnalyticsTile
                  timeText={timeText}
                  state={state}
                  rangeDays={trendsRange}
                  onChangeRange={setTrendsRange}
                  onStartReset={(protocolId) => launchProtocol(protocolId, 3)}
                  onOpenFullTherapistSheet={() => setTherapistModalOpen(true)}
                  isSyncing={isSyncing}
                  onSubViewChange={setHasSubView}
                  crownDelta={tileCrownDelta}
                  onScrollReport={tileScrollReport}
                  onHaptic={triggerHaptic}
                  backSignal={backSignal}
                />
              )}

              {activeTile === 5 && (
                <VoicePanicAnchorTile
                  timeText={timeText}
                  biometrics={state.liveBiometrics}
                  audioEnabled={state.settings.audioEnabled}
                  autoStartSeq={autoStartPanicSeq}
                  onConsumeAutoStart={() => setAutoStartPanicSeq(0)}
                  onToggleAudio={() =>
                    updateSettings({ audioEnabled: !state.settings.audioEnabled })
                  }
                  onCompleteReset={(params) => {
                    playConfirmChime(state.settings.audioEnabled);
                    logResetSession(params);
                  }}
                  onPanicStateChange={setPanicActive}
                  onSubViewChange={setHasSubView}
                  onHaptic={triggerHaptic}
                  backSignal={backSignal}
                />
              )}

              {activeTile === 6 && (
                <StepCounterTile
                  timeText={timeText}
                  steps={todaySteps}
                  goal={10000}
                  dailyBiometrics={state.dailyBiometrics}
                  onAddSteps={(delta) => updateTodaySteps(todaySteps + delta)}
                  onHaptic={triggerHaptic}
                />
              )}

              {activeTile === 7 && (
                <SleepTrackerTile
                  timeText={timeText}
                  sleepHours={state.liveBiometrics.sleepHours}
                  deepPct={todayBio?.sleepDeepPct ?? 21}
                  remPct={todayBio?.sleepRemPct ?? 24}
                  goalHours={8}
                  onUpdateSleep={updateTodaySleep}
                  onHaptic={triggerHaptic}
                />
              )}

              {activeStressAlert && (
                <StressAlertOverlay
                  alert={activeStressAlert}
                  onLaunchPanic={launchVoicePanicAnchor}
                  onOpenGrid={() => {
                    dismissStressAlert();
                    handleSelectTile(1, true);
                  }}
                  onDismiss={dismissStressAlert}
                />
              )}
            </WatchChassis>
            </div>
          </div>
        </div>

        {/* Far-Right Anchored Companion Studio Panel */}
        {showCompanion && (
          <div className="flex w-full justify-center min-[920px]:ml-auto min-[920px]:w-[340px] min-[920px]:shrink-0 min-[920px]:justify-end xl:w-[356px]">
            <CompanionPanel
              open={companionOpen}
              onClose={handleCloseCompanion}
              activeTile={activeTile}
              onSelectTile={handleSelectTile}
              biometrics={state.liveBiometrics}
              settings={state.settings}
              exportFlashSeq={exportFlashSeq}
              onUpdateBiometrics={updateBiometrics}
              onTriggerStressSpike={handleTriggerStressSpike}
              onSyncWatch={handleSyncWatch}
              isSyncing={isSyncing}
              onUpdateSettings={updateSettings}
              onOpenTherapistModal={handleOpenTherapistModal}
              onExportJSON={exportJSON}
              onExportCSV={exportCSV}
              onExportMarkdown={handleExportMarkdownCurrentRange}
              onResetDemoData={resetDemoData}
            />
          </div>
        )}
      </main>

      {/* One-Page Therapist Summary & Print Modal (mounted lazily when open to avoid idle analytics work) */}
      {therapistModalOpen && (
        <TherapistSummaryModal
          open={therapistModalOpen}
          onClose={() => setTherapistModalOpen(false)}
          state={state}
          rangeDays={trendsRange}
          onChangeRange={setTrendsRange}
          onExportJSON={exportJSON}
          onExportCSV={exportCSV}
          onExportMarkdown={exportMarkdown}
        />
      )}
    </div>
    </MotionConfig>
  );
}
