import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Deeply calming, compassionate human sanctuary guide voice presets (Gemini 3.8 Flash TTS)
type AnchorVoicePreset = 'tender' | 'warm' | 'grounded';

const VOICE_PRESETS: Record<
  AnchorVoicePreset,
  { voiceName: string; style: string }
> = {
  tender: {
    voiceName: 'Zephyr',
    style:
      'Whisper-soft, unhurried, deeply compassionate human voice comforting a loved one through anxiety in a quiet dim room. Speak very slowly with gentle breathy warmth, soft low-register chest resonance, spacious natural pauses between thoughts, and tender, reassuring downward inflections.',
  },
  warm: {
    voiceName: 'Kore',
    style:
      'Warm, nurturing, deeply empathetic human counselor voice with slow gentle pacing, comforting maternal warmth, unhurried soothing pauses, and soft loving cadence that feels safe and close.',
  },
  grounded: {
    voiceName: 'Charon',
    style:
      'Deep, velvety, deeply calm and compassionate human voice like a steady grounding presence beside you. Speak slowly, quietly, and warmly with comforting low resonance, gentle natural breath pauses, and tender empathy.',
  },
};

const VOICE_CACHE_VERSION = 'v3-compassionate';

// In-memory cache of generated WAV clips keyed by version, preset, and normalized text (bounded)
const ttsCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 60;

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

function formatSoothingCue(text: string): string {
  // Preserve natural human cadence with gentle ellipsis pauses so the voice breathes organically
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.\s+/g, '... ');
}

async function generatePanicAnchorAudio(
  text: string,
  preset: AnchorVoicePreset
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const profile = VOICE_PRESETS[preset];
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: formatSoothingCue(text),
            speechMetadata: {
              style: profile.style,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: profile.voiceName,
          },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('Voice synthesis returned no audio data.');
  }
  return base64Audio;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.post('/api/tts/panic-anchor', async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!rawText || rawText.length > 500) {
      res.status(400).json({ error: 'Please provide a valid grounding cue between 1 and 500 characters.' });
      return;
    }

    const requestedPreset = typeof req.body?.preset === 'string' ? req.body.preset.trim() : '';
    const preset: AnchorVoicePreset =
      requestedPreset === 'warm' || requestedPreset === 'grounded' ? requestedPreset : 'tender';
    const voiceName = VOICE_PRESETS[preset].voiceName;

    const cacheKey = `${VOICE_CACHE_VERSION}:${preset}:${rawText}`;
    const hit = ttsCache.get(cacheKey);
    if (hit) {
      res.json({ audioBase64: hit, mimeType: 'audio/wav', voice: voiceName, preset, cached: true });
      return;
    }

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const audioBase64 = await generatePanicAnchorAudio(rawText, preset);
        if (ttsCache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = ttsCache.keys().next().value;
          if (oldestKey) ttsCache.delete(oldestKey);
        }
        ttsCache.set(cacheKey, audioBase64);
        res.json({
          audioBase64,
          mimeType: 'audio/wav',
          voice: voiceName,
          preset,
          cached: false,
        });
        return;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('GEMINI_API_KEY')) break;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    }

    const message =
      lastErr instanceof Error ? lastErr.message : 'Unable to generate compassionate voice guidance.';
    const missingKey = message.includes('GEMINI_API_KEY');
    const status = missingKey ? 503 : 502;
    res.status(status).json({
      error: message,
      code: missingKey ? 'MISSING_API_KEY' : 'TTS_UPSTREAM_ERROR',
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WELLBE+ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
