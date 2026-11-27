// Web Audio API tone cues + Web Speech API Voice Panic Anchor engine

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playCrownClick(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.018);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.024);
  } catch {
    // Graceful silent fallback
  }
}

export function playTapTick(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(510, now + 0.028);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // Silent fallback
  }
}

export function playConfirmChime(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.26);
    });
  } catch {
    // Silent fallback
  }
}

export function playBreathCue(enabled: boolean, phase: 'inhale' | 'inhale2' | 'hold' | 'exhale' | 'step'): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const startFreq =
      phase === 'inhale' ? 261.63 : phase === 'inhale2' ? 329.63 : phase === 'hold' ? 293.66 : phase === 'exhale' ? 246.94 : 293.66;
    const endFreq =
      phase === 'inhale' ? 329.63 : phase === 'inhale2' ? 349.23 : phase === 'hold' ? 293.66 : phase === 'exhale' ? 196.0 : 261.63;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.55);

    gain.gain.setValueAtTime(0.0005, now);
    gain.gain.linearRampToValueAtTime(0.032, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.72);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  } catch {
    // Silent fallback
  }
}

export function playPanicAnchorBell(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Soft warm low-register harmonic pad swell (C3 + G3) with velvety attack
    [196.0, 293.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(i === 0 ? 0.032 : 0.016, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.95);
    });
  } catch {
    // Silent fallback
  }
}

/* ============================================================================
 * Calm, Relaxed & Compassionate Self-Guided Voice Engine
 * Uses server-side Gemini 3.8 Flash TTS (/api/tts/panic-anchor) played at native
 * 1.0x rate through a warm, de-essed Sanctuary Voice Bus (zero time-stretch
 * distortion), with a natural sentence-paced device fallback.
 * ==========================================================================*/
type AnchorVoicePreset = 'tender' | 'warm' | 'grounded';

let activeSpeechSessionId = 0;
let pendingPhraseTimer: number | null = null;
let speechKeepAliveTimer: number | null = null;
let activeAudioEl: HTMLAudioElement | null = null;
let activeVoiceSource: AudioBufferSourceNode | null = null;
let activeVoiceGain: GainNode | null = null;
let activeFetchController: AbortController | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentVoicePreset: AnchorVoicePreset = 'tender';

// Short backoff window when server TTS is unavailable (never permanently locks out recovery)
let serverTtsBackoffUntil = 0;
let serverTtsNotice: string | null = null;

// Client-side cache of base64 WAV audio, decoded AudioBuffers, and in-flight fetches
const clientVoiceBase64Cache = new Map<string, string>();
const clientVoiceBufferCache = new Map<string, AudioBuffer>();
const clientVoiceInFlight = new Map<string, Promise<string>>();

// Locked on-device voice per preset for voice consistency across grounding cues
let cachedVoices: SpeechSynthesisVoice[] = [];
const lockedDeviceVoiceByPreset: Partial<Record<AnchorVoicePreset, string>> = {};

export function setAnchorVoicePreset(preset: AnchorVoicePreset): void {
  currentVoicePreset = preset;
}

function refreshVoiceCache(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      cachedVoices = list;
    }
  } catch {
    // ignore
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoiceCache();
  try {
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoiceCache);
  } catch {
    // Safari fallback
  }
}

function waitForVoices(timeoutMs = 350): Promise<SpeechSynthesisVoice[]> {
  const existing = refreshVoiceCache();
  if (existing.length > 0 || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        window.speechSynthesis.removeEventListener?.('voiceschanged', onChanged);
      } catch {
        // ignore
      }
      resolve(refreshVoiceCache());
    };
    const onChanged = () => finish();
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', onChanged);
    } catch {
      // ignore
    }
    window.setTimeout(finish, timeoutMs);
  });
}

