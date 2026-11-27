import {
  DailyBiometricDay,
  GratitudeEntry,
  MoodEntry,
  ResetSession,
  RulerQuadrant,
  ScheduledRoutine,
  SomaticProtocol,
  WellbeState,
} from '../types';

export const SOMATIC_PROTOCOLS: SomaticProtocol[] = [
  {
    id: 'phys-sigh',
    name: 'Physiological Sigh',
    shortSubtitle: '2s + 1s In · 6s Out',
    category: 'breathing',
    accent: '#63D4A3',
    recommendedFor: ['red', 'blue'],
    phases: [
      { label: 'Inhale', cue: 'Deep nose breath', durationSec: 2, type: 'inhale', targetScale: 0.84 },
      { label: 'Top-Up', cue: 'Short second sip', durationSec: 1, type: 'inhale2', targetScale: 1.0 },
      { label: 'Long Exhale', cue: 'Slow mouth release', durationSec: 6, type: 'exhale', targetScale: 0.42 },
    ],
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    shortSubtitle: '4 · 4 · 4 · 4 Steady',
    category: 'breathing',
    accent: '#93BBE0',
    recommendedFor: ['red', 'yellow'],
    phases: [
      { label: 'Inhale', cue: 'Steady through nose', durationSec: 4, type: 'inhale', targetScale: 1.0 },
      { label: 'Hold', cue: 'Soften shoulders', durationSec: 4, type: 'hold', targetScale: 1.0 },
      { label: 'Exhale', cue: 'Even release', durationSec: 4, type: 'exhale', targetScale: 0.44 },
      { label: 'Rest', cue: 'Empty & still', durationSec: 4, type: 'hold', targetScale: 0.44 },
    ],
  },
  {
    id: '4-7-8',
    name: '4-7-8 Parasympathetic',
    shortSubtitle: '4s In · 7s Hold · 8s Out',
    category: 'breathing',
    accent: '#B5A8E0',
    recommendedFor: ['red', 'blue'],
    phases: [
      { label: 'Inhale', cue: 'Quiet nose inhale', durationSec: 4, type: 'inhale', targetScale: 0.96 },
      { label: 'Hold', cue: 'Let pulse slow', durationSec: 7, type: 'hold', targetScale: 0.96 },
      { label: 'Exhale', cue: 'Long whoosh out', durationSec: 8, type: 'exhale', targetScale: 0.4 },
    ],
  },
  {
    id: 'body-drop',
    name: 'Somatic Body Drop',
    shortSubtitle: 'Jaw · Shoulders · Belly',
    category: 'somatic',
    accent: '#E8C96D',
    recommendedFor: ['red', 'blue'],
    phases: [
      { label: 'Unclench Jaw', cue: 'Let tongue rest low', durationSec: 8, type: 'step', targetScale: 0.72 },
      { label: 'Drop Shoulders', cue: 'Two inches down', durationSec: 8, type: 'step', targetScale: 0.62 },
      { label: 'Open Hands', cue: 'Soften palms & fingers', durationSec: 8, type: 'step', targetScale: 0.8 },
      { label: 'Soften Belly', cue: 'Release braced core', durationSec: 8, type: 'step', targetScale: 0.92 },
      { label: 'Long Exhale', cue: 'Feel gravity hold you', durationSec: 8, type: 'exhale', targetScale: 0.44 },
    ],
  },
  {
    id: 'sensory-54321',
    name: '5-4-3-2-1 Anchor',
    shortSubtitle: 'Tap-to-Advance Grounding',
    category: 'sensory',
    accent: '#93BBE0',
    recommendedFor: ['red', 'blue'],
    interactiveTapAdvance: true,
    phases: [
      { label: '5 Things Seen', cue: 'Spot 5 shapes near you', durationSec: 12, type: 'step', targetScale: 0.92 },
      { label: '4 Things Felt', cue: 'Feet, watch band, air', durationSec: 12, type: 'step', targetScale: 0.82 },
      { label: '3 Sounds Heard', cue: 'Near & distant tones', durationSec: 12, type: 'step', targetScale: 0.72 },
      { label: '2 Things Smelled', cue: 'Notice subtle scents', durationSec: 10, type: 'step', targetScale: 0.62 },
      { label: '1 Steady Breath', cue: 'You are right here', durationSec: 10, type: 'exhale', targetScale: 0.5 },
    ],
  },
  {
    id: 'resonance',
    name: 'Resonance Pacing',
    shortSubtitle: '5.5s In · 5.5s Out · HRV',
    category: 'breathing',
    accent: '#8FD8B5',
    recommendedFor: ['green', 'yellow', 'blue'],
    phases: [
      { label: 'Inhale', cue: 'Smooth 5.5s wave', durationSec: 5.5, type: 'inhale', targetScale: 1.0 },
      { label: 'Exhale', cue: 'Coherent 5.5s release', durationSec: 5.5, type: 'exhale', targetScale: 0.44 },
    ],
  },
];

