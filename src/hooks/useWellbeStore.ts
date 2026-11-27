import { useCallback, useEffect, useRef, useState } from 'react';
import { createSeedState } from '../data/seedData';
import {
  AppSettings,
  GratitudeEntry,
  LiveBiometrics,
  MoodEntry,
  ResetSession,
  RulerQuadrant,
  ScheduledRoutine,
  StressAlertItem,
  WellbeState,
} from '../types';
import { computeAnalyticsSummary } from '../utils/coachEngine';

export const STORAGE_KEY = 'wellbe_pixel_watch_3_2_state';

function loadInitialState(): WellbeState {
  if (typeof window === 'undefined') return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<WellbeState>;
    if (!parsed || !Array.isArray(parsed.moods) || !parsed.liveBiometrics || !parsed.settings) {
      return createSeedState();
    }
    const seed = createSeedState();
    return {
      moods: parsed.moods,
      gratitudes: Array.isArray(parsed.gratitudes) ? parsed.gratitudes : seed.gratitudes,
      resets: Array.isArray(parsed.resets) ? parsed.resets : seed.resets,
      scheduledRoutines:
        Array.isArray(parsed.scheduledRoutines) && parsed.scheduledRoutines.length > 0
          ? parsed.scheduledRoutines
          : seed.scheduledRoutines,
      dailyBiometrics:
        Array.isArray(parsed.dailyBiometrics) && parsed.dailyBiometrics.length > 0
          ? parsed.dailyBiometrics
          : seed.dailyBiometrics,
      liveBiometrics: { ...seed.liveBiometrics, ...parsed.liveBiometrics },
      settings: { ...seed.settings, ...parsed.settings },
      notifications:
        Array.isArray(parsed.notifications) &&
        !(parsed.notifications.length === 1 && parsed.notifications[0]?.id === 'notif-1')
          ? parsed.notifications
          : seed.notifications,
    };
  } catch {
    return createSeedState();
  }
}

function calcReadiness(hr: number, hrv: number, sleepHours: number, ceda: LiveBiometrics['cedaLevel']): number {
  const sleepScore = Math.min(40, (sleepHours / 8) * 40);
  const hrvScore = Math.min(40, ((hrv - 18) / 72) * 40);
  const hrPenalty = hr > 85 ? Math.min(20, (hr - 85) * 0.4) : 0;
  const cedaPenalty = ceda === 'elevated' ? 14 : ceda === 'moderate' ? 6 : 0;
  return Math.max(22, Math.min(99, Math.round(20 + sleepScore + hrvScore - hrPenalty - cedaPenalty)));
}