function selectLockedCalmVoice(
  voices: SpeechSynthesisVoice[],
  preset: AnchorVoicePreset
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const existingURI = lockedDeviceVoiceByPreset[preset];
  if (existingURI) {
    const matched = voices.find((v) => v.voiceURI === existingURI);
    if (matched) return matched;
  }

  // Strictly reject novelty, robotic, and harsh synthetic voices (including Apple Flo/Shelley)
  const noveltyReject =
    /(fred|zarvox|bells|albert|bad news|bahh|boing|bubbles|cellos|trinoids|whisper|espeak|festival|compact|ralph|junior|kathy|deranged|hysterical|organ|pipe|superstar|wobble|good news|eddy|reed|grandpa|grandma|rocko|sandy|jacques|shelley|flo)/i;
  const roboticPenalty =
    /(microsoft zira|microsoft david|microsoft mark|microsoft george|microsoft hazel|google us english$|google uk english female|google uk english male)/i;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1000;

  for (const v of voices) {
    if (!/^en/i.test(v.lang)) continue;
    let score = 0;
    const name = v.name || '';

    if (noveltyReject.test(name)) score -= 900;
    if (roboticPenalty.test(name)) score -= 110;

    // Heavily prioritize genuine neural / Siri / studio / enhanced human-grade voices
    if (/(natural|neural|wavenet|studio|premium|enhanced|siri)/i.test(name)) score += 220;
    if (/online/i.test(name)) score += 85;

    if (preset === 'grounded') {
      if (/(andrew|brian|guy|daniel|oliver|ryan|christopher|arthur|jamie|aaron|evan)/i.test(name)) {
        score += 95;
      }
      if (/male/i.test(name) && !/female/i.test(name)) score += 20;
    } else if (preset === 'warm') {
      if (/(jenny|emma|serena|moira|tessa|karen|allison|cora|sonia|samantha)/i.test(name)) {
        score += 85;
      }
      if (/female/i.test(name)) score += 16;
    } else {
      // 'tender' default: softest, gentlest natural voices
      if (/(ava|aria|zoe|libby|emma|serena|moira|samantha|michelle|sonia|jenny)/i.test(name)) {
        score += 85;
      }
      if (/female/i.test(name)) score += 16;
    }

    if (/en-GB|en-IE|en-AU/i.test(v.lang)) score += 14;
    else if (/en-US/i.test(v.lang)) score += 12;

    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  const chosen = best || voices.find((v) => /^en/i.test(v.lang)) || voices[0] || null;
  if (chosen) {
    lockedDeviceVoiceByPreset[preset] = chosen.voiceURI;
  }
  return chosen;
}

function splitIntoNaturalSentences(text: string): string[] {
  // Split ONLY on sentence boundaries so commas keep natural human phrasing & intonation
  const raw = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return raw.length > 0 ? raw : [text];
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function primeVoiceAudio(): void {
  getAudioContext();
  refreshVoiceCache();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
  }
}

async function fetchCalmAnchorBase64(
  text: string,
  preset: AnchorVoicePreset,
  signal?: AbortSignal
): Promise<string> {
  const trimmed = text.trim();
  const cacheKey = `${preset}:${trimmed}`;
  const cached = clientVoiceBase64Cache.get(cacheKey);
  if (cached) return cached;

  if (Date.now() < serverTtsBackoffUntil) {
    throw new Error(serverTtsNotice || 'Studio voice offline');
  }

  const existing = clientVoiceInFlight.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch('/api/tts/panic-anchor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, preset }),
      signal,
    });
    const data = (await res.json().catch(() => ({}))) as {
      audioBase64?: string;
      mimeType?: string;
      error?: string;
      code?: string;
    };
    if (!res.ok || !data.audioBase64) {
      if (res.status === 503 || res.status === 404 || data.code === 'MISSING_API_KEY') {
        serverTtsBackoffUntil = Date.now() + 30_000;
        serverTtsNotice = 'Studio voice offline · using browser voice';
      } else {
        serverTtsBackoffUntil = Date.now() + 12_000;
        serverTtsNotice = 'Studio voice busy · using browser voice';
      }
      throw new Error(data.error || `Voice guidance unavailable (${res.status}).`);
    }
    serverTtsBackoffUntil = 0;
    serverTtsNotice = null;
    clientVoiceBase64Cache.set(cacheKey, data.audioBase64);
    return data.audioBase64;
  })().finally(() => {
    clientVoiceInFlight.delete(cacheKey);
  });

  clientVoiceInFlight.set(cacheKey, promise);
  return promise;
}

async function playStudioWavBuffer(
  cacheKey: string,
  audioBase64: string,
  sessionId: number
): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
  if (ctx.state !== 'running') return false;

  let decoded = clientVoiceBufferCache.get(cacheKey);
  if (!decoded) {
    const rawBuf = base64ToArrayBuffer(audioBase64);
    decoded = await ctx.decodeAudioData(rawBuf.slice(0));
    clientVoiceBufferCache.set(cacheKey, decoded);
  }
  if (sessionId !== activeSpeechSessionId) return true;

  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  // Strictly 1.0x native rate so there is ZERO metallic time-stretching distortion
  source.playbackRate.setValueAtTime(1.0, now);

  // Warm, intimate Sanctuary Voice Bus: chest warmth + gentle de-esser + silky air + subtle room halo
  const chestWarmth = ctx.createBiquadFilter();
  chestWarmth.type = 'lowshelf';
  chestWarmth.frequency.setValueAtTime(185, now);
  chestWarmth.gain.setValueAtTime(1.8, now);

  const softDeEsser = ctx.createBiquadFilter();
  softDeEsser.type = 'peaking';
  softDeEsser.frequency.setValueAtTime(3400, now);
  softDeEsser.Q.setValueAtTime(1.1, now);
  softDeEsser.gain.setValueAtTime(-2.0, now);

  const silkAir = ctx.createBiquadFilter();
  silkAir.type = 'highshelf';
  silkAir.frequency.setValueAtTime(8000, now);
  silkAir.gain.setValueAtTime(-2.8, now);

  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0.0001, now);
  voiceGain.gain.linearRampToValueAtTime(0.92, now + 0.055);

  // Subtle 9% warm hall air so the voice sits warmly inside the sanctuary rather than dry/clinical
  const reverbSend = ctx.createGain();
  reverbSend.gain.setValueAtTime(0.09, now);
  const reverbConv = ctx.createConvolver();
  reverbConv.buffer = getWarmHallImpulse(ctx);
  const reverbTone = ctx.createBiquadFilter();
  reverbTone.type = 'lowpass';
  reverbTone.frequency.setValueAtTime(2100, now);

  source.connect(chestWarmth);
  chestWarmth.connect(softDeEsser);
  softDeEsser.connect(silkAir);
  silkAir.connect(voiceGain);
  voiceGain.connect(ctx.destination);

  voiceGain.connect(reverbSend);
  reverbSend.connect(reverbConv);
  reverbConv.connect(reverbTone);
  reverbTone.connect(ctx.destination);

  activeVoiceSource = source;
  activeVoiceGain = voiceGain;
  duckSanctuaryAudio(true);

  source.onended = () => {
    if (activeVoiceSource === source) {
      activeVoiceSource = null;
      activeVoiceGain = null;
    }
    if (sessionId === activeSpeechSessionId) {
      duckSanctuaryAudio(false);
    }
    try {
      source.disconnect();
      chestWarmth.disconnect();
      softDeEsser.disconnect();
      silkAir.disconnect();
      voiceGain.disconnect();
      reverbSend.disconnect();
      reverbConv.disconnect();
      reverbTone.disconnect();
    } catch {
      // ignore
    }
  };

  source.start(now);
  return true;
}