export const DEFAULT_SCHEDULED_ROUTINES: ScheduledRoutine[] = [
  {
    id: 'routine-evening-wind-down',
    name: 'Evening Wind-Down',
    timeLabel: '8:30 PM',
    daysLabel: 'Mon, Wed, Fri, Sun',
    durationMin: 5,
    protocolId: '4-7-8',
    tag: 'Restorative',
    active: true,
  },
  {
    id: 'routine-morning-grounding',
    name: 'Morning Grounding',
    timeLabel: '7:30 AM',
    daysLabel: 'Mon, Tue, Thu, Sat',
    durationMin: 3,
    protocolId: 'phys-sigh',
    tag: 'Grounding',
    active: true,
  },
];

export interface PanicAnchorStage {
  step: number;
  headline: string;
  spokenText: string;
  durationMs: number;
}

export const VOICE_PANIC_ANCHOR_STAGES: PanicAnchorStage[] = [
  {
    step: 1,
    headline: 'Drop Your Shoulders',
    spokenText:
      "I'm right here with you. You are safe in this moment. Slowly let your shoulders soften and drop.",
    durationMs: 14000,
  },
  {
    step: 2,
    headline: 'Feel Both Feet',
    spokenText:
      'Take all the time you need. Feel the steady ground holding both of your feet right now.',
    durationMs: 14000,
  },
  {
    step: 3,
    headline: 'Soften Jaw & Hands',
    spokenText:
      'Gently unclench your jaw, and let your hands open, warm and heavy, with nothing you need to hold.',
    durationMs: 14000,
  },
  {
    step: 4,
    headline: 'Notice One Anchor',
    spokenText:
      "Notice one solid, comforting thing you can touch. This wave is already easing, and you're doing so well.",
    durationMs: 14000,
  },
];

export const GRATITUDE_QUICK_CHIPS = [
  'Quiet Moment',
  'Good Rest',
  'Connection',
  'Small Win',
  'Body Strength',
  'Fresh Air',
] as const;

export const SIMULATED_VOICE_GRATITUDES: { text: string; tag: string }[] = [
  { text: 'Warm morning sunlight through the kitchen window before emails started.', tag: 'Quiet Moment' },
  { text: 'A five-minute walk outside cleared my head between afternoon meetings.', tag: 'Fresh Air' },
  { text: 'Checked in with a friend who listened without trying to fix anything.', tag: 'Connection' },
  { text: 'Finished a tricky task without rushing or pushing past my energy limit.', tag: 'Small Win' },
  { text: 'Noticed my shoulders drop after two rounds of physiological sighs.', tag: 'Body Strength' },
  { text: 'Went to bed twenty minutes earlier and woke up feeling noticeably steadier.', tag: 'Good Rest' },
];

