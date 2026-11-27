import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Heart,
  Pause,
  Play,
  ShieldAlert,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { VOICE_PANIC_ANCHOR_STAGES } from '../../data/seedData';
import { LiveBiometrics } from '../../types';
import {
  playBreathCue,
  playPanicAnchorBell,
  prefetchCalmAnchorCues,
  primeVoiceAudio,
  speakCalmAnchor,
  stopSanctuaryAudio,
  stopSpeech,
} from '../../utils/audioHaptics';
import { SanctuaryAudioBar } from '../watch/SanctuaryAudioBar';
import {
  CurvedEdgeArc,
  CurvedTimeText,
  MicroRollNumber,
} from '../watch/WearPrimitives';

interface VoicePanicAnchorTileProps {
  timeText: string;
  biometrics: LiveBiometrics;
  audioEnabled: boolean;
  autoStartSeq: number;
  onConsumeAutoStart: () => void;
  onToggleAudio: () => void;
  onCompleteReset: (params: {
    protocolId: string;
    protocolName: string;
    durationMin: number;
    startHr: number;
    endHr: number;
    shiftRating: 'calmer' | 'same' | 'extended';
  }) => void;
  onPanicStateChange: (active: boolean) => void;
  onSubViewChange?: (active: boolean) => void;
  onHaptic: (color?: string) => void;
  backSignal?: number;
}

const PANIC_PHASES = [
  { label: 'INHALE', seconds: 4, type: 'inhale' as const },
  { label: 'HOLD', seconds: 4, type: 'hold' as const },
  { label: 'EXHALE', seconds: 6, type: 'exhale' as const },
];

const WAVE_BARS = [
  { height: 14, delayMs: 0 },
  { height: 22, delayMs: 140 },
  { height: 18, delayMs: 280 },
  { height: 26, delayMs: 420 },
  { height: 16, delayMs: 210 },
];

