import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, unlink, access } from 'fs/promises';
import path from 'path';

const execFile = promisify(execFileCb);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static');

const TEMP_DIR = '/tmp/video-tagging';
const DOWNLOAD_TIMEOUT_MS = 60_000;
const FFMPEG_TIMEOUT_MS = 30_000;

export interface KeyframeExtractionResult {
  frames: Buffer[];
  durationSeconds: number;
  audioPath: string | null;
}

async function ensureTempDir(): Promise<void> {
  await mkdir(TEMP_DIR, { recursive: true });
}

async function downloadVideo(url: string, destPath: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to download video: HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destPath, buffer);
  } finally {
    clearTimeout(timeout);
  }
}

function parseDurationFromStderr(stderr: string): number {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const centiseconds = parseInt(match[4], 10);
  return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
}

export async function extractKeyframesAndAudio(
  videoUrl: string,
  adId: string
): Promise<KeyframeExtractionResult> {
  await ensureTempDir();

  const videoPath = path.join(TEMP_DIR, `${adId}.mp4`);
  const audioPath = path.join(TEMP_DIR, `${adId}.mp3`);

  await downloadVideo(videoUrl, videoPath);

  // Probe duration via ffmpeg -i (parses stderr)
  let durationSeconds = 0;
  try {
    await execFile(ffmpegPath, ['-i', videoPath], { timeout: FFMPEG_TIMEOUT_MS });
  } catch (error: unknown) {
    // ffmpeg -i always exits non-zero when no output specified — parse stderr for duration
    const stderr = (error as { stderr?: string }).stderr || '';
    durationSeconds = parseDurationFromStderr(stderr);
  }

  // Extract 5 keyframes at 0%, 25%, 50%, 75%, 99%
  const framePositions = durationSeconds > 0
    ? [0, 0.25, 0.5, 0.75, 0.99].map(p => Math.max(0, p * durationSeconds))
    : [0, 1, 2, 3, 4];

  const frames: Buffer[] = [];
  for (let i = 0; i < framePositions.length; i++) {
    const framePath = path.join(TEMP_DIR, `${adId}_frame_${i}.jpg`);
    try {
      await execFile(
        ffmpegPath,
        [
          '-ss', framePositions[i].toFixed(2),
          '-i', videoPath,
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          framePath,
        ],
        { timeout: FFMPEG_TIMEOUT_MS }
      );
      const frameBuffer = await readFile(framePath);
      frames.push(frameBuffer);
      await unlink(framePath).catch(() => {});
    } catch {
      // If a frame extraction fails, skip it
      console.warn(`[ffmpeg] Failed to extract frame ${i} for ad ${adId}`);
    }
  }

  // Extract audio track
  let finalAudioPath: string | null = null;
  try {
    await execFile(
      ffmpegPath,
      [
        '-i', videoPath,
        '-vn',
        '-acodec', 'libmp3lame',
        '-q:a', '4',
        '-y',
        audioPath,
      ],
      { timeout: FFMPEG_TIMEOUT_MS }
    );
    await access(audioPath);
    finalAudioPath = audioPath;
  } catch {
    // No audio track or extraction failed
    finalAudioPath = null;
  }

  // Clean up video file
  await unlink(videoPath).catch(() => {});

  return {
    frames,
    durationSeconds,
    audioPath: finalAudioPath,
  };
}

export async function cleanupTempFiles(adId: string): Promise<void> {
  const patterns = [
    `${adId}.mp4`,
    `${adId}.mp3`,
    `${adId}_frame_0.jpg`,
    `${adId}_frame_1.jpg`,
    `${adId}_frame_2.jpg`,
    `${adId}_frame_3.jpg`,
    `${adId}_frame_4.jpg`,
  ];

  for (const pattern of patterns) {
    await unlink(path.join(TEMP_DIR, pattern)).catch(() => {});
  }
}
