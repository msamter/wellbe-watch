import React, { useId } from 'react';
import { BarChart3, Bell, ShieldAlert, Sun } from 'lucide-react';
import { LiveBiometrics, MoodEntry, RULER_THEMES, TileId } from '../../types';
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
  onJumpTile: (tile: TileId, radial?: boolean) => void;
  onLaunchPanic: () => void;
  onOpenNotifications: () => void;
  onHaptic: (color?: string) => void;
}

export const WatchFaceTile: React.FC<WatchFaceTileProps> = ({
  now,
  latestMood,
  biometrics,
  aodEnabled,
  unreadCount,
  onJumpTile,
  onLaunchPanic,
  onOpenNotifications,
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

  const isCompactClock = clockStr.length <= 4;

  // Always-On Display (AOD) monochrome low-power face stays true OLED black
  if (aodEnabled) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-black px-6 text-center">
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

        {/* Live Mood Status Interactive Pill */}
        <button
          type="button"
          onClick={() => {
            onHaptic(theme.accent);
            onJumpTile(1, true);
          }}
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          className="wear-press mt-2.5 flex items-center gap-2 rounded-full border px-3.5 py-1 text-[11.5px] font-semibold transition-colors duration-[350ms] active:scale-[0.93]"
        >
          <span
            className="h-2.5 w-2.5 rounded-full transition-colors duration-[350ms]"
            style={{ backgroundColor: theme.accent }}
          />
          <span style={{ color: theme.accent }}>{latestMood?.emotion || 'Calm'}</span>
          <span className="font-mono text-[10px] text-[#D1D6D4]/80 tabular-nums">
            {latestMood ? formatRelativeTime(latestMood.timestamp) : 'Now'}
          </span>
        </button>

        {/* Live HR micro-readout with 140ms Micro-Rolling Numerals */}
        <div className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] text-[#9CA3A0] tabular-nums">
          <span>
            HR <MicroRollNumber value={biometrics.hr} className="text-[#E5E9E7]" /> bpm
          </span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">cEDA {biometrics.cedaLevel}</span>
        </div>
      </div>

      {/* 3 Circular Bottom-Arc Quick-Launch Complications: Anchor (Left) | Emotions (Center) | Trends (Right) */}
      <div className="relative z-10 mt-2.5 flex items-end justify-center gap-4">
        {/* Left: Panic Anchor */}
        <button
          type="button"
          onClick={() => {
            onHaptic('#F0B0A3');
            onLaunchPanic();
          }}
          className="wear-press group -translate-y-2 flex flex-col items-center gap-1 active:scale-[0.93]"
          aria-label="Launch Voice Panic Anchor"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E89B8C]/50 bg-[#2F1C19] text-[#E89B8C] transition-colors group-hover:brightness-115">
            <ShieldAlert className="h-[18px] w-[18px]" />
          </div>
          <span className="text-[10px] font-semibold text-[#E89B8C]">Anchor</span>
        </button>

        {/* Center (Lowest Arc): Emotions Check-In */}
        <button
          type="button"
          onClick={() => {
            onHaptic('#F0D57B');
            onJumpTile(1, true);
          }}
          className="wear-press group translate-y-1 flex flex-col items-center gap-1 active:scale-[0.93]"
          aria-label="Open Emotions Check-In"
        >
          <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[#685B3A] bg-[#332D1F] text-[#F0D57B] transition-colors group-hover:brightness-115">
            <Sun className="h-[20px] w-[20px]" />
          </div>
          <span className="text-[10px] font-semibold text-[#F0D57B]">Emotions</span>
        </button>

        {/* Right: Trends Tile (Green) */}
        <button
          type="button"
          onClick={() => {
            onHaptic('#63D4A3');
            onJumpTile(4, false);
          }}
          className="wear-press group -translate-y-2 flex flex-col items-center gap-1 active:scale-[0.93]"
          aria-label="Open Trends Tile"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#3F6352] bg-[#1F3028] text-[#A4DCC0] transition-colors group-hover:brightness-115">
            <BarChart3 className="h-[18px] w-[18px]" />
          </div>
          <span className="text-[10px] font-semibold text-[#A4DCC0]">Trends</span>
        </button>
      </div>

      {/* Subtle Bottom Notification Indicator Button */}
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={() => {
            onHaptic();
            onOpenNotifications();
          }}
          aria-label="Open Notifications"
          className="absolute bottom-[18px] right-[96px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#343B38] bg-[#1C211F] text-[#E8C96D] active:scale-90"
          title="Swipe up for Body-Response alerts"
        >
          <Bell className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
