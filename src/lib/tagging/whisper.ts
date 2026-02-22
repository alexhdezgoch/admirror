import { readFile, stat } from 'fs/promises';

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';
const COST_PER_HOUR = 0.04;

export interface TranscriptionResult {
  transcript: string;
  wordCount: number;
  durationMs: number;
  audioSeconds: number;
  estimatedCostUsd: number;
  error?: string;
}

export async function transcribeAudio(audioPath: string): Promise<TranscriptionResult> {
  const startTime = Date.now();

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return {
      transcript: '',
      wordCount: 0,
      durationMs: Date.now() - startTime,
      audioSeconds: 0,
      estimatedCostUsd: 0,
      error: 'GROQ_API_KEY not configured',
    };
  }

  try {
    const audioBuffer = await readFile(audioPath);
    const audioStats = await stat(audioPath);

    // Estimate audio duration from file size (rough: MP3 ~128kbps = 16KB/s)
    const estimatedAudioSeconds = Math.max(1, audioStats.size / 16_000);

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
    formData.append('model', WHISPER_MODEL);
    formData.append('response_format', 'json');

    const response = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        transcript: '',
        wordCount: 0,
        durationMs,
        audioSeconds: estimatedAudioSeconds,
        estimatedCostUsd: 0,
        error: `Groq API error: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json() as { text?: string };
    const transcript = (data.text || '').trim();
    const wordCount = transcript ? transcript.split(/\s+/).length : 0;
    const estimatedCostUsd = (estimatedAudioSeconds / 3600) * COST_PER_HOUR;

    return {
      transcript,
      wordCount,
      durationMs,
      audioSeconds: estimatedAudioSeconds,
      estimatedCostUsd,
    };
  } catch (error) {
    return {
      transcript: '',
      wordCount: 0,
      durationMs: Date.now() - startTime,
      audioSeconds: 0,
      estimatedCostUsd: 0,
      error: error instanceof Error ? error.message : 'Unknown transcription error',
    };
  }
}
