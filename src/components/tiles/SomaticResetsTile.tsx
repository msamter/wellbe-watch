import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Check,
  Clock,
  Heart,
  Meh,
  Mic,
  Pause,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Sun,
  Timer,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import {
  GRATITUDE_QUICK_CHIPS,
  SIMULATED_VOICE_GRATITUDES,
  SOMATIC_PROTOCOLS,
} from '../../data/seedData';
import {
  LiveBiometrics,
  MoodEntry,
  RulerQuadrant,
  ScheduledRoutine,
  SomaticProtocol,
} from '../../types';
import {
  playBreathCue,
  playConfirmChime,
  primeVoiceAudio,
  speakCalmAnchor,
  stopSanctuaryAudio,
  stopSpeech,
} from '../../utils/audioHaptics';
import { SanctuaryAudioBar } from '../watch/SanctuaryAudioBar';
import {
  CurvedEdgeArc,
  CurvedTimeText,
  EdgeActionButton,
  MicroRollNumber,
  WearScrollColumn,
} from '../watch/WearPrimitives';

export type SomaticSubView =
  | { type: 'home' }
  | { type: 'player'; protocol: SomaticProtocol; durationMin: number; titleOverride?: string }
  | { type: 'gratitude' }
  | { type: 'new-routine' };

interface SomaticResetsTileProps {
  timeText: string;
  biometrics: LiveBiometrics;
  latestMood?: MoodEntry;
  scheduledRoutines: ScheduledRoutine[];
  durationMin: number;
  audioEnabled: boolean;
  externalSubView: SomaticSubView | null;
  onConsumeExternalSubView: () => void;
  onChangeDuration: (mins: number) => void;
  onToggleAudio: () => void;
  onLaunchPanic: () => void;
  onCompleteReset: (params: {
    protocolId: string;
    protocolName: string;
    durationMin: number;
    startHr: number;
    endHr: number;
    shiftRating: 'calmer' | 'same' | 'extended';
  }) => void;
  onSaveGratitude: (text: string, tag: string) => void;
  onAddRoutine: (routine: Omit<ScheduledRoutine, 'id' | 'active'>) => void;
  onToggleRoutine: (id: string) => void;
  onSubViewChange?: (active: boolean) => void;
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onHaptic: (color?: string) => void;
  backSignal?: number;
}

// Exact 5 duration presets shown in the companion smartphone Routines screen
const DURATIONS = [1, 2, 3, 5, 8] as const;

interface ActiveCheckInContext {
  accent: string;
  surface: string;
  border: string;
  headline: string;
  body: string;
  preferredTag: ScheduledRoutine['tag'];
  highlightGratitude: boolean;
  highlightPanic: boolean;
}

function getAdaptiveContext(quadrant: RulerQuadrant): ActiveCheckInContext {
  switch (quadrant) {
    case 'blue':
      return {
        accent: '#93BBE0',
        surface: '#161F27',
        border: '#2B4359',
        headline: 'Restorative & low-friction routines prioritized',
        body: 'Gentle pacing, Reset Duration controls, and a low-friction Gratitude Capture prompt are highlighted to support low energy without pressure.',
        preferredTag: 'Restorative',
        highlightGratitude: true,
        highlightPanic: false,
      };
    case 'red':
      return {
        accent: '#E89B8C',
        surface: '#241918',
        border: '#5A342E',
        headline: 'De-escalation & slow exhale prioritized',
        body: 'Voice Panic Anchor and parasympathetic exhale sequences are highlighted to gently lower autonomic arousal right away.',
        preferredTag: 'De-escalation',
        highlightGratitude: false,
        highlightPanic: true,
      };
    case 'yellow':
      return {
        accent: '#E8C96D',
        surface: '#231F14',
        border: '#524622',
        headline: 'Steady focus & gratitude anchor prioritized',
        body: 'Coherent pacing and a quick Gratitude Capture are highlighted to channel positive momentum without burnout.',
        preferredTag: 'Focus',
        highlightGratitude: true,
        highlightPanic: false,
      };
    case 'green':
    default:
      return {
        accent: '#8FD8B5',
        surface: '#15221C',
        border: '#2A4D3D',
        headline: 'Restorative balance & resonance prioritized',
        body: 'Gentle pacing, Reset Duration controls, and Gratitude Capture are highlighted to protect your calm baseline.',
        preferredTag: 'Grounding',
        highlightGratitude: true,
        highlightPanic: false,
      };
  }
}

/* ============================================================================
 * Main Routines / Somatic Resets Tile
 * ==========================================================================*/