function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useWellbeStore() {
  const [state, setState] = useState<WellbeState>(() => loadInitialState());
  const [activeStressAlert, setActiveStressAlert] = useState<StressAlertItem | null>(null);
  const stateRef = useRef<WellbeState>(state);
  stateRef.current = state;

  // Debounced localStorage persistence to prevent synchronous JSON serialization jank during slider drags
  useEffect(() => {
    const saveNow = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {
        // Storage quota fallback
      }
    };

    const timer = window.setTimeout(saveNow, 250);
    return () => window.clearTimeout(timer);
  }, [state]);

  // Flush latest state on page hide / unload so debounced changes are never lost
  useEffect(() => {
    const flush = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {
        // Storage quota fallback
      }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, []);

  const logMood = useCallback(
    (quadrant: RulerQuadrant, emotion: string, tags: string[] = [], note?: string): MoodEntry => {
      const bio = stateRef.current.liveBiometrics;
      const entry: MoodEntry = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        quadrant,
        emotion,
        tags,
        note,
        hrAtLog: bio.hr,
        hrvAtLog: bio.hrv,
        sleepHoursAtLog: bio.sleepHours,
      };
      setState((prev) => ({
        ...prev,
        moods: [entry, ...prev.moods],
      }));
      return entry;
    },
    []
  );

  const toggleTagOnMood = useCallback((moodId: string, tag: string) => {
    setState((prev) => ({
      ...prev,
      moods: prev.moods.map((m) => {
        if (m.id !== moodId) return m;
        const exists = m.tags.includes(tag);
        return {
          ...m,
          tags: exists ? m.tags.filter((t) => t !== tag) : [...m.tags, tag],
        };
      }),
    }));
  }, []);

  const deleteMood = useCallback((moodId: string) => {
    setState((prev) => ({
      ...prev,
      moods: prev.moods.filter((m) => m.id !== moodId),
    }));
  }, []);

  const logGratitude = useCallback(
    (text: string, tag: string): GratitudeEntry => {
      const latestQ = stateRef.current.moods[0]?.quadrant;
      const entry: GratitudeEntry = {
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        text,
        tag,
        linkedQuadrant: latestQ,
      };
      setState((prev) => ({
        ...prev,
        gratitudes: [entry, ...prev.gratitudes],
      }));
      return entry;
    },
    []
  );

  const deleteGratitude = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      gratitudes: prev.gratitudes.filter((g) => g.id !== id),
    }));
  }, []);

  const logResetSession = useCallback(
    (params: {
      protocolId: string;
      protocolName: string;
      durationMin: number;
      startHr: number;
      endHr: number;
      shiftRating?: 'calmer' | 'same' | 'extended';
    }): ResetSession => {
      const session: ResetSession = {
        id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        protocolId: params.protocolId,
        protocolName: params.protocolName,
        durationMin: params.durationMin,
        completed: true,
        startHr: params.startHr,
        endHr: params.endHr,
        shiftRating: params.shiftRating,
      };
      setState((prev) => {
        const nextHr = Math.max(54, Math.min(prev.liveBiometrics.hr, params.endHr));
        const nextHrv = Math.min(95, prev.liveBiometrics.hrv + 4);
        const nextCeda: LiveBiometrics['cedaLevel'] =
          nextHr < 85 && prev.liveBiometrics.cedaLevel === 'elevated'
            ? 'moderate'
            : nextHr < 78
            ? 'calm'
            : prev.liveBiometrics.cedaLevel;
        return {
          ...prev,
          resets: [session, ...prev.resets],
          liveBiometrics: {
            ...prev.liveBiometrics,
            hr: nextHr,
            hrv: nextHrv,
            cedaLevel: nextCeda,
            readiness: calcReadiness(nextHr, nextHrv, prev.liveBiometrics.sleepHours, nextCeda),
            hrHistory: [...prev.liveBiometrics.hrHistory.slice(-11), nextHr],
          },
        };
      });
      return session;
    },
    []
  );

  const addScheduledRoutine = useCallback(
    (routine: Omit<ScheduledRoutine, 'id' | 'active'>): ScheduledRoutine => {
      const created: ScheduledRoutine = {
        ...routine,
        id: `routine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        active: true,
      };
      setState((prev) => ({
        ...prev,
        scheduledRoutines: [created, ...prev.scheduledRoutines],
      }));
      return created;
    },
    []
  );

  const toggleScheduledRoutine = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      scheduledRoutines: prev.scheduledRoutines.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      ),
    }));
  }, []);

  const updateBiometrics = useCallback(
    (
      patch: Partial<
        Pick<
          LiveBiometrics,
          'hr' | 'hrv' | 'sleepHours' | 'cedaLevel' | 'batteryLevel' | 'isCharging'
        >
      >
    ) => {
      const current = stateRef.current;
      const nextHr = patch.hr ?? current.liveBiometrics.hr;
      const nextCeda = patch.cedaLevel ?? current.liveBiometrics.cedaLevel;
      const shouldAlert =
        !current.settings.dndStressAlerts &&
        ((patch.cedaLevel === 'elevated' && current.liveBiometrics.cedaLevel !== 'elevated') ||
          (patch.hr !== undefined && patch.hr >= 104 && current.liveBiometrics.hr < 104));

      const alert: StressAlertItem | null = shouldAlert
        ? {
            id: `alert-${Date.now()}`,
            timestamp: new Date().toISOString(),
            appName: 'WELLBE+',
            category: 'wellbe-alert',
            title: 'Elevated Body Response',
            detail: `HR ${nextHr} bpm · cEDA ${nextCeda}. Take a moment to ground?`,
            hr: nextHr,
            cedaLevel: 'elevated',
            actionLabel: 'Voice Anchor',
            actionTarget: 'panic',
            dismissed: false,
          }
        : null;

      setState((prev) => {
        const hr = patch.hr ?? prev.liveBiometrics.hr;
        const hrv = patch.hrv ?? prev.liveBiometrics.hrv;
        const sleepHours = patch.sleepHours ?? prev.liveBiometrics.sleepHours;
        const cedaLevel = patch.cedaLevel ?? prev.liveBiometrics.cedaLevel;
        const batteryLevel =
          patch.batteryLevel !== undefined
            ? Math.max(1, Math.min(100, Math.round(patch.batteryLevel)))
            : prev.liveBiometrics.batteryLevel;
        const isCharging = patch.isCharging ?? prev.liveBiometrics.isCharging;
        const readiness = calcReadiness(hr, hrv, sleepHours, cedaLevel);
        const hrHistory =
          patch.hr !== undefined
            ? [...prev.liveBiometrics.hrHistory.slice(-11), hr]
            : prev.liveBiometrics.hrHistory;

        const nextDaily =
          patch.sleepHours !== undefined && prev.dailyBiometrics.length > 0
            ? prev.dailyBiometrics.map((d, i, arr) =>
                i === arr.length - 1 ? { ...d, sleepHours } : d
              )
            : prev.dailyBiometrics;

        return {
          ...prev,
          dailyBiometrics: nextDaily,
          liveBiometrics: {
            ...prev.liveBiometrics,
            hr,
            hrv,
            sleepHours,
            cedaLevel,
            batteryLevel,
            isCharging,
            readiness,
            hrHistory,
          },
          notifications: alert ? [alert, ...prev.notifications].slice(0, 10) : prev.notifications,
        };
      });

      if (alert) {
        setActiveStressAlert(alert);
      }
    },
    []
  );

  const triggerStressSpike = useCallback(() => {
    const spikeHr = 104;
    const spikeHrv = 29;
    const alert: StressAlertItem = {
      id: `spike-${Date.now()}`,
      timestamp: new Date().toISOString(),
      appName: 'WELLBE+',
      category: 'wellbe-alert',
      title: 'Elevated Body Response',
      detail: `HR ${spikeHr} bpm · cEDA spike detected on Pixel Watch`,
      hr: spikeHr,
      cedaLevel: 'elevated',
      actionLabel: 'Voice Anchor',
      actionTarget: 'panic',
      dismissed: false,
    };

    setState((prev) => ({
      ...prev,
      liveBiometrics: {
        ...prev.liveBiometrics,
        hr: spikeHr,
        hrv: spikeHrv,
        cedaLevel: 'elevated',
        readiness: calcReadiness(spikeHr, spikeHrv, prev.liveBiometrics.sleepHours, 'elevated'),
        hrHistory: [...prev.liveBiometrics.hrHistory.slice(-11), spikeHr],
      },
      notifications: [alert, ...prev.notifications].slice(0, 10),
    }));

    setActiveStressAlert(alert);
  }, []);

  const dismissStressAlert = useCallback(() => {
    setActiveStressAlert(null);
  }, []);

  const clearNotifications = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: [],
    }));
  }, []);

  const syncNow = useCallback(() => {
    setState((prev) => {
      const slightHr = Math.max(54, Math.min(138, prev.liveBiometrics.hr + (Math.random() > 0.5 ? 1 : -1)));
      return {
        ...prev,
        liveBiometrics: {
          ...prev.liveBiometrics,
          hr: slightHr,
          hrHistory: [...prev.liveBiometrics.hrHistory.slice(-11), slightHr],
          lastSyncedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const updateTodaySteps = useCallback((steps: number) => {
    const clamped = Math.max(0, Math.min(50000, Math.round(steps)));
    setState((prev) => {
      if (prev.dailyBiometrics.length === 0) return prev;
      const nextDaily = [...prev.dailyBiometrics];
      const lastIdx = nextDaily.length - 1;
      nextDaily[lastIdx] = {
        ...nextDaily[lastIdx],
        steps: clamped,
      };
      return {
        ...prev,
        dailyBiometrics: nextDaily,
      };
    });
  }, []);

  const updateTodaySleep = useCallback((hours: number) => {
    const clamped = Number(Math.max(3.0, Math.min(11.0, hours)).toFixed(2));
    setState((prev) => {
      const nextDaily =
        prev.dailyBiometrics.length > 0
          ? prev.dailyBiometrics.map((d, i, arr) =>
              i === arr.length - 1 ? { ...d, sleepHours: clamped } : d
            )
          : prev.dailyBiometrics;
      const readiness = calcReadiness(
        prev.liveBiometrics.hr,
        prev.liveBiometrics.hrv,
        clamped,
        prev.liveBiometrics.cedaLevel
      );
      return {
        ...prev,
        dailyBiometrics: nextDaily,
        liveBiometrics: {
          ...prev.liveBiometrics,
          sleepHours: clamped,
          readiness,
        },
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createSeedState();
    setState(fresh);
    setActiveStressAlert(null);
  }, []);

  // Export helpers (read from stateRef so callbacks remain referentially stable)
  const exportJSON = useCallback(() => {
    const cur = stateRef.current;
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'WELLBE+ (3.2) for Google Pixel Watch',
      storage: 'local-first',
      summary7d: computeAnalyticsSummary(cur, 7),
      summary30d: computeAnalyticsSummary(cur, 30),
      moods: cur.moods,
      gratitudes: cur.gratitudes,
      resets: cur.resets,
      dailyBiometrics: cur.dailyBiometrics,
    };
    triggerFileDownload(
      `wellbe-pixel-watch-log-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }, []);

  const exportCSV = useCallback(() => {
    const cur = stateRef.current;
    const headers = ['Timestamp', 'Type', 'Quadrant', 'Emotion_or_Title', 'Tags', 'HR_BPM', 'HRV_ms', 'Sleep_Hours', 'Note'];
    const rows: string[][] = [headers];

    for (const m of cur.moods) {
      rows.push([
        m.timestamp,
        'Mood',
        m.quadrant,
        m.emotion,
        m.tags.join('; '),
        String(m.hrAtLog),
        String(m.hrvAtLog),
        String(m.sleepHoursAtLog),
        (m.note || '').replace(/"/g, '""'),
      ]);
    }
    for (const g of cur.gratitudes) {
      rows.push([
        g.timestamp,
        'Gratitude',
        g.linkedQuadrant || '',
        g.tag,
        g.tag,
        '',
        '',
        '',
        g.text.replace(/"/g, '""'),
      ]);
    }
    for (const r of cur.resets) {
      rows.push([
        r.timestamp,
        'SomaticReset',
        '',
        `${r.protocolName} (${r.durationMin}m)`,
        r.shiftRating || '',
        `${r.startHr}->${r.endHr}`,
        '',
        '',
        '',
      ]);
    }

    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    triggerFileDownload(
      `wellbe-mood-log-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
  }, []);

  const exportMarkdown = useCallback((rangeDays: 7 | 30 = 30) => {
    const cur = stateRef.current;
    const s = computeAnalyticsSummary(cur, rangeDays);
    const md = [
      `# WELLBE+ (3.2) Clinical Summary — Last ${rangeDays} Days`,
      `Generated: ${new Date().toLocaleString()} · Source: Pixel Watch Local-First Vault`,
      ``,
      `## Emotional Distribution (RULER · ${s.totalMoods} Check-Ins)`,
      `- **Green (Calm / Pleasant):** ${s.quadrantPcts.green}% (${s.quadrantCounts.green})`,
      `- **Yellow (Energized / Pleasant):** ${s.quadrantPcts.yellow}% (${s.quadrantCounts.yellow})`,
      `- **Blue (Low / Unpleasant):** ${s.quadrantPcts.blue}% (${s.quadrantCounts.blue})`,
      `- **Red (High Stress / Unpleasant):** ${s.quadrantPcts.red}% (${s.quadrantCounts.red})`,
      ``,
      `## Pixel Watch Biometrics & Correlation`,
      `- **Average Sleep:** ${s.avgSleep} hrs/night`,
      `- **Average HRV (rMSSD):** ${s.avgHrv} ms (${s.hrvDelta >= 0 ? '+' : ''}${s.hrvDelta} ms vs 30D baseline)`,
      `- **Average / Resting HR:** ${s.avgHr} / ${s.avgRestingHr} bpm`,
      `- **Sleep-Mood Finding:** ${s.sleepMoodCorrelationText}`,
      ``,
      `## Contexts & Triggers`,
      `- **Frequent Stress/Low Contexts:** ${s.redTriggerTags.map((t) => `${t.tag} (${t.count})`).join(', ') || 'None'}`,
      `- **Protective / Steadying Contexts:** ${s.greenSupportTags.map((t) => `${t.tag} (${t.count})`).join(', ') || 'None'}`,
      ``,
      `## Somatic Resets & Gratitude`,
      `- **Resets Completed:** ${s.resetsCompleted} sessions (${s.totalResetMinutes} min total)`,
      `- **Avg Heart Rate Reduction:** -${s.avgResetHrDrop} bpm · Reported Calmer: ${s.calmerRatePct}%`,
      `- **Gratitude Captures:** ${s.gratitudeCount} entries (Top themes: ${s.topGratitudeTags.map((t) => t.tag).join(', ') || 'Quiet Moment'})`,
    ].join('\n');

    triggerFileDownload(
      `wellbe-therapist-summary-${rangeDays}d-${new Date().toISOString().slice(0, 10)}.md`,
      md,
      'text/markdown;charset=utf-8'
    );
  }, []);

  return {
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
  };
}