async function speakWithLockedDeviceVoice(
  text: string,
  preset: AnchorVoicePreset,
  sessionId: number
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const voices = await waitForVoices(350);
  if (sessionId !== activeSpeechSessionId) return;

  const voice = selectLockedCalmVoice(voices, preset);
  const sentences = splitIntoNaturalSentences(text);

  // Cancel any stale browser utterance and allow Chromium's speech queue 55ms to clear cleanly
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }

  const speakSentence = (index: number) => {
    if (sessionId !== activeSpeechSessionId || index >= sentences.length) {
      if (sessionId === activeSpeechSessionId) {
        duckSanctuaryAudio(false);
        clearSpeechKeepAlive();
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    activeUtterance = utterance;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    const isNeural = Boolean(
      voice && /(natural|neural|online|enhanced|premium|siri)/i.test(voice.name)
    );
    // Keep pitch at 1.0 to completely prevent metallic Web Speech DSP pitch-shifting artifacts,
    // and use a calm, hushed rate + softer volume with generous breath pauses between sentences
    utterance.rate = isNeural ? 0.84 : 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.78;

    utterance.onstart = () => {
      if (sessionId === activeSpeechSessionId) {
        duckSanctuaryAudio(true);
      }
    };

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      if (sessionId !== activeSpeechSessionId) return;
      if (index + 1 < sentences.length) {
        pendingPhraseTimer = window.setTimeout(() => {
          pendingPhraseTimer = null;
          speakSentence(index + 1);
        }, 620);
      } else {
        duckSanctuaryAudio(false);
        clearSpeechKeepAlive();
      }
    };

    utterance.onerror = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      if (sessionId === activeSpeechSessionId) {
        duckSanctuaryAudio(false);
        clearSpeechKeepAlive();
      }
    };

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      // Keep-alive heartbeat prevents Chromium from silently pausing speech
      clearSpeechKeepAlive();
      speechKeepAliveTimer = window.setInterval(() => {
        if (sessionId !== activeSpeechSessionId) {
          clearSpeechKeepAlive();
          return;
        }
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {
          // ignore
        }
      }, 4500);
    } catch {
      duckSanctuaryAudio(false);
      clearSpeechKeepAlive();
    }
  };

  pendingPhraseTimer = window.setTimeout(() => {
    pendingPhraseTimer = null;
    speakSentence(0);
  }, 55);
}

function clearSpeechKeepAlive(): void {
  if (speechKeepAliveTimer !== null) {
    window.clearInterval(speechKeepAliveTimer);
    speechKeepAliveTimer = null;
  }
}

export function prefetchCalmAnchorCues(
  texts: string[],
  enabled: boolean,
  presetOverride?: AnchorVoicePreset
): void {
  if (!enabled || typeof window === 'undefined' || Date.now() < serverTtsBackoffUntil) return;
  const preset = presetOverride ?? currentVoicePreset;
  for (const raw of texts) {
    const trimmed = raw.trim();
    const cacheKey = `${preset}:${trimmed}`;
    if (!trimmed || clientVoiceBase64Cache.has(cacheKey) || clientVoiceInFlight.has(cacheKey)) continue;
    fetchCalmAnchorBase64(trimmed, preset).catch(() => {
      // Handled gracefully during active playback
    });
  }
}