export const SomaticResetsTile: React.FC<SomaticResetsTileProps> = ({
  timeText,
  biometrics,
  latestMood,
  scheduledRoutines,
  durationMin,
  audioEnabled,
  externalSubView,
  onConsumeExternalSubView,
  onChangeDuration,
  onToggleAudio,
  onLaunchPanic,
  onCompleteReset,
  onSaveGratitude,
  onAddRoutine,
  onToggleRoutine,
  onSubViewChange,
  crownDelta,
  onScrollReport,
  onHaptic,
  backSignal = 0,
}) => {
  const [subView, setSubView] = useState<SomaticSubView>({ type: 'home' });
  const [dialBoundBounce, setDialBoundBounce] = useState<'min' | 'max' | null>(null);
  const dialBounceTimerRef = useRef<number | null>(null);

  const triggerDialBound = (edge: 'min' | 'max') => {
    setDialBoundBounce(null);
    requestAnimationFrame(() => setDialBoundBounce(edge));
    if (dialBounceTimerRef.current) window.clearTimeout(dialBounceTimerRef.current);
    dialBounceTimerRef.current = window.setTimeout(() => setDialBoundBounce(null), 190);
  };

  useEffect(() => {
    return () => {
      if (dialBounceTimerRef.current) window.clearTimeout(dialBounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (externalSubView) {
      setSubView(externalSubView);
      onConsumeExternalSubView();
    }
  }, [externalSubView, onConsumeExternalSubView]);

  useEffect(() => {
    onSubViewChange?.(subView.type !== 'home');
    if (subView.type !== 'player') {
      stopSpeech();
    }
    if (subView.type === 'home') {
      stopSanctuaryAudio();
    }
  }, [subView, onSubViewChange]);

  useEffect(() => {
    if (backSignal > 0 && subView.type !== 'home') {
      stopSpeech();
      stopSanctuaryAudio();
      setSubView({ type: 'home' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backSignal]);

  const activeEmotion = latestMood?.emotion || 'Tired';
  const activeQuadrant: RulerQuadrant = latestMood?.quadrant || 'blue';
  const adaptive = getAdaptiveContext(activeQuadrant);
  const activeRoutineCount = scheduledRoutines.filter((r) => r.active).length;

  // Sub-view 2: Active Somatic / Routine Player
  if (subView.type === 'player') {
    return (
      <ActiveResetPlayer
        protocol={subView.protocol}
        titleOverride={subView.titleOverride}
        initialMinutes={subView.durationMin}
        startHr={biometrics.hr}
        startHrv={biometrics.hrv}
        audioEnabled={audioEnabled}
        onToggleAudio={onToggleAudio}
        onFinish={(shiftRating, totalMin, endHr) => {
          stopSanctuaryAudio();
          onCompleteReset({
            protocolId: subView.protocol.id,
            protocolName: subView.titleOverride || subView.protocol.name,
            durationMin: totalMin,
            startHr: biometrics.hr,
            endHr,
            shiftRating,
          });
          setSubView({ type: 'home' });
        }}
        onExit={() => {
          stopSanctuaryAudio();
          setSubView({ type: 'home' });
        }}
        onHaptic={onHaptic}
      />
    );
  }

  // Sub-view 3: Gratitude Capture (matching companion app)
  if (subView.type === 'gratitude') {
    return (
      <GratitudeCaptureView
        activeEmotion={activeEmotion}
        durationMin={durationMin}
        audioEnabled={audioEnabled}
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        onSave={(text, tag) => {
          stopSanctuaryAudio();
          onSaveGratitude(text, tag);
          setSubView({ type: 'home' });
        }}
        onBack={() => {
          stopSanctuaryAudio();
          setSubView({ type: 'home' });
        }}
        onHaptic={onHaptic}
      />
    );
  }

  // Sub-view 4: + New Routine Composer
  if (subView.type === 'new-routine') {
    return (
      <NewRoutineView
        timeText={timeText}
        defaultDuration={durationMin}
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        onSave={(routine) => {
          onAddRoutine(routine);
          playConfirmChime(audioEnabled);
          setSubView({ type: 'home' });
        }}
        onCancel={() => setSubView({ type: 'home' })}
        onHaptic={onHaptic}
      />
    );
  }

  const ActiveIcon =
    activeQuadrant === 'red'
      ? Activity
      : activeQuadrant === 'yellow'
      ? Sun
      : activeQuadrant === 'green'
      ? Heart
      : Meh;

  return (
    <div className="relative h-full w-full bg-[#121514]">
      <CurvedTimeText timeText={timeText} label="Routines" />

      <WearScrollColumn
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        paddingTopClass="pt-[46px]"
        paddingBottomClass="pb-[66px]"
      >
        <div className="flex flex-col gap-3">
          {/* Top Title Subtitle + Mint "+ New Routine" Button */}
          <div className="flex flex-col items-center text-center">
            <p className="text-[10px] font-medium text-[#9CA3A0]">
              Somatic Sequences · Reset Duration
            </p>
            <button
              type="button"
              onClick={() => {
                onHaptic('#63D4A3');
                setSubView({ type: 'new-routine' });
              }}
              className="wear-press mt-2 inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-full bg-[#63D4A3] px-4 text-[11.5px] font-bold text-[#0B1A13] transition-colors hover:bg-[#76DDB0] active:scale-[0.93]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Routine</span>
            </button>
          </div>

          {/* 1. Adaptive Active Check-In Context Card */}
          <div
            className="rounded-[20px] border p-3 text-left"
            style={{
              backgroundColor: adaptive.surface,
              borderColor: adaptive.border,
            }}
          >
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: adaptive.accent }}>
              <ActiveIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{`Active check-in: ${activeEmotion} ·`}</span>
            </div>
            <p
              className="mt-1 text-[11.5px] font-bold leading-snug"
              style={{ color: adaptive.accent }}
            >
              {adaptive.headline}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#D1D6D4]">
              {adaptive.body}
            </p>
          </div>

          {/* 2. Reset Duration & Quick Modules Card */}
          <div className="rounded-[22px] border border-[#2B312F] bg-[#181C1B] p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-[#63D4A3]" />
                <span className="text-[12px] font-bold text-[#F4F6F5]">Reset Duration</span>
              </div>
              <span className="text-[9.5px] text-[#9CA3A0]">Applies below</span>
            </div>

            {/* Exact 5 duration pills: 1 min, 2 min, 3 min, 5 min, 8 min */}
            <div
              className={`mt-2 grid grid-cols-5 gap-1 ${
                dialBoundBounce === 'min'
                  ? 'animate-bounce-top'
                  : dialBoundBounce === 'max'
                  ? 'animate-bounce-bottom'
                  : ''
              }`}
            >
              {DURATIONS.map((m) => {
                const active = m === durationMin;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onHaptic('#63D4A3');
                      if (m === durationMin && m === DURATIONS[0]) {
                        triggerDialBound('min');
                      } else if (m === durationMin && m === DURATIONS[DURATIONS.length - 1]) {
                        triggerDialBound('max');
                      }
                      onChangeDuration(m);
                    }}
                    className={`wear-press min-h-[32px] rounded-[11px] border font-mono text-[10.5px] font-semibold transition-colors duration-150 tabular-nums active:scale-[0.93] ${
                      active
                        ? 'border-[#63D4A3] bg-[#63D4A3] text-[#0B1A13]'
                        : 'border-[#2E3532] bg-[#202523] text-[#D1D6D4] hover:bg-[#282E2C]'
                    }`}
                  >
                    {`${m}m`}
                  </button>
                );
              })}
            </div>

            <div className="my-2.5 border-t border-[#2B312F]" />

            {/* Side-by-Side Quick Modules: Voice Panic Anchor & Gratitude Capture */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  primeVoiceAudio();
                  onHaptic('#F0B0A3');
                  onLaunchPanic();
                }}
                className={`wear-press flex min-h-[42px] items-center justify-center gap-1.5 rounded-[14px] border px-2 py-1.5 text-left transition-colors active:scale-[0.93] ${
                  adaptive.highlightPanic
                    ? 'border-[#E89B8C]/75 bg-[#2A1B19] text-[#F4F6F5]'
                    : 'border-[#2E3532] bg-[#202523] text-[#F4F6F5] hover:bg-[#282E2C]'
                }`}
              >
                <ShieldAlert
                  className={`h-3.5 w-3.5 shrink-0 ${
                    adaptive.highlightPanic ? 'text-[#E89B8C]' : 'text-[#D1D6D4]'
                  }`}
                />
                <span className="text-[10.5px] font-semibold leading-tight">
                  Voice Panic Anchor
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onHaptic('#B0CCE5');
                  setSubView({ type: 'gratitude' });
                }}
                className={`wear-press flex min-h-[42px] items-center justify-center gap-1.5 rounded-[14px] border px-2 py-1.5 text-left transition-colors active:scale-[0.93] ${
                  adaptive.highlightGratitude
                    ? 'border-[#4B79A1] bg-[#18222B] text-[#F4F6F5] hover:bg-[#1E2B36]'
                    : 'border-[#2E3532] bg-[#202523] text-[#F4F6F5] hover:bg-[#282E2C]'
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 shrink-0 ${
                    adaptive.highlightGratitude ? 'text-[#93BBE0]' : 'text-[#D1D6D4]'
                  }`}
                />
                <span className="text-[10.5px] font-semibold leading-tight">
                  Gratitude Capture
                </span>
              </button>
            </div>
          </div>

          {/* 3. Scheduled Routines Section */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h3 className="text-[12px] font-bold text-[#F4F6F5]">Scheduled Routines</h3>
              <span className="font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
                {`${activeRoutineCount} active · ${scheduledRoutines.length} total`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {scheduledRoutines.map((routine, idx) => {
                const isPrioritized =
                  routine.tag === adaptive.preferredTag || (idx === 0 && routine.active);
                const proto =
                  SOMATIC_PROTOCOLS.find((p) => p.id === routine.protocolId) ||
                  SOMATIC_PROTOCOLS[0];

                return (
                  <div
                    key={routine.id}
                    className="rounded-[20px] border p-3 transition-colors"
                    style={{
                      backgroundColor: '#181C1B',
                      borderColor: isPrioritized && routine.active ? adaptive.border : '#2B312F',
                    }}
                  >
                    {isPrioritized && routine.active && (
                      <span
                        className="mb-1.5 inline-block rounded-full border px-2 py-0.5 text-[9px] font-semibold"
                        style={{
                          color: adaptive.accent,
                          borderColor: adaptive.border,
                          backgroundColor: adaptive.surface,
                        }}
                      >
                        {`Prioritized for ${activeEmotion} · ${routine.tag}`}
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-[#F4F6F5]">
                          {routine.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1 text-[9.5px] text-[#9CA3A0]">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {`${routine.timeLabel} · ${routine.daysLabel} · ${routine.durationMin}m`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onHaptic('#63D4A3');
                          onToggleRoutine(routine.id);
                        }}
                        className={`wear-press inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-semibold transition-colors active:scale-[0.93] ${
                          routine.active
                            ? 'border-[#2E3532] bg-[#202523] text-[#E5E9E7]'
                            : 'border-[#262B29] bg-[#141716] text-[#7D8582]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            routine.active ? 'bg-[#63D4A3]' : 'bg-[#565E5B]'
                          }`}
                        />
                        <span>{routine.active ? 'Scheduled' : 'Paused'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          primeVoiceAudio();
                          onHaptic(proto.accent);
                          setSubView({
                            type: 'player',
                            protocol: proto,
                            durationMin: routine.durationMin,
                            titleOverride: routine.name,
                          });
                        }}
                        className="wear-press inline-flex items-center gap-1 rounded-full bg-[#63D4A3]/15 border border-[#63D4A3]/40 px-3 py-1 text-[10px] font-bold text-[#63D4A3] hover:bg-[#63D4A3]/25 active:scale-[0.93]"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>Start</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Integrated Routine Modules (Somatic Sequences) */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h3 className="text-[12px] font-bold text-[#F4F6F5]">Routine Modules</h3>
              <span className="font-mono text-[9.5px] text-[#63D4A3] tabular-nums">
                {`${durationMin} min preset`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {SOMATIC_PROTOCOLS.map((proto) => (
                <button
                  key={proto.id}
                  type="button"
                  onClick={() => {
                    primeVoiceAudio();
                    onHaptic(proto.accent);
                    setSubView({ type: 'player', protocol: proto, durationMin });
                  }}
                  className="wear-press flex min-h-[52px] w-full items-center justify-between rounded-[20px] border border-[#2B312F] bg-[#181C1B] px-3.5 py-2 text-left transition-colors hover:bg-[#202523] active:scale-[0.93]"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-[12.5px] font-semibold text-[#F4F6F5]">
                      {proto.name}
                    </p>
                    <p className="truncate text-[10px] text-[#9CA3A0]">{proto.shortSubtitle}</p>
                  </div>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${proto.accent}20`, color: proto.accent }}
                  >
                    <Wind className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </WearScrollColumn>
    </div>
  );
};


/* ============================================================================
 * Gratitude Capture View — Exact Match to Companion Video (00:08 - 00:09)
 * ==========================================================================*/
interface GratitudeCaptureViewProps {
  activeEmotion: string;
  durationMin: number;
  audioEnabled: boolean;
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onSave: (text: string, tag: string) => void;
  onBack: () => void;
  onHaptic: (color?: string) => void;
}

const GratitudeCaptureView: React.FC<GratitudeCaptureViewProps> = ({
  activeEmotion,
  durationMin,
  audioEnabled,
  crownDelta,
  onScrollReport,
  onSave,
  onBack,
  onHaptic,
}) => {
  const [text, setText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Quiet Moment');
  const [listening, setListening] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const micTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (micTimerRef.current) window.clearTimeout(micTimerRef.current);
      stopSanctuaryAudio();
    };
  }, []);

  const handleMicTap = () => {
    onHaptic();
    if (listening) {
      if (micTimerRef.current) window.clearTimeout(micTimerRef.current);
      setListening(false);
      return;
    }
    setListening(true);
    micTimerRef.current = window.setTimeout(() => {
      micTimerRef.current = null;
      const sample = SIMULATED_VOICE_GRATITUDES[promptIdx % SIMULATED_VOICE_GRATITUDES.length];
      setText(sample.text);
      setSelectedTag(sample.tag);
      setPromptIdx((i) => i + 1);
      setListening(false);
      playConfirmChime(audioEnabled);
    }, 1100);
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onHaptic();
    playConfirmChime(audioEnabled);
    onSave(trimmed, selectedTag);
  };

  return (
    <div className="animate-radial-reveal relative h-full w-full bg-[#121514]">
      <WearScrollColumn
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        paddingTopClass="pt-[34px]"
        paddingBottomClass="pb-[76px]"
      >
        <div className="flex flex-col gap-2.5 text-left">
          {/* Header Row: For [Emotion] · X min / Gratitude Capture + Close */}
          <div className="flex items-start justify-between gap-2 px-1">
            <div>
              <p className="font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
                {`For ${activeEmotion} · ${durationMin} min`}
              </p>
              <h3 className="text-[14px] font-bold text-[#F4F6F5]">Gratitude Capture</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                onHaptic();
                onBack();
              }}
              aria-label="Close Gratitude Capture"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2F3633] bg-[#181C1B] text-[#D1D6D4] hover:text-white active:scale-90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Soothing Sanctuary Ambient Audio Bar */}
          <SanctuaryAudioBar autoPlay={audioEnabled} onHaptic={onHaptic} />

          {/* Companion Prompt Copy */}
          <p className="px-0.5 text-[10px] leading-snug text-[#D1D6D4]">
            Capture one concrete moment, person, or steady anchor from today. Saving adds a
            Grateful entry directly to your Mood Log.
          </p>

          {/* Dark Textarea matching video */}
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Today I'm grateful for..."
            className="w-full resize-none rounded-[16px] border border-[#2E3532] bg-[#0F1211] p-2.5 text-[11.5px] leading-snug text-[#F4F6F5] placeholder-[#7B8480] focus:border-[#63D4A3] focus:outline-none"
          />

          {/* Watch-Friendly Voice Dictation + Quick Anchor Chips */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleMicTap}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 ${
                listening
                  ? 'border-[#63D4A3] bg-[#152920] text-[#63D4A3]'
                  : 'border-[#2E3532] bg-[#181C1B] text-[#E5E9E7] hover:bg-[#202523]'
              }`}
            >
              <Mic className="h-3 w-3 text-[#63D4A3]" />
              <span>{listening ? 'Listening…' : 'Voice Note'}</span>
            </button>
            <span className="text-[9.5px] text-[#9CA3A0]">or tap anchor:</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {GRATITUDE_QUICK_CHIPS.map((chip) => {
              const isSelected = selectedTag === chip && text.length > 0;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    onHaptic();
                    setSelectedTag(chip);
                    setText(`Grateful for a steady moment of ${chip.toLowerCase()} today.`);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[9.5px] font-medium transition-colors active:scale-95 ${
                    isSelected
                      ? 'border-[#63D4A3]/60 bg-[#152920] text-[#63D4A3]'
                      : 'border-[#2E3532] bg-[#181C1B] text-[#D1D6D4] hover:bg-[#202523]'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      </WearScrollColumn>

      {/* Pinned Bottom Mint CTA matching video ("✓ Save Gratitude to Mood Log") */}
      <EdgeActionButton
        onClick={handleSave}
        disabled={text.trim().length === 0}
        label="Save Gratitude to Log"
        icon={<Check className="h-3.5 w-3.5 stroke-[2.5]" />}
        variant="emerald"
      />
    </div>
  );
};

/* ============================================================================
 * + New Routine Composer Sub-View
 * ==========================================================================*/
interface NewRoutineViewProps {
  timeText: string;
  defaultDuration: number;
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onSave: (routine: Omit<ScheduledRoutine, 'id' | 'active'>) => void;
  onCancel: () => void;
  onHaptic: (color?: string) => void;
}

const ROUTINE_PRESET_NAMES = [
  'Midday Reset',
  'Evening Wind-Down',
  'Pre-Meeting Calm',
  'Deep Sleep Prep',
];
const ROUTINE_TIMES = ['7:30 AM', '12:30 PM', '5:30 PM', '8:30 PM', '10:00 PM'];
const ROUTINE_DAYS = ['Daily', 'Weekdays', 'Mon, Wed, Fri, Sun', 'Weekends'];

const NewRoutineView: React.FC<NewRoutineViewProps> = ({
  timeText,
  defaultDuration,
  crownDelta,
  onScrollReport,
  onSave,
  onCancel,
  onHaptic,
}) => {
  const [name, setName] = useState('Midday Reset');
  const [protocolId, setProtocolId] = useState(SOMATIC_PROTOCOLS[0].id);
  const [timeLabel, setTimeLabel] = useState('12:30 PM');
  const [daysLabel, setDaysLabel] = useState('Weekdays');
  const [durationMin, setDurationMin] = useState<number>(defaultDuration);
  const [tag, setTag] = useState<ScheduledRoutine['tag']>('Restorative');

  return (
    <div className="animate-radial-reveal relative h-full w-full bg-[#121514]">
      <CurvedTimeText timeText={timeText} label="New Routine" />

      <WearScrollColumn
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        paddingTopClass="pt-[46px]"
        paddingBottomClass="pb-[76px]"
      >
        <div className="flex flex-col gap-2.5 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-bold text-[#F4F6F5]">Create Routine</span>
            <button
              type="button"
              onClick={() => {
                onHaptic();
                onCancel();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#2F3633] bg-[#181C1B] text-[#D1D6D4]"
              aria-label="Cancel new routine"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Name Input + Presets */}
          <div className="rounded-[18px] border border-[#2B312F] bg-[#181C1B] p-2.5">
            <p className="text-[9.5px] font-semibold text-[#9CA3A0]">Routine Name</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-[#2E3532] bg-[#121514] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#F4F6F5] focus:border-[#63D4A3] focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ROUTINE_PRESET_NAMES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onHaptic();
                    setName(preset);
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${
                    name === preset
                      ? 'border-[#63D4A3] bg-[#152920] text-[#63D4A3]'
                      : 'border-[#2E3532] bg-[#202523] text-[#D1D6D4]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Somatic Sequence Selector */}
          <div className="rounded-[18px] border border-[#2B312F] bg-[#181C1B] p-2.5">
            <p className="text-[9.5px] font-semibold text-[#9CA3A0]">Somatic Sequence</p>
            <div className="mt-1.5 flex flex-col gap-1">
              {SOMATIC_PROTOCOLS.slice(0, 4).map((p) => {
                const active = protocolId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onHaptic();
                      setProtocolId(p.id);
                    }}
                    className={`flex items-center justify-between rounded-[11px] border px-2.5 py-1.5 text-left text-[10.5px] font-semibold ${
                      active
                        ? 'border-[#63D4A3] bg-[#152920] text-[#63D4A3]'
                        : 'border-[#2E3532] bg-[#202523] text-[#E5E9E7]'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[9px] font-normal opacity-80">{p.shortSubtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time, Days, Duration & Focus Tag */}
          <div className="rounded-[18px] border border-[#2B312F] bg-[#181C1B] p-2.5 space-y-2">
            <div>
              <p className="text-[9.5px] font-semibold text-[#9CA3A0]">Schedule Time</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ROUTINE_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onHaptic();
                      setTimeLabel(t);
                    }}
                    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${
                      timeLabel === t
                        ? 'border-[#63D4A3] bg-[#63D4A3] text-[#0B1A13]'
                        : 'border-[#2E3532] bg-[#202523] text-[#D1D6D4]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9.5px] font-semibold text-[#9CA3A0]">Days</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ROUTINE_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      onHaptic();
                      setDaysLabel(d);
                    }}
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${
                      daysLabel === d
                        ? 'border-[#63D4A3] bg-[#152920] text-[#63D4A3]'
                        : 'border-[#2E3532] bg-[#202523] text-[#D1D6D4]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9.5px] font-semibold text-[#9CA3A0]">Duration &amp; Focus</p>
              <div className="mt-1 grid grid-cols-5 gap-1">
                {DURATIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onHaptic();
                      setDurationMin(m);
                    }}
                    className={`rounded-[9px] border py-1 font-mono text-[9.5px] font-semibold ${
                      durationMin === m
                        ? 'border-[#63D4A3] bg-[#63D4A3] text-[#0B1A13]'
                        : 'border-[#2E3532] bg-[#202523] text-[#D1D6D4]'
                    }`}
                  >
                    {`${m}m`}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(['Restorative', 'Grounding', 'De-escalation', 'Focus'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onHaptic();
                      setTag(t);
                    }}
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${
                      tag === t
                        ? 'border-[#63D4A3] bg-[#152920] text-[#63D4A3]'
                        : 'border-[#2E3532] bg-[#202523] text-[#D1D6D4]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </WearScrollColumn>

      <EdgeActionButton
        onClick={() => {
          if (!name.trim()) return;
          onHaptic();
          onSave({
            name: name.trim(),
            protocolId,
            timeLabel,
            daysLabel,
            durationMin,
            tag,
          });
        }}
        disabled={!name.trim()}
        label="Save Routine"
        icon={<Check className="h-3.5 w-3.5 stroke-[2.5]" />}
        variant="emerald"
      />
    </div>
  );
};

/* ============================================================================
 * Active Full-Screen Somatic Reset Player (Harmonized with WELLBE+ Sanctuary)
 * ==========================================================================*/
interface ActiveResetPlayerProps {
  protocol: SomaticProtocol;
  titleOverride?: string;
  initialMinutes: number;
  startHr: number;
  startHrv: number;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onFinish: (rating: 'calmer' | 'same' | 'extended', totalMin: number, endHr: number) => void;
  onExit: () => void;
  onHaptic: (color?: string) => void;
}

const ActiveResetPlayer: React.FC<ActiveResetPlayerProps> = ({
  protocol,
  titleOverride,
  initialMinutes,
  startHr,
  startHrv,
  audioEnabled,
  onToggleAudio,
  onFinish,
  onExit,
  onHaptic,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [running, setRunning] = useState(true);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);

  const lastPhaseRef = useRef(-1);
  const currentPhase = protocol.phases[phaseIdx % protocol.phases.length];

  // Clean up voice speech on unmount, pause, mute, or completion
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (!running || completed || !audioEnabled) {
      stopSpeech();
    }
  }, [running, completed, audioEnabled]);

  useEffect(() => {
    if (!running || completed) return;
    if (lastPhaseRef.current !== phaseIdx) {
      lastPhaseRef.current = phaseIdx;
      playBreathCue(audioEnabled, currentPhase.type);

      if (audioEnabled) {
        if (protocol.category === 'somatic' || protocol.category === 'sensory') {
          speakCalmAnchor(`${currentPhase.label}. ${currentPhase.cue}.`, true);
        } else if (cycleCount < 2 && currentPhase.durationSec >= 2) {
          // Calm, unhurried breath voice cues for the first 2 cycles (skipping 1s top-up)
          const spoken =
            currentPhase.type === 'inhale'
              ? 'Breathe in gently, nice and slow.'
              : currentPhase.type === 'hold'
              ? 'Rest softly right here.'
              : currentPhase.type === 'exhale'
              ? 'Now let it go, slow and easy.'
              : '';
          if (spoken) {
            speakCalmAnchor(spoken, true);
          }
        }
      }
    }
  }, [
    phaseIdx,
    cycleCount,
    running,
    completed,
    audioEnabled,
    protocol.category,
    currentPhase.type,
    currentPhase.label,
    currentPhase.cue,
    currentPhase.durationSec,
  ]);

  useEffect(() => {
    if (!running || completed) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.2;
        if (next >= totalSeconds) {
          setCompleted(true);
          playConfirmChime(audioEnabled);
          return totalSeconds;
        }
        return next;
      });

      if (!protocol.interactiveTapAdvance) {
        setPhaseElapsed((prev) => {
          const next = prev + 0.2;
          if (next >= currentPhase.durationSec) {
            setPhaseIdx((p) => {
              const nextIdx = (p + 1) % protocol.phases.length;
              if (nextIdx === 0) {
                setCycleCount((c) => c + 1);
              }
              return nextIdx;
            });
            return 0;
          }
          return next;
        });
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [
    running,
    completed,
    totalSeconds,
    protocol.interactiveTapAdvance,
    currentPhase.durationSec,
    protocol.phases.length,
    audioEnabled,
  ]);

  const progress = Math.min(1, elapsedSec / Math.max(1, totalSeconds));
  const remaining = Math.max(0, Math.ceil(totalSeconds - elapsedSec));
  const remMin = Math.floor(remaining / 60);
  const remSec = remaining % 60;
  const phaseCountdown = Math.max(1, Math.ceil(currentPhase.durationSec - phaseElapsed));

  const hrDrop = Math.round(
    progress * Math.min(8, Math.max(3, Math.round((startHr - 56) * 0.25) + 3))
  );
  const liveHr = Math.max(54, startHr - hrDrop);
  const liveHrv = Math.min(95, startHrv + Math.round(progress * 6));

  const orbScale = useMemo(() => {
    if (protocol.interactiveTapAdvance) return currentPhase.targetScale;
    const phaseRatio = Math.min(1, phaseElapsed / Math.max(0.5, currentPhase.durationSec));
    if (currentPhase.type === 'inhale') return 0.74 + phaseRatio * 0.26;
    if (currentPhase.type === 'inhale2') return 0.9 + phaseRatio * 0.1;
    if (currentPhase.type === 'exhale') return 1.0 - phaseRatio * 0.26;
    return currentPhase.targetScale >= 0.8 ? 1.0 : 0.78;
  }, [currentPhase, phaseElapsed, protocol.interactiveTapAdvance]);

  if (completed) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#0D100F] px-9 text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[#63D4A3]/50 bg-[#152920] text-[#63D4A3]">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#63D4A3]">
          Routine Complete
        </p>
        <h3 className="mt-0.5 text-[17px] font-bold text-[#F4F6F5]">
          {titleOverride || protocol.name}
        </h3>
        <p className="mt-1 font-mono text-[11.5px] text-[#D1D6D4] tabular-nums">
          {`HR ${startHr} → ${liveHr} bpm · HRV ${liveHrv}ms`}
        </p>

        <p className="mt-4 text-[11px] font-medium text-[#9CA3A0]">How does your body feel?</p>
        <div className="mt-2.5 flex w-full max-w-[244px] flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onHaptic();
              onFinish('calmer', Math.round(totalSeconds / 60), liveHr);
            }}
            className="min-h-[40px] w-full rounded-full bg-[#63D4A3] text-[12.5px] font-bold text-[#0B1A13] active:scale-95"
          >
            Calmer
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onHaptic();
                onFinish('same', Math.round(totalSeconds / 60), liveHr);
              }}
              className="min-h-[36px] rounded-full border border-[#2F3633] bg-[#181C1B] text-[11.5px] font-semibold text-[#F4F6F5] active:scale-95"
            >
              Same
            </button>
            <button
              type="button"
              onClick={() => {
                onHaptic();
                setTotalSeconds((s) => s + 60);
                setCompleted(false);
                setRunning(true);
              }}
              className="min-h-[36px] rounded-full border border-[#4B79A1] bg-[#18222B] text-[11.5px] font-semibold text-[#93BBE0] active:scale-95"
            >
              Extend +1m
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-radial-reveal relative flex h-full w-full flex-col items-center justify-between bg-[#0D100F] px-10 pb-8 pt-7 text-center">
      {/* Outer Bezel Progress Arc */}
      <CurvedEdgeArc
        startAngle={0}
        endAngle={359.5}
        progress={progress}
        radius={196}
        strokeWidth={4}
        color={protocol.accent}
        trackColor="rgba(255,255,255,0.09)"
      />

      {/* Top Info Row */}
      <div className="relative z-10 flex flex-col items-center">
        <p className="text-[11px] font-semibold text-[#D1D6D4]">
          {titleOverride || protocol.name}
        </p>
        <p className="font-mono text-[12.5px] font-bold text-[#63D4A3] tabular-nums">
          {`${remMin}:${String(remSec).padStart(2, '0')} remaining`}
        </p>
      </div>

      {/* Sanctuary Mint Breathing Ring */}
      <button
        type="button"
        onClick={() => {
          primeVoiceAudio();
          if (protocol.interactiveTapAdvance) {
            onHaptic();
            setPhaseIdx((p) => (p + 1) % protocol.phases.length);
            setPhaseElapsed(0);
          } else {
            onHaptic();
            setRunning((r) => !r);
          }
        }}
        className="relative z-10 flex h-[144px] w-[144px] items-center justify-center rounded-full focus:outline-none"
      >
        <div
          className="absolute inset-0 rounded-full border transition-transform duration-200 ease-linear"
          style={{
            borderColor: protocol.accent,
            background: `radial-gradient(circle, ${protocol.accent}24 0%, ${protocol.accent}06 72%)`,
            transform: `scale(${orbScale})`,
          }}
        />
        <div className="relative z-10 flex flex-col items-center px-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: protocol.accent }}
          >
            {currentPhase.label}
          </span>
          {!protocol.interactiveTapAdvance && (
            <span className="mt-0.5 font-mono text-[36px] font-bold leading-none text-[#F4F6F5] tabular-nums">
              {phaseCountdown}
            </span>
          )}
          <span className="mt-1 text-[10px] text-[#D1D6D4] leading-tight">
            {currentPhase.cue}
          </span>
          {protocol.interactiveTapAdvance && (
            <span className="mt-1.5 text-[9.5px] font-semibold text-[#93BBE0]">
              Tap ring for next
            </span>
          )}
        </div>
      </button>

      {/* Compact Sanctuary Ambient Audio Strip */}
      <div className="relative z-10 w-full max-w-[254px]">
        <SanctuaryAudioBar autoPlay={false} compact onHaptic={onHaptic} />
      </div>

      {/* Bottom Live Biofeedback & Controls */}
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <div className="font-mono text-[10px] text-[#9CA3A0] tabular-nums">
          <span>HR </span>
          <MicroRollNumber value={liveHr} />
          <span> bpm</span>
          {hrDrop > 0 && <span className="text-[#63D4A3]">{` (−${hrDrop})`}</span>}
          {' · HRV '}
          <MicroRollNumber value={liveHrv} />
          <span>ms</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onHaptic();
              stopSpeech();
              onExit();
            }}
            aria-label="Exit routine"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2F3633] bg-[#181C1B] text-[#D1D6D4] hover:text-white active:scale-90"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              primeVoiceAudio();
              onHaptic();
              setRunning((r) => !r);
            }}
            aria-label={running ? 'Pause routine' : 'Resume routine'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#63D4A3] text-[#0B1A13] active:scale-90"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              primeVoiceAudio();
              onHaptic();
              onToggleAudio();
            }}
            aria-label="Toggle voice and breath chimes"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2F3633] bg-[#181C1B] text-[#D1D6D4] hover:text-white active:scale-90"
          >
            {audioEnabled ? (
              <Volume2 className="h-4 w-4 text-[#63D4A3]" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