// Deterministic pseudo-random generator for stable, realistic 30-day seed data
function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function formatLocalDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createSeedState(): WellbeState {
  const rand = seededRand(32026);
  const now = new Date();

  const dailyBiometrics: DailyBiometricDay[] = [];
  const moods: MoodEntry[] = [];
  const gratitudes: GratitudeEntry[] = [];
  const resets: ResetSession[] = [];

  const quadrantEmotions: Record<RulerQuadrant, string[]> = {
    red: ['Anxious', 'Stressed', 'Frustrated', 'Overwhelmed'],
    yellow: ['Ecstatic', 'Joyful', 'Energized', 'Inspired'],
    blue: ['Tired', 'Drained', 'Sad', 'Lonely'],
    green: ['Grateful', 'Calm', 'Content', 'Rested'],
  };

  const quadrantTags: Record<RulerQuadrant, string[][]> = {
    red: [['Work'], ['Work', 'Body'], ['Work', 'Sleep'], ['Social', 'Body'], ['Work']],
    yellow: [['Work', 'Movement'], ['Social'], ['Movement'], ['Work', 'Rest'], ['Social', 'Movement']],
    blue: [['Sleep', 'Work'], ['Sleep', 'Body'], ['Work'], ['Rest', 'Sleep'], ['Social']],
    green: [['Rest'], ['Sleep', 'Rest'], ['Movement', 'Rest'], ['Social', 'Rest'], ['Body', 'Rest']],
  };

  const gratitudeSamples: { text: string; tag: string; q: RulerQuadrant }[] = [
    { text: 'Quiet ten minutes with coffee before opening my laptop.', tag: 'Quiet Moment', q: 'green' },
    { text: 'Slept straight through until the gentle watch alarm.', tag: 'Good Rest', q: 'green' },
    { text: 'Honest laugh during a midday catch-up call.', tag: 'Connection', q: 'yellow' },
    { text: 'Stepped away when tension rose instead of pushing through.', tag: 'Small Win', q: 'green' },
    { text: 'Evening walk felt crisp and reset my posture.', tag: 'Fresh Air', q: 'green' },
    { text: 'My legs felt steady and strong on the morning stairs.', tag: 'Body Strength', q: 'yellow' },
    { text: 'Caught a spiral early with two slow exhales.', tag: 'Small Win', q: 'blue' },
    { text: 'No screens for thirty minutes before bed.', tag: 'Good Rest', q: 'green' },
    { text: 'Thoughtful text from family right when afternoon dipped.', tag: 'Connection', q: 'green' },
    { text: 'Sunlight on the desk made the room feel warm and calm.', tag: 'Quiet Moment', q: 'yellow' },
    { text: 'Cool evening breeze after a long stretch of meetings.', tag: 'Fresh Air', q: 'green' },
    { text: 'Wrapped work on time and protected dinner.', tag: 'Small Win', q: 'yellow' },
  ];

  // Build 30 days of telemetry + correlated mood entries (29 days ago -> today)
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() - daysAgo);
    const dateISO = formatLocalDateISO(dayDate);

    // Realistic sleep variation: 4.9h to 8.6h, slightly better on weekends & recent few days
    const dow = dayDate.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const lowSleepDip = daysAgo === 24 || daysAgo === 18 || daysAgo === 11 || daysAgo === 5 || daysAgo === 2;
    let sleepHours: number;
    if (daysAgo === 0) {
      sleepHours = 7.4;
    } else if (lowSleepDip) {
      sleepHours = Number((5.3 + rand() * 0.9).toFixed(1));
    } else if (isWeekend) {
      sleepHours = Number((7.5 + rand() * 1.0).toFixed(1));
    } else {
      sleepHours = Number((6.6 + rand() * 1.4).toFixed(1));
    }

    const avgHrv = Math.round(
      daysAgo === 0
        ? 64
        : Math.max(32, Math.min(82, 46 + (sleepHours - 5.2) * 8.5 + (rand() - 0.5) * 10))
    );
    const restingHr = Math.round(
      daysAgo === 0
        ? 60
        : Math.max(54, Math.min(72, 66 - (sleepHours - 6.0) * 2.2 + (rand() - 0.5) * 4))
    );
    const avgHr = Math.round(restingHr + 8 + (lowSleepDip ? 6 : 0) + rand() * 5);
    const sleepDeepPct = Math.round(16 + (sleepHours > 7 ? 5 : 0) + rand() * 5);
    const sleepRemPct = Math.round(20 + (sleepHours > 7 ? 4 : 0) + rand() * 5);
    const steps =
      daysAgo === 0
        ? 7200
        : Math.round(
            Math.max(
              3800,
              Math.min(11800, 6200 + (sleepHours >= 7 ? 1600 : -900) + (isWeekend ? 1400 : 0) + (rand() - 0.5) * 2600)
            )
          );

    dailyBiometrics.push({
      dateISO,
      avgHr,
      restingHr,
      avgHrv,
      sleepHours,
      sleepDeepPct,
      sleepRemPct,
      steps,
    });

    // Generate 2–3 mood entries per day (today gets 3 realistic entries anchored before current time)
    const entryCount = daysAgo === 0 ? 3 : daysAgo < 7 ? (rand() > 0.35 ? 3 : 2) : (rand() > 0.55 ? 3 : 2);
    const hourSlots = daysAgo === 0 ? [null, null, null] : [9, 14, 20];

    for (let idx = 0; idx < entryCount; idx++) {
      let entryTime: Date;
      if (daysAgo === 0) {
        const minsBack = idx === 0 ? 235 : idx === 1 ? 98 : 18;
        entryTime = new Date(now.getTime() - minsBack * 60 * 1000);
      } else {
        entryTime = new Date(dayDate);
        const baseHour = hourSlots[idx] ?? 16;
        entryTime.setHours(baseHour, Math.floor(rand() * 55), 0, 0);
      }

      // Strongly realistic correlation: >=7h sleep boosts Green/Yellow; <6.3h increases Red/Blue
      let quadrant: RulerQuadrant;
      if (daysAgo === 0) {
        quadrant = idx === 0 ? 'yellow' : idx === 1 ? 'red' : 'green';
      } else {
        const roll = rand();
        if (sleepHours >= 7.0) {
          if (roll < 0.44) quadrant = 'green';
          else if (roll < 0.76) quadrant = 'yellow';
          else if (roll < 0.89) quadrant = 'blue';
          else quadrant = 'red';
        } else {
          if (roll < 0.36) quadrant = 'red';
          else if (roll < 0.68) quadrant = 'blue';
          else if (roll < 0.86) quadrant = 'green';
          else quadrant = 'yellow';
        }
      }

      const emoPool = quadrantEmotions[quadrant];
      let emotion: string;
      if (daysAgo === 0) {
        emotion = idx === 0 ? 'Inspired' : idx === 1 ? 'Stressed' : 'Calm';
      } else {
        emotion = emoPool[Math.floor(rand() * emoPool.length)];
      }

      const tagPool = quadrantTags[quadrant];
      const tags =
        daysAgo === 0
          ? idx === 0
            ? ['Work', 'Sleep']
            : idx === 1
            ? ['Work']
            : ['Rest', 'Body']
          : tagPool[Math.floor(rand() * tagPool.length)];

      const hrAdjust = quadrant === 'red' ? 14 : quadrant === 'yellow' ? 6 : quadrant === 'blue' ? -2 : -5;
      const hrAtLog = Math.max(54, Math.min(118, Math.round(avgHr + hrAdjust + (rand() - 0.5) * 6)));
      const hrvAdjust = quadrant === 'red' ? -11 : quadrant === 'green' ? 6 : quadrant === 'blue' ? -6 : 2;
      const hrvAtLog = Math.max(22, Math.min(92, Math.round(avgHrv + hrvAdjust)));

      moods.push({
        id: `seed-m-${daysAgo}-${idx}`,
        timestamp: entryTime.toISOString(),
        quadrant,
        emotion,
        tags,
        note:
          daysAgo === 0 && idx === 2
            ? 'Short breath break brought heart rate back down.'
            : daysAgo === 0 && idx === 1
            ? 'Back-to-back sprint reviews.'
            : undefined,
        hrAtLog,
        hrvAtLog,
        sleepHoursAtLog: sleepHours,
      });
    }

    // Seed gratitude entries roughly every 1.6 days (plus one earlier today)
    if (daysAgo === 0 || (daysAgo % 2 === 1 && rand() > 0.22) || daysAgo === 2 || daysAgo === 4) {
      const sample = gratitudeSamples[(daysAgo + 3) % gratitudeSamples.length];
      const gTime =
        daysAgo === 0
          ? new Date(now.getTime() - 42 * 60 * 1000)
          : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 19, 15 + (daysAgo % 30));
      gratitudes.push({
        id: `seed-g-${daysAgo}`,
        timestamp: gTime.toISOString(),
        text: sample.text,
        tag: sample.tag,
        linkedQuadrant: sample.q,
      });
    }

    // Seed somatic resets ~16 times over 30 days (including one earlier today)
    if (daysAgo === 0 || daysAgo === 1 || daysAgo === 2 || daysAgo === 4 || daysAgo === 5 || daysAgo % 3 === 0) {
      const proto = SOMATIC_PROTOCOLS[(daysAgo + 1) % SOMATIC_PROTOCOLS.length];
      const durationMin = [2, 3, 4, 2, 5, 3][daysAgo % 6];
      const startHr = Math.round(avgHr + 9 + rand() * 8);
      const drop = Math.round(4 + rand() * 5);
      const rTime =
        daysAgo === 0
          ? new Date(now.getTime() - 25 * 60 * 1000)
          : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 15, 10 + (daysAgo % 40));

      resets.push({
        id: `seed-r-${daysAgo}`,
        timestamp: rTime.toISOString(),
        protocolId: proto.id,
        protocolName: proto.name,
        durationMin,
        completed: true,
        startHr,
        endHr: Math.max(55, startHr - drop),
        shiftRating: rand() > 0.18 ? 'calmer' : 'same',
      });
    }
  }

  // Sort descending by timestamp
  moods.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  gratitudes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  resets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const recentHrHistory = [72, 70, 69, 74, 78, 75, 71, 69, 67, 66, 68, 68];

  return {
    moods,
    gratitudes,
    resets,
    scheduledRoutines: DEFAULT_SCHEDULED_ROUTINES,
    dailyBiometrics,
    liveBiometrics: {
      hr: 68,
      hrv: 64,
      sleepHours: 7.4,
      cedaLevel: 'calm',
      readiness: 82,
      hrHistory: recentHrHistory,
      lastSyncedAt: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
    },
    settings: {
      aodEnabled: false,
      audioEnabled: true,
      hapticsEnabled: true,
      dndStressAlerts: false,
      caseFinish: 'obsidian',
      rulerZoomMode: false,
      defaultResetMinutes: 3,
      anchorVoice: 'tender',
    },
    notifications: [
      {
        id: 'notif-1',
        timestamp: new Date(now.getTime() - 95 * 60 * 1000).toISOString(),
        title: 'Midday Body Response',
        detail: 'Brief HR bump to 88 bpm during work block. Resolved after 3m reset.',
        hr: 88,
        cedaLevel: 'moderate',
        dismissed: false,
      },
    ],
  };
}