export function speakCalmAnchor(
  text: string,
  enabled: boolean,
  onError?: (message: string | null) => void,
  presetOverride?: AnchorVoicePreset
): void {
  if (!enabled || typeof window === 'undefined') {
    onError?.(null);
    return;
  }

  const preset = presetOverride ?? currentVoicePreset;
  stopSpeech();
  onError?.(null);
  const sessionId = activeSpeechSessionId;
  const controller = new AbortController();
  activeFetchController = controller;

  const startPlayback = async () => {
    if (Date.now() >= serverTtsBackoffUntil) {
      try {
        const audioBase64 = await fetchCalmAnchorBase64(text, preset, controller.signal);
        if (sessionId !== activeSpeechSessionId) return;

        // Primary path: native-rate decoded WAV via warm Sanctuary Voice Bus
        try {
          const playedViaBus = await playStudioWavBuffer(
            `${preset}:${text.trim()}`,
            audioBase64,
            sessionId
          );
          if (playedViaBus) {
            if (sessionId === activeSpeechSessionId) {
              onError?.(null);
            }
            return;
          }
        } catch {
          // Fall through cleanly to native HTMLAudioElement playback
        }

        if (sessionId !== activeSpeechSessionId) return;
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        audio.volume = 0.9;
        audio.playbackRate = 1.0;
        activeAudioEl = audio;

        audio.onplay = () => {
          if (sessionId === activeSpeechSessionId) {
            duckSanctuaryAudio(true);
          }
        };

        audio.onended = () => {
          if (activeAudioEl === audio) {
            activeAudioEl = null;
          }
          if (sessionId === activeSpeechSessionId) {
            duckSanctuaryAudio(false);
          }
        };

        audio.onerror = () => {
          if (activeAudioEl === audio) {
            activeAudioEl = null;
          }
          if (sessionId === activeSpeechSessionId) {
            duckSanctuaryAudio(false);
          }
        };

        await audio.play();
        if (sessionId === activeSpeechSessionId) {
          onError?.(null);
        }
        return;
      } catch (err) {
        if (controller.signal.aborted || sessionId !== activeSpeechSessionId) return;
        if (err instanceof Error && err.name === 'NotAllowedError') {
          onError?.('Tap Voice On to allow calm voice audio.');
          return;
        }
      }
    }

    if (sessionId !== activeSpeechSessionId) return;
    onError?.(serverTtsNotice || 'Studio voice offline · using browser voice');
    await speakWithLockedDeviceVoice(text, preset, sessionId);
  };

  // Brief 140ms lead-in so the voice floats warmly over the soft harmonic bell
  pendingPhraseTimer = window.setTimeout(() => {
    pendingPhraseTimer = null;
    if (sessionId !== activeSpeechSessionId) return;
    void startPlayback();
  }, 140);
}

export function previewAnchorVoice(
  preset: AnchorVoicePreset,
  onStatus?: (message: string | null) => void
): void {
  primeVoiceAudio();
  currentVoicePreset = preset;
  // Reset backoff so clicking Preview immediately retries studio voice if key was just added
  serverTtsBackoffUntil = 0;
  playPanicAnchorBell(true);
  speakCalmAnchor(
    "I'm right here with you. Take a slow breath, and let your shoulders soften.",
    true,
    onStatus,
    preset
  );
}

export function stopSpeech(): void {
  activeSpeechSessionId += 1;
  clearSpeechKeepAlive();
  duckSanctuaryAudio(false);
  if (pendingPhraseTimer !== null) {
    window.clearTimeout(pendingPhraseTimer);
    pendingPhraseTimer = null;
  }
  if (activeFetchController) {
    activeFetchController.abort();
    activeFetchController = null;
  }
  if (activeVoiceSource) {
    const src = activeVoiceSource;
    const gain = activeVoiceGain;
    activeVoiceSource = null;
    activeVoiceGain = null;
    try {
      if (gain && sharedAudioCtx) {
        const now = sharedAudioCtx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.03);
        window.setTimeout(() => {
          try {
            src.stop();
          } catch {
            // ignore
          }
        }, 90);
      } else {
        src.stop();
      }
    } catch {
      // ignore
    }
  }
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudioEl = null;
  }
  activeUtterance = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/* ============================================================================
 * Soothing Sanctuary — Self-Contained Peaceful Instrumental Engine
 * Original 16-bar pastoral composition in D Major (66 BPM) featuring:
 * - Warm Felt Grand Piano (detuned chorus harmonics + hammer filter + stereo spread)
 * - Fingerpicked Acoustic Harp / Nylon Guitar rolling arpeggios
 * - Lush Chamber Strings & Cello crossfading chord bed
 * - Airy Morning Flute phrases in Section B
 * - Stereo algorithmic hall convolution reverb & warm mastering bus
 * 100% self-contained in-app with zero external links or network calls.
 * ==========================================================================*/
interface SanctuaryBar {
  pad: number[];       // Cello / viola / violin sustained chord tones (Hz)
  arp: number[];       // Rolling acoustic harp/guitar arpeggio notes (Hz)
  melody: { beat: number; freq: number; dur: number; vel: number }[];
  flute?: { beat: number; freq: number; dur: number; vel: number }[];
}

// D Major / G Major pastoral pitch table (Hz)
const N = {
  E2: 82.41, Fs2: 92.5, G2: 98.0, A2: 110.0, B2: 123.47, Cs3: 138.59,
  D3: 146.83, E3: 164.81, Fs3: 185.0, G3: 196.0, A3: 220.0, B3: 246.94,
  Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88,
  Cs5: 554.37, D5: 587.33, E5: 659.25, Fs5: 739.99, G5: 783.99, A5: 880.0,
} as const;