export const VoicePanicAnchorTile: React.FC<VoicePanicAnchorTileProps> = ({
  timeText,
  biometrics,
  audioEnabled,
  autoStartSeq,
  onConsumeAutoStart,
  onToggleAudio,
  onCompleteReset,
  onPanicStateChange,
  onSubViewChange,
  onHaptic,
  backSignal = 0,
}) => {
  const [sessionActive, setSessionActive] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [totalTicks, setTotalTicks] = useState(0); // 10 ticks/sec; 140 ticks = 1 full 4-4-6 cycle
  const [paused, setPaused] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [startHr, setStartHr] = useState(biometrics.hr);
  const [completionBanner, setCompletionBanner] = useState<string | null>(null);

  const prevCycleRef = useRef(0);
  const prevPhaseRef = useRef(-1);
  const bannerTimerRef = useRef<number | null>(null);

  const startSession = () => {
    primeVoiceAudio();
    setCompletionBanner(null);
    setStageIdx(0);
    setTotalTicks(0);
    setPaused(false);
    setVoiceError(null);
    setStartHr(biometrics.hr);
    prevCycleRef.current = 0;
    prevPhaseRef.current = -1;
    setSessionActive(true);
  };

  const stopSessionToStandby = () => {
    stopSpeech();
    stopSanctuaryAudio();
    setSessionActive(false);
    setPaused(false);
    setVoiceError(null);
  };

  // Auto-start immediately when launched from 2 o'clock button, Watch Face Anchor, Stress Alert, Notifications, Red Emotion, or Routines
  useEffect(() => {
    if (autoStartSeq > 0) {
      startSession();
      onConsumeAutoStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartSeq]);

  // Keep WatchChassis & App synced on active panic lock state
  useEffect(() => {
    onPanicStateChange(sessionActive);
    onSubViewChange?.(sessionActive);
  }, [sessionActive, onPanicStateChange, onSubViewChange]);

  // Handle Escape / left-edge back gesture while active
  useEffect(() => {
    if (backSignal > 0 && sessionActive) {
      stopSessionToStandby();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backSignal]);

  // Clean up audio & timers on unmount
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
      stopSpeech();
      stopSanctuaryAudio();
      onPanicStateChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch all grounding voice cues when entering screen or enabling voice
  useEffect(() => {
    if (!audioEnabled) {
      setVoiceError(null);
      return;
    }
    prefetchCalmAnchorCues(
      VOICE_PANIC_ANCHOR_STAGES.map((s) => s.spokenText),
      true
    );
  }, [audioEnabled]);

  const cycleTick = totalTicks % 140;
  const phaseIdx = cycleTick < 40 ? 0 : cycleTick < 80 ? 1 : 2;
  const currentPhase = PANIC_PHASES[phaseIdx];
  const phaseLocalTick =
    phaseIdx === 0 ? cycleTick : phaseIdx === 1 ? cycleTick - 40 : cycleTick - 80;
  const totalPhaseTicks = currentPhase.seconds * 10;
  const countdown = Math.max(1, Math.ceil((totalPhaseTicks - phaseLocalTick) / 10));
  const stage = VOICE_PANIC_ANCHOR_STAGES[stageIdx];

  // Speak calm grounding cue on stage change or resume while active
  useEffect(() => {
    if (!sessionActive || paused) return;
    playPanicAnchorBell(audioEnabled);
    speakCalmAnchor(stage.spokenText, audioEnabled, setVoiceError);
  }, [sessionActive, stageIdx, audioEnabled, paused, stage.spokenText]);

  // Soft breath chime on each 4-4-6 phase transition
  useEffect(() => {
    if (!sessionActive || paused) return;
    if (prevPhaseRef.current !== phaseIdx) {
      prevPhaseRef.current = phaseIdx;
      playBreathCue(audioEnabled, currentPhase.type);
    }
  }, [sessionActive, phaseIdx, paused, audioEnabled, currentPhase.type]);

  // Advance grounding cue smoothly after each full 14s breath cycle
  useEffect(() => {
    if (!sessionActive) return;
    const cycleCount = Math.floor(totalTicks / 140);
    if (cycleCount > prevCycleRef.current) {
      prevCycleRef.current = cycleCount;
      setStageIdx((s) => (s + 1) % VOICE_PANIC_ANCHOR_STAGES.length);
    }
  }, [sessionActive, totalTicks]);

  // 100ms master breathing clock
  useEffect(() => {
    if (!sessionActive || paused) return;
    const id = window.setInterval(() => {
      setTotalTicks((t) => t + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [sessionActive, paused]);

  // Gentle simulated parasympathetic HR settling during active panic de-escalation
  const elapsedSec = Math.floor(totalTicks / 10);
  const simulatedDrop = Math.min(11, Math.floor(elapsedSec / 6));
  const liveSettlingHr = Math.max(58, startHr - simulatedDrop);
  const hrDelta = startHr - liveSettlingHr;

  const handleExitSteadier = () => {
    onHaptic('#63D4A3');
    const durationMin = Math.max(1, Math.round(elapsedSec / 60));
    const endHr = Math.max(58, startHr - Math.max(4, simulatedDrop));
    const drop = Math.max(0, startHr - endHr);

    stopSessionToStandby();
    onCompleteReset({
      protocolId: 'voice-panic-anchor',
      protocolName: 'Voice Panic Anchor',
      durationMin,
      startHr,
      endHr,
      shiftRating: 'calmer',
    });

    setCompletionBanner(drop > 0 ? `Steadier · HR -${drop} bpm` : 'Steadier · Reset Saved');
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setCompletionBanner(null), 4200);
  };

  /* ============================================================================
   * STANDBY / READY WATCH SCREEN (Swipeable Tile 5)
   * ==========================================================================*/
  if (!sessionActive) {
    const elevated = biometrics.cedaLevel === 'elevated' || biometrics.hr >= 95;
    const accent = elevated ? '#E89B8C' : '#63D4A3';

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-between bg-[#0E1110] px-10 pb-9 pt-[46px] text-center">
        <CurvedTimeText timeText={timeText} label="Panic Anchor" />

        {/* Subtle Perimeter Beacon Halo */}
        <div
          className="animate-panic-beacon pointer-events-none absolute inset-[14px] rounded-full border"
          style={{
            borderColor: elevated ? 'rgba(232,155,140,0.28)' : 'rgba(99,212,163,0.18)',
          }}
        />

        {/* Top Live Biofeedback Status Pill */}
        <div className="relative z-10 flex flex-col items-center gap-1">
          {completionBanner ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-[#63D4A3]/55 bg-[#152920] px-3 py-1 text-[10px] font-semibold text-[#63D4A3]">
              <Check className="h-3 w-3 stroke-[2.5]" />
              <span>{completionBanner}</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tabular-nums"
              style={{
                borderColor: elevated ? 'rgba(232,155,140,0.45)' : '#2B312F',
                backgroundColor: elevated ? '#2A1B19' : '#161A19',
                color: elevated ? '#F0B0A3' : '#D1D6D4',
              }}
            >
              <Heart className="h-2.5 w-2.5" style={{ color: accent }} />
              <span>
                <MicroRollNumber value={biometrics.hr} /> bpm
              </span>
              <span aria-hidden="true" className="opacity-45">
                ·
              </span>
              <span className="capitalize">cEDA {biometrics.cedaLevel}</span>
            </div>
          )}
          <p className="text-[9.5px] font-medium text-[#9CA3A0]">
            4-4-6 Slow Exhale · 4 Voice Cues
          </p>
        </div>

        {/* Center 1-Tap Glowing Launch Orb */}
        <div className="relative z-10 flex items-center justify-center">
          <div
            className="animate-panic-beacon pointer-events-none absolute h-[142px] w-[142px] rounded-full"
            style={{
              background: elevated
                ? 'radial-gradient(circle, rgba(232,155,140,0.24) 0%, rgba(232,155,140,0) 70%)'
                : 'radial-gradient(circle, rgba(99,212,163,0.20) 0%, rgba(99,212,163,0) 70%)',
            }}
          />
          <button
            type="button"
            onClick={() => {
              onHaptic('#F0B0A3');
              startSession();
            }}
            className="wear-press group relative flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full border-2 transition-all active:scale-[0.93]"
            style={{
              borderColor: elevated ? '#E89B8C' : '#63D4A3',
              background: elevated
                ? 'radial-gradient(circle at 35% 25%, #3A221F 0%, #231513 78%)'
                : 'radial-gradient(circle at 35% 25%, #1A3127 0%, #111D18 78%)',
              boxShadow: elevated
                ? '0 0 28px rgba(232,155,140,0.28)'
                : '0 0 26px rgba(99,212,163,0.22)',
            }}
            aria-label="Start Voice Panic Anchor"
          >
            <ShieldAlert
              className="h-6 w-6 transition-transform group-hover:scale-105"
              style={{ color: accent }}
            />
            <span className="mt-1.5 text-[13px] font-bold leading-none text-[#F4F6F5]">
              Start Anchor
            </span>
            <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3A0]">
              Tap to Begin
            </span>
          </button>
        </div>

        {/* Restored 4-Stage Grounding Preview + Quick Voice Toggle */}
        <div className="relative z-10 flex w-full max-w-[236px] flex-col items-center gap-2">
          <div className="grid w-full grid-cols-4 gap-1">
            {VOICE_PANIC_ANCHOR_STAGES.map((s) => (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  onHaptic('#F0B0A3');
                  startSession();
                  setStageIdx(s.step - 1);
                }}
                className="wear-press flex flex-col items-center rounded-[10px] border border-[#282F2C] bg-[#161A19] px-1 py-1 text-center transition-colors hover:border-[#63D4A3]/50"
              >
                <span className="font-mono text-[8.5px] font-bold text-[#63D4A3]">0{s.step}</span>
                <span className="mt-0.5 max-w-full truncate text-[7.5px] font-medium text-[#D1D6D4]">
                  {s.headline.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              primeVoiceAudio();
              onHaptic();
              onToggleAudio();
            }}
            className={`wear-press inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[10px] font-semibold transition-colors active:scale-95 ${
              audioEnabled
                ? 'border-[#63D4A3]/50 bg-[#152920] text-[#63D4A3]'
                : 'border-[#2F3633] bg-[#181C1B] text-[#D1D6D4]'
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="h-3 w-3 text-[#63D4A3]" />
            ) : (
              <VolumeX className="h-3 w-3 text-[#9CA3A0]" />
            )}
            <span>{audioEnabled ? 'Calm Voice On' : 'Voice Muted'}</span>
          </button>
        </div>
      </div>
    );
  }

  /* ============================================================================
   * ACTIVE VOICE PANIC ANCHOR SANCTUARY (Full Dedicated Watch Screen)
   * ==========================================================================*/
  const phaseProgress = Math.min(1, phaseLocalTick / Math.max(1, totalPhaseTicks));
  const ringScale =
    currentPhase.type === 'inhale'
      ? 0.76 + phaseProgress * 0.24
      : currentPhase.type === 'hold'
      ? 1.0
      : 1.0 - phaseProgress * 0.24;

  const overallCycleProgress = cycleTick / 140;
  const waveActive = audioEnabled && !paused;

  return (
    <div className="animate-radial-reveal relative flex h-full w-full flex-col items-center justify-between bg-[#0D100F] px-10 pb-9 pt-8 text-center">
      {/* Perimeter Panic Beacon Pulse Ring */}
      <div className="animate-panic-beacon pointer-events-none absolute inset-[10px] rounded-full border border-[#63D4A3]/25" />

      {/* Outer Bezel 14s Breathing Cycle Progress Arc */}
      <CurvedEdgeArc
        startAngle={0}
        endAngle={359.5}
        progress={overallCycleProgress}
        radius={196}
        strokeWidth={3.5}
        color="#63D4A3"
        trackColor="rgba(99,212,163,0.12)"
      />

      {/* Circular-Safe Top Header: Stage Headline + Biofeedback + Voice/Close */}
      <div className="relative z-10 flex w-full max-w-[186px] flex-col items-center gap-1">
        <div className="text-center">
          <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#63D4A3] leading-none tabular-nums">
            {`Stage ${stage.step}/4 · ${stage.headline}`}
          </p>
          <div className="mt-1 flex items-center justify-center gap-1.5 font-mono text-[9.5px] text-[#9CA3A0] leading-none tabular-nums">
            <span className="text-[#E5E9E7]">
              <MicroRollNumber value={liveSettlingHr} /> bpm
            </span>
            {hrDelta > 0 && <span className="text-[#63D4A3]">{`-${hrDelta}`}</span>}
            <span aria-hidden="true">·</span>
            <span className="capitalize">{biometrics.cedaLevel}</span>
          </div>
        </div>

        <div className="mt-0.5 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              primeVoiceAudio();
              onHaptic();
              if (audioEnabled) stopSpeech();
              onToggleAudio();
            }}
            className={`wear-press flex h-6 items-center gap-1 rounded-full border px-2.5 text-[9.5px] font-semibold transition-colors active:scale-95 ${
              audioEnabled
                ? 'border-[#63D4A3]/55 bg-[#152920] text-[#63D4A3]'
                : 'border-[#2F3633] bg-[#181C1B] text-[#E5E9E7]'
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="h-3 w-3 text-[#63D4A3]" />
            ) : (
              <VolumeX className="h-3 w-3 text-[#9CA3A0]" />
            )}
            <span>{audioEnabled ? 'Voice On' : 'Voice Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onHaptic();
              stopSessionToStandby();
            }}
            aria-label="Stop Voice Panic Anchor"
            className="wear-press flex h-6 w-6 items-center justify-center rounded-full border border-[#2F3633] bg-[#181C1B] text-[#D1D6D4] hover:text-white active:scale-90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Center Breathing Ring Flanked by Restored Animated Voice Waveform Bars */}
      <div className="relative z-10 flex items-center justify-center gap-4">
        {/* Left Voice Waveform Visualizer */}
        <div
          className="flex h-8 items-center gap-[3px]"
          aria-hidden="true"
        >
          {WAVE_BARS.map((bar, i) => (
            <span
              key={`wl-${i}`}
              className={`w-[2.5px] rounded-full transition-opacity duration-300 ${
                waveActive ? 'animate-wave-bar bg-[#63D4A3]/80 opacity-100' : 'bg-[#3C4642] opacity-40'
              }`}
              style={{
                height: `${bar.height}px`,
                animationDelay: `${bar.delayMs}ms`,
              }}
            />
          ))}
        </div>

        {/* Expanding/Contracting Mint Breathing Ring (4s in · 4s hold · 6s slow exhale) */}
        <div className="relative flex h-[116px] w-[116px] items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border border-[#63D4A3] transition-transform duration-150 ease-linear"
            style={{
              transform: `scale(${ringScale})`,
              background:
                'radial-gradient(circle, rgba(99,212,163,0.16) 0%, rgba(99,212,163,0.05) 68%, rgba(99,212,163,0.02) 100%)',
              boxShadow: '0 0 24px rgba(99,212,163,0.16)',
            }}
          />
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#63D4A3]">
              {currentPhase.label}
            </span>
            <span className="mt-0.5 font-mono text-[34px] font-bold leading-none text-[#F4F6F5] tabular-nums">
              {countdown}
            </span>
            <span className="mt-1 text-[7.5px] font-medium text-[#9CA3A0]">
              4 · 4 · 6 pace
            </span>
          </div>
        </div>

        {/* Right Voice Waveform Visualizer (mirrored) */}
        <div
          className="flex h-8 items-center gap-[3px]"
          aria-hidden="true"
        >
          {[...WAVE_BARS].reverse().map((bar, i) => (
            <span
              key={`wr-${i}`}
              className={`w-[2.5px] rounded-full transition-opacity duration-300 ${
                waveActive ? 'animate-wave-bar bg-[#63D4A3]/80 opacity-100' : 'bg-[#3C4642] opacity-40'
              }`}
              style={{
                height: `${bar.height}px`,
                animationDelay: `${bar.delayMs + 90}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Interactive 4-Stage Grounding Stepper Dots */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        {voiceError && audioEnabled && (
          <p className="text-[8.5px] font-medium text-[#E89B8C]">{voiceError}</p>
        )}

        <div className="flex items-center justify-center gap-1.5">
          {VOICE_PANIC_ANCHOR_STAGES.map((s, idx) => {
            const active = idx === stageIdx;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  primeVoiceAudio();
                  onHaptic();
                  setStageIdx(idx);
                }}
                aria-label={`Jump to stage ${s.step}: ${s.headline}`}
                className={`h-[5px] rounded-full transition-all duration-200 ${
                  active ? 'w-5 bg-[#63D4A3]' : 'w-[5px] bg-[#3C4642] hover:bg-[#6E7C76]'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Soothing Sanctuary Ambient Audio Mini-Bar */}
      <div className="relative z-10 w-full max-w-[254px]">
        <SanctuaryAudioBar autoPlay={audioEnabled} compact onHaptic={onHaptic} />
      </div>

      {/* Circular-Safe Bottom Controls: Pause | Next Cue + Centered Mint "I Feel Steadier" Pill */}
      <div className="relative z-10 flex w-full max-w-[200px] flex-col items-center gap-1.5">
        <div className="grid w-full grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              primeVoiceAudio();
              onHaptic();
              setPaused((p) => {
                if (!p) stopSpeech();
                return !p;
              });
            }}
            className="wear-press flex min-h-[26px] items-center justify-center gap-1 rounded-full border border-[#2F3633] bg-[#181C1B] px-2 text-[9.5px] font-semibold text-[#E5E9E7] hover:bg-[#202523] active:scale-95"
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              primeVoiceAudio();
              onHaptic();
              setStageIdx((s) => (s + 1) % VOICE_PANIC_ANCHOR_STAGES.length);
            }}
            className="wear-press flex min-h-[26px] items-center justify-center rounded-full border border-[#2F3633] bg-[#181C1B] px-2 text-[9.5px] font-semibold text-[#E5E9E7] hover:bg-[#202523] active:scale-95"
          >
            Next Cue
          </button>
        </div>

        <button
          type="button"
          onClick={handleExitSteadier}
          className="wear-press min-h-[32px] w-[144px] rounded-full bg-[#63D4A3] px-4 text-[11px] font-bold text-[#0B1A13] shadow-[0_0_18px_rgba(99,212,163,0.24)] transition-colors hover:bg-[#76DDB0] active:scale-[0.93]"
        >
          I Feel Steadier
        </button>
      </div>
    </div>
  );
};
