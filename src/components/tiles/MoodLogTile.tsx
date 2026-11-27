import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  Clock,
  Heart,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  CONTEXT_TAGS,
  GratitudeEntry,
  MoodEntry,
  RULER_THEMES,
  RulerQuadrant,
} from '../../types';
import { m3Colors, m3Shapes, m3Springs } from '../../styles/m3Tokens';
import {
  ExpressiveMorphLoader,
  ExpressiveWatchCardSkeleton,
} from '../watch/ExpressiveLoaders';
import {
  CurvedTimeText,
  MicroRollNumber,
  WearScrollColumn,
  formatRelativeTime,
} from '../watch/WearPrimitives';
import { AnimatedLogEmotionName } from '../watch/EmotionPersonality';
import { ExpressiveButton, ExpressiveChip } from '../watch/ExpressiveControls';

interface MoodLogTileProps {
  timeText: string;
  moods: MoodEntry[];
  gratitudes: GratitudeEntry[];
  onToggleTag: (moodId: string, tag: string) => void;
  onDeleteMood: (moodId: string) => void;
  onDeleteGratitude: (gratitudeId: string) => void;
  onJumpToEmotions: () => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  onSubViewChange?: (active: boolean) => void;
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onHaptic: (color?: string) => void;
  backSignal?: number;
  recentlyLoggedMood?: { id: string; seq: number } | null;
  onConsumeRecentlyLogged?: () => void;
}

type LogFilter = 'all' | RulerQuadrant | 'gratitude';

type TimelineItem =
  | { kind: 'mood'; id: string; timestamp: string; entry: MoodEntry }
  | { kind: 'gratitude'; id: string; timestamp: string; entry: GratitudeEntry };

const FILTER_OPTIONS: { id: LogFilter; label: string; dotColor?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'yellow', label: 'Yellow', dotColor: RULER_THEMES.yellow.accent },
  { id: 'green', label: 'Green', dotColor: RULER_THEMES.green.accent },
  { id: 'blue', label: 'Blue', dotColor: RULER_THEMES.blue.accent },
  { id: 'red', label: 'Red', dotColor: RULER_THEMES.red.accent },
  { id: 'gratitude', label: 'Gratitude', dotColor: '#63D4A3' },
];

function formatExactTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const MoodLogTile: React.FC<MoodLogTileProps> = ({
  timeText,
  moods,
  gratitudes,
  onToggleTag,
  onDeleteMood,
  onDeleteGratitude,
  onJumpToEmotions,
  onSyncNow,
  isSyncing = false,
  onSubViewChange,
  crownDelta,
  onScrollReport,
  onHaptic,
  backSignal = 0,
  recentlyLoggedMood = null,
  onConsumeRecentlyLogged,
}) => {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [filterSeq, setFilterSeq] = useState(0);
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [selectedGratitudeId, setSelectedGratitudeId] = useState<string | null>(null);
  const [highlightedMood, setHighlightedMood] = useState<{ id: string; seq: number } | null>(
    recentlyLoggedMood
  );
  const consumeLoggedRef = React.useRef(onConsumeRecentlyLogged);
  consumeLoggedRef.current = onConsumeRecentlyLogged;

  // Trigger the fresh-log UI animation once per newly logged emotion when shown in the Emotion Log
  useEffect(() => {
    if (!recentlyLoggedMood) return;
    const { id, seq } = recentlyLoggedMood;
    setHighlightedMood({ id, seq });
    const timer = window.setTimeout(() => {
      setHighlightedMood((cur) => (cur?.seq === seq ? null : cur));
      consumeLoggedRef.current?.();
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [recentlyLoggedMood?.id, recentlyLoggedMood?.seq]);

  const selectedMood = useMemo(
    () => (selectedMoodId ? moods.find((m) => m.id === selectedMoodId) || null : null),
    [moods, selectedMoodId]
  );

  const selectedGratitude = useMemo(
    () =>
      selectedGratitudeId
        ? gratitudes.find((g) => g.id === selectedGratitudeId) || null
        : null,
    [gratitudes, selectedGratitudeId]
  );

  const hasDetail = Boolean(selectedMood || selectedGratitude);

  useEffect(() => {
    onSubViewChange?.(hasDetail);
  }, [hasDetail, onSubViewChange]);

  useEffect(() => {
    if (backSignal > 0 && hasDetail) {
      setSelectedMoodId(null);
      setSelectedGratitudeId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backSignal]);

  const counts = useMemo(() => {
    const q: Record<RulerQuadrant, number> = { red: 0, yellow: 0, blue: 0, green: 0 };
    for (const m of moods) {
      q[m.quadrant] += 1;
    }
    return {
      all: moods.length + gratitudes.length,
      ...q,
      gratitude: gratitudes.length,
    };
  }, [moods, gratitudes]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    if (filter === 'all' || filter === 'gratitude') {
      for (const g of gratitudes) {
        items.push({ kind: 'gratitude', id: `g-${g.id}`, timestamp: g.timestamp, entry: g });
      }
    }

    if (filter !== 'gratitude') {
      for (const m of moods) {
        if (filter === 'all' || m.quadrant === filter) {
          items.push({ kind: 'mood', id: `m-${m.id}`, timestamp: m.timestamp, entry: m });
        }
      }
    }

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 40);
  }, [moods, gratitudes, filter]);

  // Sub-view A: Mood Entry Detail Sheet (1:1 left-edge back peek supported)
  if (selectedMood) {
    const theme = RULER_THEMES[selectedMood.quadrant];
    return (
      <div
        key={`mood-detail-${selectedMood.id}`}
        className="animate-radial-reveal relative h-full w-full bg-[#121514]"
      >
        <CurvedTimeText timeText={timeText} label="Entry Detail" />

        <WearScrollColumn
          key={`scroll-mood-${selectedMood.id}`}
          crownDelta={crownDelta}
          onScrollReport={onScrollReport}
          paddingTopClass="pt-[46px]"
          paddingBottomClass="pb-[56px]"
        >
          <div className="flex flex-col gap-2.5">
            {/* Emotion Header Card */}
            <div
              className="rounded-[20px] border p-3.5 text-center"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            >
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: theme.accent }}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                />
                <span>{`${theme.name} · ${theme.energyLabel}`}</span>
              </div>
              <h3 className="mt-1.5 text-[18px] font-bold text-[#F4F6F5]">
                {selectedMood.emotion}
              </h3>
              <p className="mt-0.5 flex items-center justify-center gap-1 font-mono text-[10px] text-[#D1D6D4]/85 tabular-nums">
                <Clock className="h-3 w-3 opacity-80" />
                <span>{formatExactTime(selectedMood.timestamp)}</span>
              </p>
            </div>

            {/* Biometric Snapshot at Check-In */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-[14px] border border-[#2B312F] bg-[#181C1B] py-2 text-center">
                <p className="text-[9px] text-[#9CA3A0]">HR</p>
                <p className="mt-0.5 font-mono text-[11.5px] font-bold text-[#F4F6F5] tabular-nums">
                  {`${selectedMood.hrAtLog} bpm`}
                </p>
              </div>
              <div className="rounded-[14px] border border-[#2B312F] bg-[#181C1B] py-2 text-center">
                <p className="text-[9px] text-[#9CA3A0]">HRV</p>
                <p className="mt-0.5 font-mono text-[11.5px] font-bold text-[#63D4A3] tabular-nums">
                  {`${selectedMood.hrvAtLog} ms`}
                </p>
              </div>
              <div className="rounded-[14px] border border-[#2B312F] bg-[#181C1B] py-2 text-center">
                <p className="text-[9px] text-[#9CA3A0]">Sleep</p>
                <p className="mt-0.5 font-mono text-[11.5px] font-bold text-[#B0CCE5] tabular-nums">
                  {`${selectedMood.sleepHoursAtLog.toFixed(1)}h`}
                </p>
              </div>
            </div>

            {/* Optional Note */}
            {selectedMood.note && (
              <div className="rounded-[18px] border border-[#2B312F] bg-[#181C1B] p-3 text-left">
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-[#9CA3A0]">
                  Reflection Note
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[#E5E9E7]">
                  {selectedMood.note}
                </p>
              </div>
            )}

            {/* Editable Context Tags */}
            <div className="rounded-[18px] border border-[#2B312F] bg-[#181C1B] p-3 text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9CA3A0]">
                <Tag className="h-3 w-3 text-[#63D4A3]" />
                <span>Context Tags</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CONTEXT_TAGS.map((tag) => {
                  const active = selectedMood.tags.includes(tag);
                  return (
                    <ExpressiveChip
                      key={tag}
                      label={tag}
                      selected={active}
                      showCheckOnSelect
                      size="xs"
                      onClick={() => {
                        onHaptic(theme.accent);
                        onToggleTag(selectedMood.id, tag);
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Actions: Back & Delete */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <ExpressiveButton
                variant="outlined"
                size="sm"
                fullWidth
                leadingIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={() => {
                  onHaptic();
                  setSelectedMoodId(null);
                }}
              >
                Back
              </ExpressiveButton>

              <ExpressiveButton
                variant="danger"
                size="sm"
                fullWidth
                leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  onHaptic('#F0B0A3');
                  const idToDelete = selectedMood.id;
                  setSelectedMoodId(null);
                  onDeleteMood(idToDelete);
                }}
              >
                Delete
              </ExpressiveButton>
            </div>
          </div>
        </WearScrollColumn>
      </div>
    );
  }

  // Sub-view B: Gratitude Entry Detail Sheet
  if (selectedGratitude) {
    return (
      <div
        key={`gratitude-detail-${selectedGratitude.id}`}
        className="animate-radial-reveal relative h-full w-full bg-[#121514]"
      >
        <CurvedTimeText timeText={timeText} label="Gratitude" />

        <WearScrollColumn
          key={`scroll-gratitude-${selectedGratitude.id}`}
          crownDelta={crownDelta}
          onScrollReport={onScrollReport}
          paddingTopClass="pt-[46px]"
          paddingBottomClass="pb-[56px]"
        >
          <div className="flex flex-col gap-3">
            <div className="rounded-[20px] border border-[#2A4D3D] bg-[#15221C] p-3.5 text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#63D4A3]/15 text-[#63D4A3]">
                <Heart className="h-4 w-4" />
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#63D4A3]">
                {selectedGratitude.tag}
              </p>
              <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-[#F4F6F5]">
                &ldquo;{selectedGratitude.text}&rdquo;
              </p>
              <p className="mt-2 font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
                {formatExactTime(selectedGratitude.timestamp)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ExpressiveButton
                variant="outlined"
                size="sm"
                fullWidth
                leadingIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={() => {
                  onHaptic();
                  setSelectedGratitudeId(null);
                }}
              >
                Back
              </ExpressiveButton>

              <ExpressiveButton
                variant="danger"
                size="sm"
                fullWidth
                leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  onHaptic('#F0B0A3');
                  const idToDelete = selectedGratitude.id;
                  setSelectedGratitudeId(null);
                  onDeleteGratitude(idToDelete);
                }}
              >
                Delete
              </ExpressiveButton>
            </div>
          </div>
        </WearScrollColumn>
      </div>
    );
  }

  return (
    <div key="mood-log-main" className="relative h-full w-full bg-[#121514]">
      <CurvedTimeText timeText={timeText} label="Mood Log" />

      <WearScrollColumn
        key="scroll-mood-log-main"
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        paddingTopClass="pt-[40px]"
        paddingBottomClass="pb-[56px]"
        resetScrollKey={`${filter}-${filterSeq}`}
      >
        <div className="flex flex-col gap-2">
          {/* Compact Header Count + Shape-Morphing Actions */}
          <div className="flex flex-col items-center text-center">
            <p className="font-mono text-[10px] text-[#9CA3A0] tabular-nums">
              <MicroRollNumber value={moods.length} className="font-semibold text-[#E5E9E7]" />
              {' moods · '}
              <MicroRollNumber value={gratitudes.length} className="font-semibold text-[#63D4A3]" />
              {' gratitudes'}
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <ExpressiveButton
                variant="tonal"
                size="xs"
                surfaceColor="#152920"
                accentColor="#63D4A3"
                borderColor="rgba(99, 212, 163, 0.45)"
                leadingIcon={<Plus className="h-3 w-3 stroke-[2.5]" />}
                onClick={() => {
                  onHaptic('#63D4A3');
                  onJumpToEmotions();
                }}
              >
                Log Emotion
              </ExpressiveButton>

              {onSyncNow && (
                <ExpressiveButton
                  variant="outlined"
                  size="xs"
                  aria-label="Sync mood log"
                  leadingIcon={
                    isSyncing ? (
                      <ExpressiveMorphLoader size={16} label="Syncing mood timeline" />
                    ) : (
                      <RefreshCw className="h-3 w-3 text-[#63D4A3]" />
                    )
                  }
                  onClick={() => {
                    onHaptic('#63D4A3');
                    onSyncNow();
                  }}
                >
                  {isSyncing ? 'Syncing' : 'Sync'}
                </ExpressiveButton>
              )}
            </div>
          </div>

          {/* M3 Expressive Shape-Morphing Category Filter Chips (Pill -> 10px Rounded Square on Select) */}
          <div className="flex flex-wrap items-center justify-center gap-1">
            {FILTER_OPTIONS.map((opt) => {
              const active = filter === opt.id;
              const count = counts[opt.id];
              return (
                <ExpressiveChip
                  key={opt.id}
                  label={opt.label}
                  selected={active}
                  size="xs"
                  leadingDotColor={opt.dotColor}
                  selectedSurface={m3Colors.surfaceContainerHighest}
                  selectedBorder={opt.dotColor || m3Colors.primary}
                  accentColor={m3Colors.onSurface}
                  trailing={
                    <span className="font-mono text-[8.5px] opacity-75 tabular-nums">
                      <MicroRollNumber value={count} />
                    </span>
                  }
                  onClick={() => {
                    onHaptic(opt.dotColor || '#63D4A3');
                    setFilter(opt.id);
                    setFilterSeq((s) => s + 1);
                  }}
                />
              );
            })}
          </div>

          {/* Expressive Skeleton -> Spring-Staggered Timeline Entries */}
          <AnimatePresence mode="wait">
            {isSyncing ? (
              <motion.div
                key="timeline-skeletons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={m3Springs.defaultEffects}
                className="flex flex-col gap-2"
              >
                <ExpressiveWatchCardSkeleton variant="timeline" />
                <ExpressiveWatchCardSkeleton variant="timeline" />
                <ExpressiveWatchCardSkeleton variant="timeline" />
              </motion.div>
            ) : timeline.length === 0 ? (
              <motion.div
                key="timeline-empty"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={m3Springs.defaultSpatial}
                className="rounded-[20px] border border-[#2B312F] bg-[#181C1B] p-4 text-center"
              >
                <Sparkles className="mx-auto h-5 w-5 text-[#63D4A3]" />
                <p className="mt-1.5 text-[11.5px] font-semibold text-[#F4F6F5]">
                  No entries in this view
                </p>
                <p className="mt-0.5 text-[10px] text-[#9CA3A0]">
                  Log an emotion or capture a gratitude note to populate your timeline.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`timeline-loaded-${filter}-${filterSeq}`}
                className="flex flex-col gap-2"
              >
                {timeline.map((item, idx) => {
                  const staggerDelay = Math.min(idx * 0.04, 0.24);

                  if (item.kind === 'gratitude') {
                    const g = item.entry;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ ...m3Springs.defaultSpatial, delay: staggerDelay }}
                        onClick={() => {
                          onHaptic('#63D4A3');
                          setSelectedGratitudeId(g.id);
                        }}
                        className="flex w-full flex-col gap-1 rounded-[18px] border border-[#2A4D3D]/80 bg-[#15221C] px-3 py-2.5 text-left transition-colors hover:bg-[#192A22]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#63D4A3]">
                            <Heart className="h-3 w-3" />
                            <span>{g.tag}</span>
                          </span>
                          <span className="font-mono text-[9px] text-[#9CA3A0] tabular-nums">
                            {formatRelativeTime(g.timestamp)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-snug text-[#E5E9E7]">
                          {g.text}
                        </p>
                      </motion.button>
                    );
                  }

                  const m = item.entry;
                  const theme = RULER_THEMES[m.quadrant];
                  const isJustLogged = Boolean(highlightedMood && highlightedMood.id === m.id);
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={
                        isJustLogged
                          ? { opacity: 0, y: -16, scale: 0.92 }
                          : { opacity: 0, y: 14, scale: 0.96 }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        borderColor: isJustLogged ? theme.accent : '#2B312F',
                        boxShadow: isJustLogged
                          ? `0 0 22px ${theme.accent}4D, inset 0 0 14px ${theme.accent}1F`
                          : '0 0 0px rgba(0,0,0,0)',
                      }}
                      whileTap={{ scale: 0.96 }}
                      transition={{
                        ...m3Springs.defaultSpatial,
                        delay: isJustLogged ? 0.02 : staggerDelay,
                      }}
                      onClick={() => {
                        onHaptic(theme.accent);
                        setSelectedMoodId(m.id);
                      }}
                      className="relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-[18px] border bg-[#181C1B] px-3 py-2.5 text-left transition-colors hover:bg-[#202523]"
                    >
                      {/* Color-matched shimmer wave sweeping across the freshly logged row */}
                      {isJustLogged && (
                        <motion.span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 w-20 -skew-x-12"
                          style={{
                            background: `linear-gradient(90deg, transparent 0%, ${theme.accent}33 50%, transparent 100%)`,
                          }}
                          initial={{ x: '-140%' }}
                          animate={{ x: '460%' }}
                          transition={{ duration: 1.05, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                        />
                      )}

                      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        {/* M3 Expressive 8-Point Scalloped Organic Cookie Avatar */}
                        <motion.span
                          initial={isJustLogged ? { scale: 0.45, rotate: -35 } : false}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={m3Springs.fastSpatial}
                          className="grid h-8 w-8 shrink-0 place-items-center"
                          style={{
                            clipPath: m3Shapes.cookie8,
                            backgroundColor: theme.surface,
                          }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: theme.accent,
                              boxShadow: isJustLogged ? `0 0 10px ${theme.accent}` : undefined,
                            }}
                          />
                        </motion.span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <AnimatedLogEmotionName
                              emotion={m.emotion}
                              quadrant={m.quadrant}
                              isJustLogged={isJustLogged}
                              className="text-[12.5px] font-bold text-[#F4F6F5]"
                            />
                            <span
                              className="shrink-0 text-[9px] font-semibold"
                              style={{ color: theme.accent }}
                            >
                              {isJustLogged ? 'Logged' : theme.name}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
                            <span>{formatRelativeTime(m.timestamp)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Activity className="h-2.5 w-2.5 text-[#63D4A3]" />
                              {m.hrAtLog}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Moon className="h-2.5 w-2.5 text-[#B0CCE5]" />
                              {`${m.sleepHoursAtLog.toFixed(1)}h`}
                            </span>
                          </div>
                          {m.tags.length > 0 && (
                            <p className="mt-0.5 truncate text-[9px] font-medium text-[#A4B0AC]">
                              {m.tags.slice(0, 3).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </WearScrollColumn>
    </div>
  );
};