// 16-bar seamless pastoral relaxation composition (Section A: Morning Light, Section B: Warm Horizon)
const PASTORAL_SCORE: SanctuaryBar[] = [
  // Bar 1: Dmaj9
  {
    pad: [N.D3 / 2, N.A2, N.Fs3, N.E4],
    arp: [N.D3, N.A3, N.D4, N.E4, N.Fs4, N.E4, N.D4, N.A3],
    melody: [
      { beat: 0, freq: N.Fs5, dur: 2.2, vel: 0.72 },
      { beat: 2, freq: N.E5, dur: 1.1, vel: 0.62 },
      { beat: 3, freq: N.D5, dur: 1.3, vel: 0.58 },
    ],
  },
  // Bar 2: Aadd9/C#
  {
    pad: [N.Cs3 / 2, N.A2, N.E3, N.B3],
    arp: [N.Cs3, N.A3, N.E4, N.B3, N.Cs4, N.E4, N.A3, N.E3],
    melody: [
      { beat: 0, freq: N.E5, dur: 2.6, vel: 0.68 },
      { beat: 2.5, freq: N.Cs5, dur: 1.0, vel: 0.52 },
      { beat: 3.5, freq: N.D5, dur: 0.9, vel: 0.55 },
    ],
  },
  // Bar 3: Bm9
  {
    pad: [N.B2 / 2, N.Fs2, N.D3, N.A3],
    arp: [N.B2, N.Fs3, N.B3, N.Cs4, N.D4, N.Cs4, N.B3, N.Fs3],
    melody: [
      { beat: 0, freq: N.D5, dur: 2.4, vel: 0.66 },
      { beat: 2, freq: N.A4, dur: 1.2, vel: 0.54 },
      { beat: 3, freq: N.B4, dur: 1.4, vel: 0.6 },
    ],
  },
  // Bar 4: Gmaj9
  {
    pad: [N.G2 / 2, N.D3, N.B3, N.A4],
    arp: [N.G2, N.D3, N.G3, N.A3, N.B3, N.D4, N.B3, N.G3],
    melody: [
      { beat: 0, freq: N.A4, dur: 3.2, vel: 0.62 },
      { beat: 3, freq: N.B4, dur: 1.1, vel: 0.5 },
    ],
  },
  // Bar 5: Dmaj9/F#
  {
    pad: [N.Fs2, N.D3, N.A3, N.E4],
    arp: [N.Fs3, N.A3, N.D4, N.E4, N.Fs4, N.D4, N.A3, N.Fs3],
    melody: [
      { beat: 0, freq: N.Fs5, dur: 1.8, vel: 0.7 },
      { beat: 1.5, freq: N.G5, dur: 0.9, vel: 0.64 },
      { beat: 2.5, freq: N.Fs5, dur: 1.6, vel: 0.62 },
    ],
  },
  // Bar 6: Gmaj7
  {
    pad: [N.G2, N.D3, N.B3, N.Fs4],
    arp: [N.G2, N.D3, N.G3, N.B3, N.D4, N.Fs4, N.D4, N.B3],
    melody: [
      { beat: 0, freq: N.D5, dur: 2.2, vel: 0.65 },
      { beat: 2, freq: N.B4, dur: 1.8, vel: 0.56 },
    ],
  },
  // Bar 7: Em9
  {
    pad: [N.E2, N.B2, N.G3, N.Fs4],
    arp: [N.E3, N.B3, N.E4, N.Fs4, N.G4, N.Fs4, N.E4, N.B3],
    melody: [
      { beat: 0, freq: N.E5, dur: 2.0, vel: 0.64 },
      { beat: 2, freq: N.D5, dur: 1.1, vel: 0.58 },
      { beat: 3, freq: N.Cs5, dur: 1.2, vel: 0.54 },
    ],
  },
  // Bar 8: A7sus4 -> A9 (gentle breath cadence)
  {
    pad: [N.A2, N.E3, N.A3, N.D4],
    arp: [N.A2, N.E3, N.A3, N.B3, N.D4, N.Cs4, N.A3, N.E3],
    melody: [
      { beat: 0, freq: N.D5, dur: 1.9, vel: 0.6 },
      { beat: 2, freq: N.Cs5, dur: 2.2, vel: 0.55 },
    ],
  },
  // --- Section B: Warm Horizon (with airy morning flute counter-melody) ---
  // Bar 9: Gmaj9
  {
    pad: [N.G2, N.D3, N.B3, N.A4],
    arp: [N.G2, N.D3, N.A3, N.B3, N.D4, N.A3, N.B3, N.D3],
    melody: [
      { beat: 0, freq: N.B4, dur: 1.5, vel: 0.6 },
      { beat: 1.5, freq: N.D5, dur: 1.5, vel: 0.65 },
      { beat: 3, freq: N.Fs5, dur: 1.4, vel: 0.68 },
    ],
    flute: [
      { beat: 0.5, freq: N.A5, dur: 3.1, vel: 0.45 },
    ],
  },
  // Bar 10: Dadd9/F#
  {
    pad: [N.Fs2, N.D3, N.A3, N.E4],
    arp: [N.Fs3, N.D4, N.E4, N.Fs4, N.A4, N.Fs4, N.E4, N.D4],
    melody: [
      { beat: 0, freq: N.A5, dur: 2.4, vel: 0.72 },
      { beat: 2.5, freq: N.Fs5, dur: 1.6, vel: 0.62 },
    ],
    flute: [
      { beat: 0, freq: N.Fs5, dur: 2.0, vel: 0.42 },
      { beat: 2, freq: N.E5, dur: 1.9, vel: 0.38 },
    ],
  },
  // Bar 11: Em9
  {
    pad: [N.E2, N.B2, N.G3, N.D4],
    arp: [N.E3, N.B3, N.D4, N.Fs4, N.G4, N.Fs4, N.D4, N.B3],
    melody: [
      { beat: 0, freq: N.G5, dur: 1.8, vel: 0.66 },
      { beat: 2, freq: N.Fs5, dur: 1.1, vel: 0.6 },
      { beat: 3, freq: N.E5, dur: 1.3, vel: 0.56 },
    ],
    flute: [
      { beat: 0.5, freq: N.D5, dur: 2.8, vel: 0.4 },
    ],
  },
  // Bar 12: Dmaj9
  {
    pad: [N.D3 / 2, N.A2, N.Fs3, N.E4],
    arp: [N.D3, N.A3, N.D4, N.E4, N.Fs4, N.E4, N.D4, N.A3],
    melody: [
      { beat: 0, freq: N.Fs5, dur: 3.2, vel: 0.66 },
      { beat: 3, freq: N.E5, dur: 1.1, vel: 0.52 },
    ],
  },
  // Bar 13: Bm9
  {
    pad: [N.B2 / 2, N.Fs2, N.D3, N.A3],
    arp: [N.B2, N.Fs3, N.A3, N.Cs4, N.D4, N.A3, N.Fs3, N.D3],
    melody: [
      { beat: 0, freq: N.D5, dur: 2.0, vel: 0.64 },
      { beat: 2, freq: N.Cs5, dur: 1.1, vel: 0.58 },
      { beat: 3, freq: N.B4, dur: 1.2, vel: 0.55 },
    ],
    flute: [
      { beat: 0, freq: N.Fs5, dur: 3.4, vel: 0.42 },
    ],
  },
  // Bar 14: F#m7
  {
    pad: [N.Fs2, N.Cs3, N.A3, N.E4],
    arp: [N.Fs3, N.Cs4, N.E4, N.A4, N.E4, N.Cs4, N.A3, N.Fs3],
    melody: [
      { beat: 0, freq: N.A4, dur: 2.2, vel: 0.6 },
      { beat: 2, freq: N.Cs5, dur: 1.9, vel: 0.58 },
    ],
    flute: [
      { beat: 0.5, freq: N.E5, dur: 3.0, vel: 0.38 },
    ],
  },
  // Bar 15: Gmaj9
  {
    pad: [N.G2, N.D3, N.B3, N.A4],
    arp: [N.G2, N.D3, N.G3, N.A3, N.B3, N.D4, N.B3, N.G3],
    melody: [
      { beat: 0, freq: N.B4, dur: 1.5, vel: 0.6 },
      { beat: 1.5, freq: N.D5, dur: 1.5, vel: 0.62 },
      { beat: 3, freq: N.E5, dur: 1.2, vel: 0.58 },
    ],
  },
  // Bar 16: A6sus4 -> gentle resolve back into Bar 1 Dmaj9
  {
    pad: [N.A2, N.E3, N.A3, N.Cs4],
    arp: [N.A2, N.E3, N.A3, N.B3, N.Cs4, N.E4, N.Cs4, N.A3],
    melody: [
      { beat: 0, freq: N.E5, dur: 2.2, vel: 0.58 },
      { beat: 2.5, freq: N.D5, dur: 1.8, vel: 0.5 },
    ],
  },
];

