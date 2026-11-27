import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Clock,
  Heart,
  Moon,
  Plus,
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
import {
  CurvedTimeText,
  MicroRollNumber,
  WearScrollColumn,
  formatRelativeTime,
} from '../watch/WearPrimitives';

interface MoodLogTileProps {
  timeText: string;
  moods: MoodEntry[];
  gratitudes: GratitudeEntry[];
  onToggleTag: (moodId: string, tag: string) => void;
  onDeleteMood: (moodId: string) => void;
  onDeleteGratitude: (gratitudeId: string) => void;
  onJumpToEmotions: () => void;
  onSubViewChange?: (active: boolean) => void;
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onHaptic: (color?: string) => void;
  backSignal?: number;
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
  onSubViewChange,
  crownDelta,
  onScrollReport,
  onHaptic,
  backSignal = 0,
}) => {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [filterSeq, setFilterSeq] = useState(0);
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [selectedGratitudeId, setSelectedGratitudeId] = useState<string | null>(null);

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
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        onHaptic(theme.accent);
                        onToggleTag(selectedMood.id, tag);
                      }}
                      className={`wear-press rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors duration-150 active:scale-[0.93] ${
                        active
                          ? 'border-[#63D4A3] bg-[#152920] text-[#63D4A3]'
                          : 'border-[#2E3532] bg-[#202523] text-[#D1D6D4] hover:bg-[#282E2C]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Back & Delete */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onHaptic();
                  setSelectedMoodId(null);
                }}
                className="wear-press flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#2F3633] bg-[#181C1B] text-[11px] font-semibold text-[#E5E9E7] hover:bg-[#202523] active:scale-[0.93]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onHaptic('#F0B0A3');
                  const idToDelete = selectedMood.id;
                  setSelectedMoodId(null);
                  onDeleteMood(idToDelete);
                }}
                className="wear-press flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#6B4841] bg-[#372622] text-[11px] font-semibold text-[#F0B0A3] hover:brightness-110 active:scale-[0.93]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
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
              <button
                type="button"
                onClick={() => {
                  onHaptic();
                  setSelectedGratitudeId(null);
                }}
                className="wear-press flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#2F3633] bg-[#181C1B] text-[11px] font-semibold text-[#E5E9E7] hover:bg-[#202523] active:scale-[0.93]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onHaptic('#F0B0A3');
                  const idToDelete = selectedGratitude.id;
                  setSelectedGratitudeId(null);
                  onDeleteGratitude(idToDelete);
                }}
                className="wear-press flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#6B4841] bg-[#372622] text-[11px] font-semibold text-[#F0B0A3] hover:brightness-110 active:scale-[0.93]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
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
          {/* Compact Header Count + Quick Check-In Button */}
          <div className="flex flex-col items-center text-center">
            <p className="font-mono text-[10px] text-[#9CA3A0] tabular-nums">
              <MicroRollNumber value={moods.length} className="font-semibold text-[#E5E9E7]" />
              {' moods · '}
              <MicroRollNumber value={gratitudes.length} className="font-semibold text-[#63D4A3]" />
              {' gratitudes'}
            </p>
            <button
              type="button"
              onClick={() => {
                onHaptic('#63D4A3');
                onJumpToEmotions();
              }}
              className="wear-press mt-1 inline-flex min-h-[28px] items-center gap-1 rounded-full border border-[#63D4A3]/45 bg-[#152920] px-3 text-[10.5px] font-semibold text-[#63D4A3] transition-colors hover:bg-[#1B3529] active:scale-[0.93]"
            >
              <Plus className="h-3 w-3 stroke-[2.5]" />
              <span>Log Emotion</span>
            </button>
          </div>

          {/* Category Filter Chips (Optimistic Instant Switch) */}
          <div className="flex flex-wrap items-center justify-center gap-1">
            {FILTER_OPTIONS.map((opt) => {
              const active = filter === opt.id;
              const count = counts[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onHaptic(opt.dotColor || '#63D4A3');
                    setFilter(opt.id);
                    setFilterSeq((s) => s + 1);
                  }}
                  className={`wear-press inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold transition-colors duration-150 active:scale-[0.93] ${
                    active
                      ? 'border-[#63D4A3] bg-[#202523] text-[#F4F6F5]'
                      : 'border-[#2B312F] bg-[#181C1B] text-[#9CA3A0] hover:text-[#E5E9E7]'
                  }`}
                >
                  {opt.dotColor && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: opt.dotColor }}
                    />
                  )}
                  <span>{opt.label}</span>
                  <span className="font-mono text-[8.5px] opacity-75 tabular-nums">
                    <MicroRollNumber value={count} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Chronological Timeline Entries — direct children so WearScrollColumn aligns & scales each card cleanly */}
          {timeline.length === 0 ? (
            <div className="rounded-[20px] border border-[#2B312F] bg-[#181C1B] p-4 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-[#63D4A3]" />
              <p className="mt-1.5 text-[11.5px] font-semibold text-[#F4F6F5]">
                No entries in this view
              </p>
              <p className="mt-0.5 text-[10px] text-[#9CA3A0]">
                Log an emotion or capture a gratitude note to populate your timeline.
              </p>
            </div>
          ) : (
            timeline.map((item) => {
              if (item.kind === 'gratitude') {
                const g = item.entry;
                return (
                  <button
                    key={`${filter}-${filterSeq}-${item.id}`}
                    type="button"
                    onClick={() => {
                      onHaptic('#63D4A3');
                      setSelectedGratitudeId(g.id);
                    }}
                    className="wear-press flex w-full flex-col gap-1 rounded-[18px] border border-[#2A4D3D]/80 bg-[#15221C] px-3 py-2.5 text-left transition-colors hover:bg-[#192A22] active:scale-[0.93]"
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
                  </button>
                );
              }

              const m = item.entry;
              const theme = RULER_THEMES[m.quadrant];
              return (
                <button
                  key={`${filter}-${filterSeq}-${item.id}`}
                  type="button"
                  onClick={() => {
                    onHaptic(theme.accent);
                    setSelectedMoodId(m.id);
                  }}
                  className="wear-press flex w-full items-center justify-between gap-2 rounded-[18px] border border-[#2B312F] bg-[#181C1B] px-3 py-2.5 text-left transition-colors hover:bg-[#202523] active:scale-[0.93]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12.5px] font-bold text-[#F4F6F5]">
                          {m.emotion}
                        </span>
                        <span
                          className="shrink-0 text-[9px] font-semibold"
                          style={{ color: theme.accent }}
                        >
                          {theme.name}
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
                        <div className="mt-1 flex flex-wrap gap-1">
                          {m.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-[#2E3532] bg-[#202523] px-1.5 py-[1px] text-[8.5px] font-medium text-[#D1D6D4]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </WearScrollColumn>
    </div>
  );
};
