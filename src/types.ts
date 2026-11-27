export type RulerQuadrant = 'red' | 'yellow' | 'blue' | 'green';

export type EmotionIconKey =
  | 'sun'
  | 'smile'
  | 'zap'
  | 'sparkle'
  | 'heart'
  | 'waves'
  | 'circle-dot'
  | 'moon'
  | 'meh'
  | 'battery-low'
  | 'droplet'
  | 'circle-dashed'
  | 'activity'
  | 'alert-triangle'
  | 'x-circle'
  | 'target';

export interface RulerEmotionDef {
  emotion: string;
  quadrant: RulerQuadrant;
  icon: EmotionIconKey;
  ring: 'outer' | 'inner';
  angleDeg: number;
}

export interface RulerQuadrantTheme {
  id: RulerQuadrant;
  name: string;
  energyLabel: string;
  valenceLabel: string;
  accent: string;
  surface: string;
  border: string;
  softGlow: string;
  emotions: string[];
}

export const RULER_THEMES: Record<RulerQuadrant, RulerQuadrantTheme> = {
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    energyLabel: 'High Energy',
    valenceLabel: 'Pleasant',
    accent: '#F0D57B',
    surface: '#332D1F',
    border: '#685B3A',
    softGlow: 'rgba(240,213,123,0.18)',
    emotions: ['Ecstatic', 'Joyful', 'Energized', 'Inspired'],
  },
  green: {
    id: 'green',
    name: 'Green',
    energyLabel: 'Low Energy',
    valenceLabel: 'Pleasant',
    accent: '#A4DCC0',
    surface: '#1F3028',
    border: '#3F6352',
    softGlow: 'rgba(164,220,192,0.18)',
    emotions: ['Grateful', 'Calm', 'Content', 'Rested'],
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    energyLabel: 'Low Energy',
    valenceLabel: 'Unpleasant',
    accent: '#B0CCE5',
    surface: '#23303B',
    border: '#495F74',
    softGlow: 'rgba(176,204,229,0.18)',
    emotions: ['Tired', 'Drained', 'Sad', 'Lonely'],
  },
  red: {
    id: 'red',
    name: 'Red',
    energyLabel: 'High Energy',
    valenceLabel: 'Unpleasant',
    accent: '#F0B0A3',
    surface: '#372622',
    border: '#6B4841',
    softGlow: 'rgba(240,176,163,0.20)',
    emotions: ['Anxious', 'Stressed', 'Frustrated', 'Overwhelmed'],
  },
};

/**
 * Exact 16 emotions matching the companion smartphone app (WELLBE+ Instant Check-In),
 * arranged in a full edge-to-edge circular watch packing (12 outer + 4 inner circles).
 * Quadrants: Top-Left Yellow | Top-Right Green | Bottom-Right Blue | Bottom-Left Red.
 */
export const RULER_EMOTIONS_16: RulerEmotionDef[] = [
  // YELLOW — Top-Left Quadrant (285°, 315°, 345° outer + 315° inner)
  { emotion: 'Inspired', quadrant: 'yellow', icon: 'sparkle', ring: 'outer', angleDeg: 285 },
  { emotion: 'Ecstatic', quadrant: 'yellow', icon: 'sun', ring: 'outer', angleDeg: 315 },
  { emotion: 'Joyful', quadrant: 'yellow', icon: 'smile', ring: 'outer', angleDeg: 345 },
  { emotion: 'Energized', quadrant: 'yellow', icon: 'zap', ring: 'inner', angleDeg: 315 },

  // GREEN — Top-Right Quadrant (15°, 45°, 75° outer + 45° inner)
  { emotion: 'Calm', quadrant: 'green', icon: 'waves', ring: 'outer', angleDeg: 15 },
  { emotion: 'Content', quadrant: 'green', icon: 'circle-dot', ring: 'outer', angleDeg: 45 },
  { emotion: 'Rested', quadrant: 'green', icon: 'moon', ring: 'outer', angleDeg: 75 },
  { emotion: 'Grateful', quadrant: 'green', icon: 'heart', ring: 'inner', angleDeg: 45 },

  // BLUE — Bottom-Right Quadrant (105°, 135°, 165° outer + 135° inner)
  { emotion: 'Tired', quadrant: 'blue', icon: 'meh', ring: 'outer', angleDeg: 105 },
  { emotion: 'Sad', quadrant: 'blue', icon: 'droplet', ring: 'outer', angleDeg: 135 },
  { emotion: 'Lonely', quadrant: 'blue', icon: 'circle-dashed', ring: 'outer', angleDeg: 165 },
  { emotion: 'Drained', quadrant: 'blue', icon: 'battery-low', ring: 'inner', angleDeg: 135 },

  // RED — Bottom-Left Quadrant (195°, 225°, 255° outer + 225° inner)
  { emotion: 'Frustrated', quadrant: 'red', icon: 'x-circle', ring: 'outer', angleDeg: 195 },
  { emotion: 'Stressed', quadrant: 'red', icon: 'alert-triangle', ring: 'outer', angleDeg: 225 },
  { emotion: 'Anxious', quadrant: 'red', icon: 'activity', ring: 'outer', angleDeg: 255 },
  { emotion: 'Overwhelmed', quadrant: 'red', icon: 'target', ring: 'inner', angleDeg: 225 },
];

export const CONTEXT_TAGS = ['Work', 'Sleep', 'Social', 'Body', 'Rest', 'Movement'] as const;

export interface MoodEntry {
  id: string;
  timestamp: string;
  quadrant: RulerQuadrant;
  emotion: string;
  tags: string[];
  note?: string;
  hrAtLog: number;
  hrvAtLog: number;
  sleepHoursAtLog: number;
}