interface SanctuaryEngine {
  masterGain: GainNode;
  dryBus: GainNode;
  reverbSend: GainNode;
  convolver: ConvolverNode;
  lfoOsc: OscillatorNode;
  padFilter: BiquadFilterNode;
  padVoices: { oscA: OscillatorNode; oscB: OscillatorNode; gain: GainNode }[];
  timerId: number;
  stopped: boolean;
}

let sanctuaryEngine: SanctuaryEngine | null = null;
let cachedReverbBuffer: AudioBuffer | null = null;

function getWarmHallImpulse(ctx: AudioContext): AudioBuffer {
  if (cachedReverbBuffer && cachedReverbBuffer.sampleRate === ctx.sampleRate) {
    return cachedReverbBuffer;
  }
  const durationSec = 4.2;
  const length = Math.floor(ctx.sampleRate * durationSec);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    let lpState = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Smooth exponential decay with gentle early swell for sunlit hall warmth
      const attack = Math.min(1, i / (ctx.sampleRate * 0.035));
      const decay = Math.pow(1 - t, 2.75);
      const white = Math.random() * 2 - 1;
      // One-pole low-pass damping so tail is velvety dark, never harsh
      lpState = lpState * 0.84 + white * 0.16;
      data[i] = lpState * attack * decay * 0.85;
    }
  }
  cachedReverbBuffer = impulse;
  return impulse;
}

