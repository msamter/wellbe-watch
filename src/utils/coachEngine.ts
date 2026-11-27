import {
  AffectiveBucketStat,
  AnalyticsSummary,
  CoachReflection,
  RulerQuadrant,
  WellbeState,
} from '../types';

const QUADRANT_SCORE: Record<RulerQuadrant, number> = {
  yellow: 4.5,
  green: 4.0,
  blue: 2.3,
  red: 1.8,
};

function getEmotionScore(quadrant: RulerQuadrant, emotion: string): number {
  if (emotion === 'Ecstatic' || emotion === 'Joyful') return 4.7;
  if (emotion === 'Energized' || emotion === 'Inspired') return 4.3;
  if (emotion === 'Grateful' || emotion === 'Calm' || emotion === 'Rested') return 4.0;
  if (emotion === 'Content') return 3.4;
  if (emotion === 'Tired') return 2.5;
  if (emotion === 'Drained' || emotion === 'Sad' || emotion === 'Lonely') return 2.1;
  if (emotion === 'Frustrated' || emotion === 'Stressed') return 1.9;
  if (emotion === 'Anxious' || emotion === 'Overwhelmed') return 1.5;
  return QUADRANT_SCORE[quadrant];
}

function getBucketForMood(quadrant: RulerQuadrant, emotion: string): AffectiveBucketStat['id'] {
  if (quadrant === 'yellow') return 'happy';
  if (quadrant === 'red') return 'upset';
  if (quadrant === 'blue') return 'low';
  if (emotion === 'Content') return 'steady';
  return 'calm';
}

function formatMonthDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function computeAnalyticsSummary(state: WellbeState, rangeDays: 7 | 30): AnalyticsSummary {
  const now = new Date();
  const cutoffMs = now.getTime() - rangeDays * 24 * 60 * 60 * 1000;
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (rangeDays - 1));
  const dateRangeLabel = `${formatMonthDay(startDate)} – ${formatMonthDay(now)}`;

  const moodsInRange = state.moods.filter((m) => new Date(m.timestamp).getTime() >= cutoffMs);
  const resetsInRange = state.resets.filter((r) => new Date(r.timestamp).getTime() >= cutoffMs);
  const gratitudesInRange = state.gratitudes.filter((g) => new Date(g.timestamp).getTime() >= cutoffMs);

  const bioSlice = state.dailyBiometrics.slice(-rangeDays);
  const allBio30 = state.dailyBiometrics.slice(-30);

  const quadrantCounts: Record<RulerQuadrant, number> = {
    red: 0,
    yellow: 0,
    blue: 0,
    green: 0,
  };

  const bucketCounts: Record<AffectiveBucketStat['id'], number> = {
    happy: 0,
    calm: 0,
    steady: 0,
    low: 0,
    upset: 0,
  };

  const emotionMap = new Map<string, { emotion: string; quadrant: RulerQuadrant; count: number }>();
  const tagMap = new Map<string, number>();
  const redTagMap = new Map<string, number>();
  const greenTagMap = new Map<string, number>();

  for (const m of moodsInRange) {
    quadrantCounts[m.quadrant]++;
    bucketCounts[getBucketForMood(m.quadrant, m.emotion)]++;

    const existing = emotionMap.get(m.emotion);
    if (existing) {
      existing.count++;
    } else {
      emotionMap.set(m.emotion, { emotion: m.emotion, quadrant: m.quadrant, count: 1 });
    }
    for (const t of m.tags) {
      tagMap.set(t, (tagMap.get(t) || 0) + 1);
      if (m.quadrant === 'red' || m.quadrant === 'blue') {
        redTagMap.set(t, (redTagMap.get(t) || 0) + 1);
      }
      if (m.quadrant === 'green' || m.quadrant === 'yellow') {
        greenTagMap.set(t, (greenTagMap.get(t) || 0) + 1);
      }
    }
  }

  const totalMoods = moodsInRange.length;
  const quadrantPcts: Record<RulerQuadrant, number> = {
    red: totalMoods ? Math.round((quadrantCounts.red / totalMoods) * 100) : 0,
    yellow: totalMoods ? Math.round((quadrantCounts.yellow / totalMoods) * 100) : 0,
    blue: totalMoods ? Math.round((quadrantCounts.blue / totalMoods) * 100) : 0,
    green: totalMoods ? Math.round((quadrantCounts.green / totalMoods) * 100) : 0,
  };

  if (totalMoods > 0) {
    const sum = quadrantPcts.red + quadrantPcts.yellow + quadrantPcts.blue + quadrantPcts.green;
    if (sum !== 100) {
      const largest = (['green', 'yellow', 'blue', 'red'] as RulerQuadrant[]).sort(
        (a, b) => quadrantCounts[b] - quadrantCounts[a]
      )[0];
      quadrantPcts[largest] += 100 - sum;
    }
  }

  // Exact 5 affective buckets from companion smartphone app Trends screen
  const bucketDefs: { id: AffectiveBucketStat['id']; label: string; color: string }[] = [
    { id: 'happy', label: 'Happy / Joyful', color: '#E8C96D' },
    { id: 'calm', label: 'Calm / Content', color: '#63D4A3' },
    { id: 'steady', label: 'Steady / Neutral', color: '#B4BFBA' },
    { id: 'low', label: 'Low / Drained', color: '#7BB2E3' },
    { id: 'upset', label: 'Upset / Stressed', color: '#E89B8C' },
  ];

  const affectiveBuckets: AffectiveBucketStat[] = bucketDefs.map((b) => ({
    ...b,
    count: bucketCounts[b.id],
    pct: totalMoods ? Math.round((bucketCounts[b.id] / totalMoods) * 100) : 0,
  }));

  if (totalMoods > 0) {
    const bSum = affectiveBuckets.reduce((acc, b) => acc + b.pct, 0);
    if (bSum !== 100) {
      const maxBucket = [...affectiveBuckets].sort((a, b) => b.count - a.count)[0];
      if (maxBucket) maxBucket.pct += 100 - bSum;
    }
  }

  const dominantQuadrant = (['green', 'yellow', 'blue', 'red'] as RulerQuadrant[]).sort(
    (a, b) => quadrantCounts[b] - quadrantCounts[a]
  )[0];

  const topEmotions = Array.from(emotionMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTags = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const redTriggerTags = Array.from(redTagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const greenSupportTags = Array.from(greenTagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Reflect live biometrics into today's slice so simulator sliders immediately update analytics
  const adjustedBio = bioSlice.map((d, idx) => {
    const fallbackSteps = d.steps ?? Math.round(6200 + (d.sleepHours - 6) * 1100);
    if (idx === bioSlice.length - 1) {
      return {
        ...d,
        sleepHours: state.liveBiometrics.sleepHours,
        avgHrv: state.liveBiometrics.hrv,
        avgHr: state.liveBiometrics.hr,
        steps: fallbackSteps,
      };
    }
    return { ...d, steps: fallbackSteps };
  });

  const avgSleep = adjustedBio.length
    ? Number((adjustedBio.reduce((acc, b) => acc + b.sleepHours, 0) / adjustedBio.length).toFixed(1))
    : state.liveBiometrics.sleepHours;
  const avgSteps = adjustedBio.length
    ? Math.round(adjustedBio.reduce((acc, b) => acc + b.steps, 0) / adjustedBio.length)
    : 7200;
  const avgHrv = adjustedBio.length
    ? Math.round(adjustedBio.reduce((acc, b) => acc + b.avgHrv, 0) / adjustedBio.length)
    : state.liveBiometrics.hrv;
  const baselineHrv30d = allBio30.length
    ? Math.round(allBio30.reduce((acc, b) => acc + b.avgHrv, 0) / allBio30.length)
    : 58;
  const hrvDelta = avgHrv - baselineHrv30d;
  const avgHr = adjustedBio.length
    ? Math.round(adjustedBio.reduce((acc, b) => acc + b.avgHr, 0) / adjustedBio.length)
    : state.liveBiometrics.hr;
  const avgRestingHr = adjustedBio.length
    ? Math.round(adjustedBio.reduce((acc, b) => acc + b.restingHr, 0) / adjustedBio.length)
    : 60;

  // Sleep x Mood numeric averages (matching companion app's "3.7/5 vs 2.7/5")
  const goodSleepMoods = moodsInRange.filter((m) => m.sleepHoursAtLog >= 7.0);
  const shortSleepMoods = moodsInRange.filter((m) => m.sleepHoursAtLog < 7.0);

  const avgScoreOf = (list: typeof moodsInRange, fallback: number) =>
    list.length
      ? Number(
          (
            list.reduce((acc, m) => acc + getEmotionScore(m.quadrant, m.emotion), 0) /
            list.length
          ).toFixed(1)
        )
      : fallback;

  const goodSleepMoodAvg = avgScoreOf(goodSleepMoods, 3.8);
  const shortSleepMoodAvg = avgScoreOf(shortSleepMoods, 2.7);

  const goodPleasantRate = goodSleepMoods.length
    ? goodSleepMoods.filter((m) => m.quadrant === 'green' || m.quadrant === 'yellow').length /
      goodSleepMoods.length
    : 0.72;
  const shortPleasantRate = shortSleepMoods.length
    ? shortSleepMoods.filter((m) => m.quadrant === 'green' || m.quadrant === 'yellow').length /
      shortSleepMoods.length
    : 0.38;
  const sleepMoodLiftPct = Math.max(8, Math.round((goodPleasantRate - shortPleasantRate) * 100));
  const sleepMoodCorrelationText = `On days following 7+ hours of sleep, your mood averaged ${goodSleepMoodAvg}/5 compared with ${shortSleepMoodAvg}/5 after shorter nights.`;

  // Daily 7-day curve
  const curveBio = adjustedBio.slice(-7);
  const dailyCurve = curveBio.map((b, idx) => {
    const dayMoods = moodsInRange.filter((m) => m.timestamp.slice(0, 10) === b.dateISO);
    const counts: Record<RulerQuadrant, number> = { red: 0, yellow: 0, blue: 0, green: 0 };
    let scoreSum = 0;
    for (const m of dayMoods) {
      counts[m.quadrant]++;
      scoreSum += getEmotionScore(m.quadrant, m.emotion);
    }
    const dom = (['green', 'yellow', 'blue', 'red'] as RulerQuadrant[]).sort(
      (a, b2) => counts[b2] - counts[a]
    )[0];
    const dObj = new Date(b.dateISO + 'T12:00:00');
    const isToday = idx === curveBio.length - 1;
    return {
      dateISO: b.dateISO,
      dateShort: formatMonthDay(dObj),
      label: isToday ? 'Now' : dObj.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      isToday,
      score: dayMoods.length ? Number((scoreSum / dayMoods.length).toFixed(1)) : 3.4,
      sleepHours: b.sleepHours,
      avgHrv: b.avgHrv,
      steps: b.steps,
      dominant: dayMoods.length ? dom : 'green',
      count: dayMoods.length,
    };
  });

  // Steps x Mood comparison
  const activeDays = dailyCurve.filter((d) => d.steps >= 7000 && d.count > 0);
  const lighterDays = dailyCurve.filter((d) => d.steps < 7000 && d.count > 0);
  const highStepsMoodAvg = activeDays.length
    ? Number((activeDays.reduce((s, d) => s + d.score, 0) / activeDays.length).toFixed(1))
    : 3.9;
  const lowStepsMoodAvg = lighterDays.length
    ? Number((lighterDays.reduce((s, d) => s + d.score, 0) / lighterDays.length).toFixed(1))
    : 3.0;

  // Burnout Resilience Gauge — Autonomic Load Model (0 Balanced -> 100 Risk)
  const lowEnergyDays = dailyCurve.filter((d) => d.score < 3.2 || d.sleepHours < 6.4).length;
  const sleepLoad = Math.max(0, (7.6 - avgSleep) * 18);
  const hrvLoad = Math.max(0, (baselineHrv30d - state.liveBiometrics.hrv) * 1.1);
  const rhrLoad = Math.max(0, (avgRestingHr - 58) * 1.5);
  const cedaLoad =
    state.liveBiometrics.cedaLevel === 'elevated'
      ? 22
      : state.liveBiometrics.cedaLevel === 'moderate'
      ? 10
      : 0;
  const redBlueLoad = (quadrantPcts.red * 0.45 + quadrantPcts.blue * 0.25);

  const burnoutScore = Math.max(
    12,
    Math.min(96, Math.round(14 + sleepLoad + hrvLoad + rhrLoad + cedaLoad + redBlueLoad * 0.6))
  );
  const burnoutStatus: AnalyticsSummary['burnoutStatus'] =
    burnoutScore <= 35 ? 'Balanced' : burnoutScore <= 66 ? 'Strained' : 'High';

  const resetsCompleted = resetsInRange.length;
  const totalResetMinutes = resetsInRange.reduce((acc, r) => acc + r.durationMin, 0);
  const avgResetHrDrop = resetsCompleted
    ? Number(
        (
          resetsInRange.reduce((acc, r) => acc + Math.max(0, r.startHr - r.endHr), 0) / resetsCompleted
        ).toFixed(1)
      )
    : 0;
  const calmerCount = resetsInRange.filter((r) => r.shiftRating === 'calmer').length;
  const calmerRatePct = resetsCompleted ? Math.round((calmerCount / resetsCompleted) * 100) : 0;

  const gTagMap = new Map<string, number>();
  for (const g of gratitudesInRange) {
    gTagMap.set(g.tag, (gTagMap.get(g.tag) || 0) + 1);
  }
  const topGratitudeTags = Array.from(gTagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    rangeDays,
    dateRangeLabel,
    totalMoods,
    quadrantCounts,
    quadrantPcts,
    affectiveBuckets,
    dominantQuadrant,
    topEmotions,
    topTags,
    redTriggerTags,
    greenSupportTags,
    avgSleep,
    avgSteps,
    avgHrv,
    baselineHrv30d,
    hrvDelta,
    avgHr,
    avgRestingHr,
    goodSleepMoodAvg,
    shortSleepMoodAvg,
    highStepsMoodAvg,
    lowStepsMoodAvg,
    sleepMoodCorrelationText,
    sleepMoodLiftPct,
    burnoutScore,
    burnoutStatus,
    lowEnergyDays,
    resetsCompleted,
    totalResetMinutes,
    avgResetHrDrop,
    calmerRatePct,
    gratitudeCount: gratitudesInRange.length,
    topGratitudeTags,
    dailyCurve,
  };
}

export function generateCoachReflections(state: WellbeState, rotationSeed = 0): CoachReflection[] {
  const summary7 = computeAnalyticsSummary(state, 7);
  const latestMood = state.moods[0];
  const { hr, hrv, sleepHours, cedaLevel } = state.liveBiometrics;
  const hrvDiffFromBaseline = hrv - summary7.baselineHrv30d;

  const reflections: CoachReflection[] = [];

  if (cedaLevel === 'elevated' || hr >= 96 || latestMood?.quadrant === 'red') {
    reflections.push({
      id: 'coach-acute',
      title: 'Downshift Nervous System',
      signalLabel:
        latestMood?.quadrant === 'red'
          ? `Latest: ${latestMood.emotion} · HR ${hr} bpm`
          : `Elevated Body Response · ${hr} bpm`,
      body: `Your watch shows elevated activation (${hr} bpm, HRV ${hrv}ms). A 60-second Voice Panic Anchor or 2-minute Physiological Sigh can cue vagal braking quickly.`,
      accent: '#E89B8C',
      actionLabel: 'Launch Voice Anchor',
      actionType: 'panic',
    });
  }

  if (sleepHours < 6.5 || hrvDiffFromBaseline <= -7) {
    reflections.push({
      id: 'coach-sleep-hrv',
      title: 'Protect Your Energy Floor',
      signalLabel: `Sleep ${sleepHours.toFixed(1)}h · HRV ${hrv}ms (${hrvDiffFromBaseline >= 0 ? '+' : ''}${hrvDiffFromBaseline}ms)`,
      body: `Shorter sleep (${sleepHours.toFixed(1)}h) and softer HRV suggest lower recovery reserves today. Favor gentle pacing and a 2-minute Physiological Sigh before demanding blocks.`,
      accent: '#93BBE0',
      actionLabel: 'Start 2m Sigh',
      actionType: 'reset',
      protocolId: 'phys-sigh',
    });
  } else {
    reflections.push({
      id: 'coach-recovery-strong',
      title: 'Strong Recovery Window',
      signalLabel: `Sleep ${sleepHours.toFixed(1)}h · HRV ${hrv}ms`,
      body: `Solid rest (${sleepHours.toFixed(1)}h) and HRV at ${hrv}ms put you in a steady autonomic window. Your 7-day data links 7h+ nights with +${summary7.sleepMoodLiftPct}% pleasant logs.`,
      accent: '#63D4A3',
      actionLabel: 'Try Resonance Pacing',
      actionType: 'reset',
      protocolId: 'resonance',
    });
  }

  if (rotationSeed > 0 && reflections.length > 2) {
    const shift = rotationSeed % (reflections.length - 1);
    const [first, ...rest] = reflections;
    const rotatedRest = [...rest.slice(shift), ...rest.slice(0, shift)];
    return [first, ...rotatedRest].slice(0, 4);
  }

  return reflections.slice(0, 4);
}