export interface GratitudeEntry {
  id: string;
  timestamp: string;
  text: string;
  tag: string;
  linkedQuadrant?: RulerQuadrant;
}

export interface ResetSession {
  id: string;
  timestamp: string;
  protocolId: string;
  protocolName: string;
  durationMin: number;
  completed: boolean;
  startHr: number;
  endHr: number;
  shiftRating?: 'calmer' | 'same' | 'extended';
}

export interface DailyBiometricDay {
  dateISO: string;
  avgHr: number;
  restingHr: number;
  avgHrv: number;
  sleepHours: number;
  sleepDeepPct: number;
  sleepRemPct: number;
  steps?: number;
}

export interface LiveBiometrics {
  hr: number;
  hrv: number;
  sleepHours: number;
  cedaLevel: 'calm' | 'moderate' | 'elevated';
  readiness: number;
  hrHistory: number[];
  lastSyncedAt: string;
}

export type WatchCaseFinish = 'obsidian' | 'silver' | 'champagne';

export type AnchorVoicePreset = 'tender' | 'warm' | 'grounded';

export interface AppSettings {
  aodEnabled: boolean;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  dndStressAlerts: boolean;
  caseFinish: WatchCaseFinish;
  rulerZoomMode: boolean;
  defaultResetMinutes: number;
  anchorVoice: AnchorVoicePreset;
}

export interface StressAlertItem {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  hr: number;
  cedaLevel: 'moderate' | 'elevated';
  dismissed: boolean;
}

export interface ScheduledRoutine {
  id: string;
  name: string;
  timeLabel: string;
  daysLabel: string;
  durationMin: number;
  protocolId: string;
  tag: 'Restorative' | 'Grounding' | 'De-escalation' | 'Focus';
  active: boolean;
}

export interface WellbeState {
  moods: MoodEntry[];
  gratitudes: GratitudeEntry[];
  resets: ResetSession[];
  scheduledRoutines: ScheduledRoutine[];
  dailyBiometrics: DailyBiometricDay[];
  liveBiometrics: LiveBiometrics;
  settings: AppSettings;
  notifications: StressAlertItem[];
}

export type TileId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface TileMeta {
  id: TileId;
  shortName: string;
  label: string;
}

export const TILES: TileMeta[] = [
  { id: 0, shortName: 'Home', label: 'Watch Home' },
  { id: 1, shortName: 'Emotions', label: '01 Emotions' },
  { id: 2, shortName: 'Routines', label: '02 Routines' },
  { id: 3, shortName: 'Log', label: '03 Log' },
  { id: 4, shortName: 'Trends', label: '04 Trends' },
  { id: 5, shortName: 'Anchor', label: '05 Panic Anchor' },
  { id: 6, shortName: 'Steps', label: '06 Step Counter' },
  { id: 7, shortName: 'Sleep', label: '07 Sleep Tracker' },
];

export type BreathPhaseType = 'inhale' | 'inhale2' | 'hold' | 'exhale' | 'step';

export interface ProtocolPhase {
  label: string;
  cue: string;
  durationSec: number;
  type: BreathPhaseType;
  targetScale: number;
}

export interface SomaticProtocol {
  id: string;
  name: string;
  shortSubtitle: string;
  category: 'breathing' | 'somatic' | 'sensory';
  accent: string;
  recommendedFor: RulerQuadrant[];
  phases: ProtocolPhase[];
  interactiveTapAdvance?: boolean;
}

export interface CoachReflection {
  id: string;
  title: string;
  body: string;
  signalLabel: string;
  accent: string;
  actionLabel: string;
  actionType: 'panic' | 'reset' | 'gratitude' | 'grid' | 'trends';
  protocolId?: string;
}

export interface AffectiveBucketStat {
  id: 'happy' | 'calm' | 'steady' | 'low' | 'upset';
  label: string;
  color: string;
  count: number;
  pct: number;
}

export interface AnalyticsSummary {
  rangeDays: 7 | 30;
  dateRangeLabel: string;
  totalMoods: number;
  quadrantCounts: Record<RulerQuadrant, number>;
  quadrantPcts: Record<RulerQuadrant, number>;
  affectiveBuckets: AffectiveBucketStat[];
  dominantQuadrant: RulerQuadrant;
  topEmotions: { emotion: string; quadrant: RulerQuadrant; count: number }[];
  topTags: { tag: string; count: number }[];
  redTriggerTags: { tag: string; count: number }[];
  greenSupportTags: { tag: string; count: number }[];
  avgSleep: number;
  avgSteps: number;
  avgHrv: number;
  baselineHrv30d: number;
  hrvDelta: number;
  avgHr: number;
  avgRestingHr: number;
  goodSleepMoodAvg: number;
  shortSleepMoodAvg: number;
  highStepsMoodAvg: number;
  lowStepsMoodAvg: number;
  sleepMoodCorrelationText: string;
  sleepMoodLiftPct: number;
  burnoutScore: number;
  burnoutStatus: 'Balanced' | 'Strained' | 'High';
  lowEnergyDays: number;
  resetsCompleted: number;
  totalResetMinutes: number;
  avgResetHrDrop: number;
  calmerRatePct: number;
  gratitudeCount: number;
  topGratitudeTags: { tag: string; count: number }[];
  dailyCurve: {
    dateISO: string;
    dateShort: string;
    label: string;
    isToday: boolean;
    score: number;
    sleepHours: number;
    avgHrv: number;
    steps: number;
    dominant: RulerQuadrant;
    count: number;
  }[];
}