function scheduleFeltPianoNote(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode,
  freq: number,
  startTime: number,
  durSec: number,
  velocity: number
): void {
  const noteFilter = ctx.createBiquadFilter();
  noteFilter.type = 'lowpass';
  const peakCutoff = Math.min(3400, Math.max(950, freq * 4.2 * velocity));
  noteFilter.frequency.setValueAtTime(peakCutoff, startTime);
  noteFilter.frequency.exponentialRampToValueAtTime(Math.max(380, freq * 1.45), startTime + Math.min(2.6, durSec));
  noteFilter.Q.setValueAtTime(0.6, startTime);

  const env = ctx.createGain();
  const peakGain = 0.15 * velocity;
  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(peakGain, startTime + 0.022);
  env.gain.exponentialRampToValueAtTime(peakGain * 0.42, startTime + 0.55);
  env.gain.exponentialRampToValueAtTime(0.0002, startTime + durSec + 1.4);

  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (panner) {
    // Gentle grand piano stereo spread: lower notes slightly left, upper notes slightly right
    const pan = Math.max(-0.42, Math.min(0.42, ((freq - 360) / 520) * 0.35));
    panner.pan.setValueAtTime(pan, startTime);
    noteFilter.connect(env);
    env.connect(panner);
    panner.connect(dryDest);
    panner.connect(wetDest);
  } else {
    noteFilter.connect(env);
    env.connect(dryDest);
    env.connect(wetDest);
  }

  // Detuned fundamental pair + warm 2nd harmonic + delicate 3rd harmonic overtone
  const partials: { mult: number; detune: number; amp: number; type: OscillatorType }[] = [
    { mult: 1, detune: -1.8, amp: 0.62, type: 'triangle' },
    { mult: 1, detune: 1.8, amp: 0.58, type: 'sine' },
    { mult: 2, detune: 0.6, amp: 0.22, type: 'sine' },
    { mult: 3, detune: -0.5, amp: 0.06, type: 'sine' },
  ];

  const stopTime = startTime + durSec + 1.5;
  for (const p of partials) {
    const osc = ctx.createOscillator();
    const pg = ctx.createGain();
    osc.type = p.type;
    osc.frequency.setValueAtTime(freq * p.mult, startTime);
    osc.detune.setValueAtTime(p.detune, startTime);
    pg.gain.setValueAtTime(p.amp, startTime);
    osc.connect(pg);
    pg.connect(noteFilter);
    osc.start(startTime);
    osc.stop(stopTime);
  }
}

function scheduleHarpPluck(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode,
  freq: number,
  startTime: number,
  velocity: number,
  panPos: number
): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(2200, freq * 4.5), startTime);
  filter.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 1.25), startTime + 1.5);

  const env = ctx.createGain();
  const peak = 0.062 * velocity;
  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(peak, startTime + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0002, startTime + 2.15);

  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, startTime);

  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime);
  g2.gain.setValueAtTime(0.18, startTime);

  osc1.connect(filter);
  osc2.connect(g2);
  g2.connect(filter);
  filter.connect(env);

  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panPos, startTime);
    env.connect(panner);
    panner.connect(dryDest);
    panner.connect(wetDest);
  } else {
    env.connect(dryDest);
    env.connect(wetDest);
  }

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + 2.25);
  osc2.stop(startTime + 2.25);
}

function scheduleMorningFluteNote(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode,
  freq: number,
  startTime: number,
  durSec: number,
  velocity: number
): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  // Subtle delayed vibrato (4.6Hz) for organic human breath phrasing
  const vib = ctx.createOscillator();
  const vibGain = ctx.createGain();
  vib.type = 'sine';
  vib.frequency.setValueAtTime(4.6, startTime);
  vibGain.gain.setValueAtTime(0.01, startTime);
  vibGain.gain.linearRampToValueAtTime(freq * 0.0045, startTime + 0.65);
  vib.connect(vibGain);
  vibGain.connect(osc.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1600, startTime);

  const env = ctx.createGain();
  const peak = 0.055 * velocity;
  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(peak, startTime + Math.min(0.55, durSec * 0.35));
  env.gain.setValueAtTime(peak * 0.88, startTime + durSec * 0.72);
  env.gain.exponentialRampToValueAtTime(0.0002, startTime + durSec + 0.65);

  osc.connect(filter);
  filter.connect(env);

  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(-0.18, startTime);
    env.connect(panner);
    panner.connect(dryDest);
    panner.connect(wetDest);
  } else {
    env.connect(dryDest);
    env.connect(wetDest);
  }

  osc.start(startTime);
  vib.start(startTime);
  osc.stop(startTime + durSec + 0.75);
  vib.stop(startTime + durSec + 0.75);
}

