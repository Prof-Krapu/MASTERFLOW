import {Router} from 'express';
import {EdgeTTS} from 'node-edge-tts';
import {TtsRequestSchema} from '@masterflow/shared';

import {requireUser} from '../middleware/auth.ts';
import {
  consumeTtsQuota,
  synthesizePersonaSpeech,
  type TtsGenerator,
} from '../services/tts.ts';

const edgeGenerator: TtsGenerator = async (input) => {
  const tts = new EdgeTTS({
    voice: input.voice,
    lang: input.lang,
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    pitch: input.pitch,
    rate: input.rate,
    volume: input.volume,
  });
  await tts.ttsPromise(input.text, input.outputPath);
};

export function createTtsRouter(generate: TtsGenerator = edgeGenerator): Router {
  const router = Router();
  router.use(requireUser);
  router.post('/', async (req, res): Promise<void> => {
    const parsed = TtsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_tts_request'});
      return;
    }
    const actor = req.user;
    if (!actor) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    if (!consumeTtsQuota(actor.id)) {
      res.status(429).json({error: 'tts_rate_limited'});
      return;
    }
    try {
      const result = await synthesizePersonaSpeech(actor, parsed.data, generate);
      res
        .status(200)
        .set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(result.audio.length),
          'X-MasterFlow-Persona': result.personaId,
          'Cache-Control': 'no-store',
        })
        .send(result.audio);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'tts_failed';
      const status = code === 'tts_persona_mismatch' || code.includes('unavailable') ? 403 : 503;
      res.status(status).json({error: code});
    }
  });
  return router;
}
