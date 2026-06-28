import {Router} from 'express';
import {EdgeTTS} from 'node-edge-tts';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createReadStream, unlink, stat} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {getDb} from '../db/schema.ts';

/**
 * Routeur TTS (Text-to-Speech) utilisant node-edge-tts.
 * Génération à la volée avec nettoyage immédiat du fichier temporaire.
 */
export function createTtsRouter(): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const {text, personaId, voice: requestedVoice} = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({error: 'Le champ "text" est requis.'});
      }

      let voice = requestedVoice || 'fr-FR-HenriNeural'; // Voix par défaut
      let pitch: string | undefined;
      let rate: string | undefined;
      let volume: string | undefined;

      // Si un personaId est fourni, on tente de récupérer sa voix en BDD
      if (personaId) {
        const db = getDb();
        const personaRow = db.prepare('SELECT voice_config_json FROM personas WHERE id = ?').get(personaId) as {
          voice_config_json: string | null;
        } | undefined;

        if (personaRow && personaRow.voice_config_json) {
          try {
            const voiceConfig = JSON.parse(personaRow.voice_config_json);
            if (voiceConfig) {
              if (voiceConfig.voice) voice = voiceConfig.voice;
              if (voiceConfig.pitch) pitch = voiceConfig.pitch;
              if (voiceConfig.rate) rate = voiceConfig.rate;
              if (voiceConfig.volume) volume = voiceConfig.volume;
            }
          } catch (e) {
            console.error('[tts] Erreur parsing voice_config_json:', e);
          }
        }
      }

      // Chemin temporaire
      const tempId = randomUUID();
      const audioPath = join(tmpdir(), `masterflow_tts_${tempId}.mp3`);

      // Instanciation TTS
      const tts = new EdgeTTS({
        voice,
        lang: voice.split('-').slice(0, 2).join('-'), // ex: fr-FR
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        ...(pitch && { pitch }),
        ...(rate && { rate }),
        ...(volume && { volume })
      });

      // Génération du fichier audio
      await tts.ttsPromise(text, audioPath);

      // Stream du fichier vers la réponse
      stat(audioPath, (err, stats) => {
        if (err) {
          console.error('[tts] Erreur stat fichier temporaire:', err);
          return res.status(500).json({error: 'Erreur lors de la génération audio.'});
        }

        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': stats.size,
          'Content-Disposition': 'inline; filename="tts.mp3"'
        });

        const readStream = createReadStream(audioPath);
        
        readStream.pipe(res);

        // Nettoyage après envoi
        readStream.on('end', () => {
          unlink(audioPath, (unlinkErr) => {
            if (unlinkErr) console.error('[tts] Erreur suppression fichier temporaire:', unlinkErr);
          });
        });
        
        readStream.on('error', (streamErr) => {
          console.error('[tts] Erreur stream read:', streamErr);
          if (!res.headersSent) res.status(500).end();
        });
      });

    } catch (error) {
      console.error('[tts] Exception interne:', error);
      res.status(500).json({error: 'Erreur interne du serveur TTS.'});
    }
  });

  return router;
}
