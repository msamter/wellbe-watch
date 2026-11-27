import React, { useId } from 'react';
import {
  BarChart3,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Bell,
  ShieldAlert,
  Sun,
  Zap,
} from 'lucide-react';
import { LiveBiometrics, MoodEntry, RULER_THEMES, TileId } from '../../types';
import { ExpressiveButton, ExpressiveChip, ExpressiveIconButton } from '../watch/ExpressiveControls';
import { ExpressiveMorphLoader } from '../watch/ExpressiveLoaders';
import {
  CurvedEdgeArc,
  MicroRollNumber,
  formatClock,
  formatRelativeTime,
  formatSleepHours,
} from '../watch/WearPrimitives';

interface WatchFaceTileProps {
  now: Date;
  latestMood?: MoodEntry;
  biometrics: LiveBiometrics;
  aodEnabled: boolean;
  unreadCount: number;
  isSyncing?: boolean;
  onJumpTile: (tile: TileId, radial?: boolean) => void;
  onLaunchPanic: () => void;
  onOpenNotifications: () => void;
  onToggleCharging?: () => void;
  onHaptic: (color?: string) => void;
}

export const WatchFaceTile: React.FC<WatchFaceTileProps> = ({
  now,
  latestMood,
  biometrics,
  aodEnabled,
  unreadCount,
  isSyncing = false,
  onJumpTile,
  onLaunchPanic,
  onOpenNotifications,
  onToggleCharging,
  onHaptic,
}) => {
  const topLeftPathId = useId();
  const topRightPathId = useId();
  const theme = RULER_THEMES[latestMood?.quadrant || 'green'];
  const clockStr = formatClock(now);
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const hrvProgress = Math.min(1, Math.max(0.12, biometrics.readiness / 100));
  const sleepProgress = Math.min(1, Math.max(0.12, biometrics.sleepHours / 8.5));
  const batteryLevel = Math.max(1, Math.min(100, Math.round(biometrics.batteryLevel ?? 84)));
  const isCharging = Boolean(biometrics.isCharging);

  const batteryColor = isCharging
    ? '#63D4A3'
    : batteryLevel <= 20
    ? '#F0B0A3'
    : batteryLevel <= 45
    ? '#E8C96D'
    : '#A4DCC0';

  const BatteryStatusIcon = isCharging
    ? BatteryCharging
    : batteryLevel <= 20
    ? BatteryLow
    : batteryLevel <= 65
    ? BatteryMedium
    : BatteryFull;

  const isCompactClock = clockStr.length <= 4;

  // Always-On Display (AOD) monochrome low-power face stays true OLED black
  if (aodEnabled) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-black px-6 text-center">
        <div
          className="absolute top-[24px] left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-[10px] tabular-nums text-white/45"
          aria-label={`Battery ${batteryLevel}%${isCharging ? ', charging' : ''}`}
        >
          <BatteryStatusIcon
            className="h-3.5 w-3.5"
            style={{ color: isCharging ? '#63D4A3' : 'rgba(255,255,255,0.45)' }}
          />
          <span>{batteryLevel}%</span>
          {isCharging && <Zap className="h-2.5 w-2.5 fill-[#63D4A3] text-[#63D4A3]" />}
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
          {dateStr}
        </p>
        <div
          className={`mt-1 font-sans font-light leading-[0.86] tracking-[-0.05em] text-transparent tabular-nums ${
            isCompactClock ? 'text-[120px]' : 'text-[110px]'
          }`}
          style={{
            WebkitTextStroke: '2px rgba(255,255,255,0.78)',
          }}
        >
          {clockStr}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[12px] text-white/50">
          <span
            className="h-2 w-2 rounded-full opacity-75"
            style={{ backgroundColor: theme.accent }}
          />
          <span>{latestMood?.emotion || 'Calm'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{biometrics.hr} bpm</span>
        </div>
        <p className="mt-6 text-[10px] tracking-widest text-white/25 uppercase">
          Always-On Display
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#121514]">
      {/* Breathing Ambient Quadrant Halo with smooth 350ms emotional crossfade */}
      <div
        className="animate-watch-halo pointer-events-none absolute inset-6 rounded-full blur-2xl transition-all duration-[350ms] ease-out"
        style={{
          background: `radial-gradient(circle, ${theme.softGlow} 0%, rgba(18,21,20,0) 70%)`,
        }}
      />

      {/* Top-Center 12-o'clock Watch Battery & Charging Status Indicator */}
      <ExpressiveChip
        size="xs"
        selected={isCharging}
        onClick={() => {
          if (!onToggleCharging) return;
          onHaptic(isCharging ? '#A4DCC0' : '#63D4A3');
          onToggleCharging();
        }}
        accentColor={batteryColor}
        selectedSurface="#152920"
        selectedBorder="rgba(99,212,163,0.45)"
        ariaLabel={`Watch battery ${batteryLevel}%${isCharging ? ', charging' : ''}`}
        title={isCharging ? 'Charging — tap to unplug' : 'Tap to simulate charging'}
        className="absolute top-[20px] left-1/2 z-20 -translate-x-1/2 font-mono tabular-nums backdrop-blur-sm"
        style={{
          color: batteryColor,
          backgroundColor: isCharging ? '#152920' : 'rgba(24,28,27,0.85)',
          borderColor: isCharging ? 'rgba(99,212,163,0.45)' : 'rgba(255,255,255,0.1)',
        }}
        icon={<BatteryStatusIcon className="h-3.5 w-3.5 shrink-0" />}
        label={
          <span className="inline-flex items-center">
            <MicroRollNumber value={batteryLevel} />
            <span className="text-[9.5px] opacity-85">%</span>
          </span>
        }
        trailing={
          isCharging ? (
            <Zap
              className="h-2.5 w-2.5 shrink-0 fill-[#63D4A3] text-[#63D4A3] animate-pulse"
              aria-hidden="true"
            />
          ) : undefined
        }
      />

      {/* Outer Curved Arc Complications */}
      <CurvedEdgeArc
        startAngle={294}
        endAngle={344}
        progress={hrvProgress}
        radius={193}
        strokeWidth={6}
        color="#63D4A3"
        trackColor="#262C2A"
      />
      <CurvedEdgeArc
        startAngle={16}
        endAngle={66}
        progress={sleepProgress}
        radius={193}
        strokeWidth={6}
        color="#93BBE0"
        trackColor="#262C2A"
      />

      {/* Curved Complication Labels Along Upper Perimeter */}
      <svg
        width="412"
        height="412"
        viewBox="0 0 412 412"
        className="pointer-events-none absolute inset-0 z-10"
      >
        <defs>
          <path id={topLeftPathId} d="M 48 134 A 173 173 0 0 1 160 39" fill="none" />
          <path id={topRightPathId} d="M 252 39 A 173 173 0 0 1 364 134" fill="none" />
        </defs>
        <text
          fill="#8FD8B5"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing="0.04em"
          className="font-mono"
        >
          <textPath href={`#${topLeftPathId}`} startOffset="52%" textAnchor="middle">
            {`${biometrics.hrv}ms · Ready`}
          </textPath>
        </text>
        <text
          fill="#93BBE0"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing="0.04em"
          className="font-mono"
        >
          <textPath href={`#${topRightPathId}`} startOffset="48%" textAnchor="middle">
            {formatSleepHours(biometrics.sleepHours)}
          </textPath>
        </text>
      </svg>

      {/* Tap Complication Shortcut: Top-Right Sleep Arc -> 07 Sleep Tracker */}
      <button
        type="button"
        onClick={() => {
          onHaptic('#A8C7FA');
          onJumpTile(7, false);
        }}
        aria-label="Open Sleep Tracker"
        className="absolute right-[44px] top-[34px] z-20 h-[62px] w-[108px] rounded-full"
      />

      {/* Center Focal Point */}
      <div className="relative z-10 mt-6 flex flex-col items-center text-center">
        <span className="text-[10.5px] font-semibold tracking-wider text-[#9CA3A0] uppercase">
          {dateStr}
        </span>

        <div
          className={`mt-0.5 font-extrabold leading-[0.86] tracking-[-0.05em] text-[#F4F6F5] tabular-nums ${
            isCompactClock ? 'text-[116px]' : 'text-[106px]'
          }`}
        >
          {clockStr}
        </div>

        {/* Live Mood Status Interactive Pill (M3 Expressive Pill -> Squircle Press) */}
        <ExpressiveButton
          size="xs"
          onClick={() => {
            onHaptic(theme.accent);
            onJumpTile(1, true);
          }}
          surfaceColor={theme.surface}
          borderColor={theme.border}
          accentColor={theme.accent}
          className="mt-2.5 px-3.5 text-[11.5px]"
          leadingIcon={
            <span
              className="h-2.5 w-2.5 rounded-full transition-colors duration-[350ms]"
              style={{ backgroundColor: theme.accent }}
            />
          }
          trailingIcon={
            <span className="font-mono text-[10px] font-medium text-[#D1D6D4]/80 tabular-nums">
              {latestMood ? formatRelativeTime(latestMood.timestamp) : 'Now'}
            </span>
          }
        >
          {latestMood?.emotion || 'Calm'}
        </ExpressiveButton>

        {/* Live HR micro-readout with M3 Expressive Morph Loader while syncing */}
        <div className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] text-[#9CA3A0] tabular-nums">
          {isSyncing ? (
            <div className="flex items-center gap-1.5 text-[#63D4A3]">
              <ExpressiveMorphLoader size={18} label="Syncing watch biometrics" />
              <span>Syncing sensors…</span>
            </div>
          ) : (
            <>
              <span>
                HR <MicroRollNumber value={biometrics.hr} className="text-[#E5E9E7]" /> bpm
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">cEDA {biometrics.cedaLevel}</span>
            </>
          )}
        </div>
      </div>

      {/* 3 Circular Bottom-Arc Quick-Launch Complications: Anchor (Left) | Emotions (Center) | Trends (Right) */}
      <div className="relative z-10 mt-2.5 flex items-end justify-center gap-4">
        {/* Left: Panic Anchor */}
        <div className="-translate-y-2 flex flex-col items-center gap-1">
          <ExpressiveIconButton
            size={44}
            onClick={() => {
              onHaptic('#F0B0A3');
              onLaunchPanic();
            }}
            ariaLabel="Launch Voice Panic Anchor"
            surfaceColor="#2F1C19"
            borderColor="rgba(232,155,140,0.5)"
            accentColor="#E89B8C"
          >
            <ShieldAlert className="h-[18px] w-[18px]" />
          </ExpressiveIconButton>
          <span className="text-[10px] font-semibold text-[#E89B8C]">Anchor</span>
        </div>

        {/* Center (Lowest Arc): Emotions Check-In */}
        <div className="translate-y-1 flex flex-col items-center gap-1">
          <ExpressiveIconButton
            size={50}
            onClick={() => {
              onHaptic('#F0D57B');
              onJumpTile(1, true);
            }}
            ariaLabel="Open Emotions Check-In"
            surfaceColor="#332D1F"
            borderColor="#685B3A"
            accentColor="#F0D57B"
          >
            <Sun className="h-[20px] w-[20px]" />
          </ExpressiveIconButton>
          <span className="text-[10px] font-semibold text-[#F0D57B]">Emotions</span>
        </div>

        {/* Right: Trends Tile (Green) */}
        <div className="-translate-y-2 flex flex-col items-center gap-1">
          <ExpressiveIconButton
            size={44}
            onClick={() => {
              onHaptic('#63D4A3');
              onJumpTile(4, false);
            }}
            ariaLabel="Open Trends Tile"
            surfaceColor="#1F3028"
            borderColor="#3F6352"
            accentColor="#A4DCC0"
          >
            <BarChart3 className="h-[18px] w-[18px]" />
          </ExpressiveIconButton>
          <span className="text-[10px] font-semibold text-[#A4DCC0]">Trends</span>
        </div>
      </div>

      {/* Subtle Bottom Notification Indicator Button */}
      {unreadCount > 0 && (
        <ExpressiveIconButton
          size={26}
          onClick={() => {
            onHaptic();
            onOpenNotifications();
          }}
          ariaLabel="Open Notifications"
          surfaceColor="#1C211F"
          borderColor="#343B38"
          accentColor="#E8C96D"
          className="absolute bottom-[18px] right-[96px] z-20"
          title="Swipe down from Home for WELLBE+ notifications"
        >
          <Bell className="h-3 w-3" />
        </ExpressiveIconButton>
      )}
    </div>
  );
};