export function startSanctuaryAudio(volume: number): void {
  stopSanctuaryAudio();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedVol = Math.max(0, Math.min(1, volume));

    // Warm mastering chain: dry + stereo convolution hall reverb -> gentle low-shelf -> compressor -> masterGain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(clampedVol * 0.42, now + 1.4);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, now);
    compressor.knee.setValueAtTime(24, now);
    compressor.ratio.setValueAtTime(3, now);
    compressor.attack.setValueAtTime(0.02, now);
    compressor.release.setValueAtTime(0.35, now);

    const warmthShelf = ctx.createBiquadFilter();
    warmthShelf.type = 'lowshelf';
    warmthShelf.frequency.setValueAtTime(240, now);
    warmthShelf.gain.setValueAtTime(2.5, now);

    const dryBus = ctx.createGain();
    dryBus.gain.setValueAtTime(0.68, now);

    const reverbSend = ctx.createGain();
    reverbSend.gain.setValueAtTime(0.56, now);

    const convolver = ctx.createConvolver();
    convolver.buffer = getWarmHallImpulse(ctx);

    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'lowpass';
    wetFilter.frequency.setValueAtTime(1950, now);

    dryBus.connect(warmthShelf);
    reverbSend.connect(convolver);
    convolver.connect(wetFilter);
    wetFilter.connect(warmthShelf);
    warmthShelf.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Lush breathing chamber strings & cello chord bed (4 voices, detuned pairs, slow breathing filter LFO)
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(540, now);
    padFilter.Q.setValueAtTime(0.65, now);
    padFilter.connect(dryBus);
    padFilter.connect(reverbSend);

    const lfoOsc = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfoOsc.type = 'sine';
    lfoOsc.frequency.setValueAtTime(0.075, now); // ~13.3s slow serene swell
    lfoGain.gain.setValueAtTime(150, now);
    lfoOsc.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfoOsc.start(now);

    const firstPad = PASTORAL_SCORE[0].pad;
    const padVoices = firstPad.map((freq, i) => {
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();
      oscA.type = i === 0 ? 'sine' : 'triangle';
      oscB.type = 'sine';
      oscA.frequency.setValueAtTime(freq, now);
      oscB.frequency.setValueAtTime(freq, now);
      oscA.detune.setValueAtTime(-4.5, now);
      oscB.detune.setValueAtTime(4.5, now);
      gain.gain.setValueAtTime(i === 0 ? 0.14 : 0.052, now);
      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(padFilter);
      oscA.start(now);
      oscB.start(now);
      return { oscA, oscB, gain };
    });

    // 66 BPM -> 0.909s per beat, 3.636s per 4-beat bar (~58s seamless 16-bar loop)
    const beatSec = 60 / 66;
    const barSec = beatSec * 4;
    let barIdx = 0;

    const engine: SanctuaryEngine = {
      masterGain,
      dryBus,
      reverbSend,
      convolver,
      lfoOsc,
      padFilter,
      padVoices,
      timerId: 0,
      stopped: false,
    };

    const scheduleNextBar = () => {
      if (engine.stopped) return;
      try {
        const bar = PASTORAL_SCORE[barIdx % PASTORAL_SCORE.length];
        barIdx += 1;
        const barStart = ctx.currentTime + 0.06;

        // Smoothly glide chamber strings/cello to the new bar's harmony
        bar.pad.forEach((freq, i) => {
          const voice = engine.padVoices[i];
          if (!voice) return;
          voice.oscA.frequency.setTargetAtTime(freq, barStart, 0.42);
          voice.oscB.frequency.setTargetAtTime(freq, barStart, 0.42);
        });

        // Schedule flowing 8th-note acoustic harp / guitar arpeggio with subtle human rubato
        bar.arp.forEach((freq, stepIdx) => {
          const rubato = (Math.random() - 0.5) * 0.022;
          const t = Math.max(barStart, barStart + stepIdx * (beatSec * 0.5) + rubato);
          const accent = stepIdx === 0 ? 0.95 : stepIdx % 2 === 0 ? 0.72 : 0.56;
          const panPos = stepIdx % 2 === 0 ? -0.22 : 0.22;
          scheduleHarpPluck(ctx, dryBus, reverbSend, freq, t, accent, panPos);
        });

        // Schedule singing right-hand felt grand piano melody
        for (const note of bar.melody) {
          const rubato = (Math.random() - 0.5) * 0.026;
          const t = Math.max(barStart, barStart + note.beat * beatSec + rubato);
          scheduleFeltPianoNote(
            ctx,
            dryBus,
            reverbSend,
            note.freq,
            t,
            note.dur * beatSec,
            note.vel
          );
        }

        // Schedule delicate morning flute phrases on Section B bars
        if (bar.flute) {
          for (const fNote of bar.flute) {
            const t = barStart + fNote.beat * beatSec;
            scheduleMorningFluteNote(
              ctx,
              dryBus,
              reverbSend,
              fNote.freq,
              t,
              fNote.dur * beatSec,
              fNote.vel
            );
          }
        }
      } catch {
        // Silent fallback
      }
    };

    scheduleNextBar();
    engine.timerId = window.setInterval(scheduleNextBar, Math.round(barSec * 1000));
    sanctuaryEngine = engine;
  } catch {
    // Graceful silent fallback
  }
}

let sanctuaryTargetVolume = 0.68;
let sanctuaryDucked = false;

function applySanctuaryGain(): void {
  if (!sanctuaryEngine || !sharedAudioCtx) return;
  try {
    const factor = sanctuaryDucked ? 0.44 : 1.0;
    sanctuaryEngine.masterGain.gain.setTargetAtTime(
      sanctuaryTargetVolume * 0.42 * factor,
      sharedAudioCtx.currentTime,
      0.16
    );
  } catch {
    // ignore
  }
}

function duckSanctuaryAudio(ducked: boolean): void {
  if (sanctuaryDucked === ducked) return;
  sanctuaryDucked = ducked;
  applySanctuaryGain();
}

export function setSanctuaryVolume(volume: number): void {
  sanctuaryTargetVolume = Math.max(0, Math.min(1, volume));
  applySanctuaryGain();
}

export function stopSanctuaryAudio(): void {
  sanctuaryDucked = false;
  if (!sanctuaryEngine) return;
  const engine = sanctuaryEngine;
  engine.stopped = true;
  sanctuaryEngine = null;
  try {
    window.clearInterval(engine.timerId);
    if (sharedAudioCtx) {
      const now = sharedAudioCtx.currentTime;
      engine.masterGain.gain.cancelScheduledValues(now);
      engine.masterGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }
    window.setTimeout(() => {
      try {
        engine.lfoOsc.stop();
        engine.lfoOsc.disconnect();
      } catch {
        // ignore
      }
      engine.padVoices.forEach(({ oscA, oscB, gain }) => {
        try {
          oscA.stop();
          oscB.stop();
          oscA.disconnect();
          oscB.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      });
      try {
        engine.convolver.disconnect();
        engine.masterGain.disconnect();
      } catch {
        // ignore
      }
    }, 340);
  } catch {
    // ignore
  }
}


