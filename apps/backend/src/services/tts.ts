import {createHash, randomUUID} from 'node:crypto';
import {readFile, stat, unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {TtsRequestSchema, type TtsRequest} from '@masterflow/shared';

import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {resolvePersonaSpeaker} from './persona_speaker.ts';

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const DEFAULT_PROFILE = {
  voice: 'fr-FR-HenriNeural',
  lang: 'fr-FR',
  pitch: '+0Hz',
  rate: '+0%',
  volume: '+0%',
} as const;
const rateWindows = new Map<string, number[]>();

export interface TtsGeneratorInput {
  text: string;
  outputPath: string;
  voice: string;
  lang: string;
  pitch: string;
  rate: string;
  volume: string;
}
export type TtsGenerator = (input: TtsGeneratorInput) => Promise<void>;

export function consumeTtsQuota(userId: string, now = Date.now()): boolean {
  const recent = (rateWindows.get(userId) ?? []).filter((timestamp) => timestamp > now - RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) return false;
  rateWindows.set(userId, [...recent, now]);
  return true;
}

export async function synthesizePersonaSpeech(
  actor: AuthUser,
  raw: TtsRequest,
  generate: TtsGenerator,
): Promise<{audio: Buffer; personaId: string; voiceId: string}> {
  const request = TtsRequestSchema.parse(raw);
  const {speaker} = resolvePersonaSpeaker(actor, request.room_instance_id);
  if (request.expected_persona_id && request.expected_persona_id !== speaker.id) {
    throw new Error('tts_persona_mismatch');
  }
  const outputPath = join(tmpdir(), `masterflow_tts_${randomUUID()}.mp3`);
  const textHash = createHash('sha256').update(request.text).digest('hex');
  let timeout: NodeJS.Timeout | null = null;
  const generation = generate({...DEFAULT_PROFILE, text: request.text, outputPath});
  try {
    await Promise.race([
      generation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('tts_timeout')), TIMEOUT_MS);
      }),
    ]);
    const file = await stat(outputPath);
    if (file.size > MAX_AUDIO_BYTES) throw new Error('tts_audio_too_large');
    const audio = await readFile(outputPath);
    audit({
      event_type: 'tts.generated',
      user_id: actor.id,
      scope: `room:${request.room_instance_id}`,
      detail: {
        text_hash: textHash,
        text_length: request.text.length,
        persona_id: speaker.id,
        voice_id: DEFAULT_PROFILE.voice,
        provider: 'edge_tts',
      },
    });
    return {audio, personaId: speaker.id, voiceId: DEFAULT_PROFILE.voice};
  } catch (error) {
    if (error instanceof Error && error.message === 'tts_timeout') {
      void generation.finally(() => unlink(outputPath).catch(() => undefined));
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
    await unlink(outputPath).catch(() => undefined);
  }
}
