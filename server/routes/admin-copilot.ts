import {Router} from 'express';

import {requireAdmin} from '../auth.ts';

/**
 * Auth GitHub Copilot pour la console admin — miroir serveur du device-flow des sous-apps
 * (`API_corrector/lib/github-auth.ts` + `components/GitHubLogin.tsx`).
 *
 * Pourquoi côté serveur : `api.githubcopilot.com` n'accepte QUE le token OAuth `gho_…` minté
 * par ce flux (un `github_pat_…` est rejeté → « invalid token: missing = param »). Les endpoints
 * GitHub du device-flow n'envoient pas d'en-têtes CORS, donc un `fetch` navigateur échouerait :
 * on relaie en server-to-server, et le token ne transite que via l'admin authentifié.
 */

// Client ID OpenCode — reconnu par GitHub comme client Copilot légitime (vision/multimodal sur
// api.githubcopilot.com). Identique au flux des sous-apps. Public (déjà dans le source correcteur).
const GITHUB_CLIENT_ID = 'Ov23li8tweQw6odWQebz';
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

export function createAdminCopilotRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  // POST /device/start — démarre le device-flow. Renvoie le code utilisateur + l'URL de
  // vérification à afficher, et le device_code (nécessaire au polling côté client).
  router.post('/device/start', async (_req, res) => {
    try {
      const r = await fetch(GITHUB_DEVICE_CODE_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
        body: new URLSearchParams({client_id: GITHUB_CLIENT_ID, scope: 'read:user'}),
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text().catch(() => '');
      if (!r.ok) {
        res.status(502).json({error: 'github_device_failed', detail: text.slice(0, 400)});
        return;
      }
      const d = JSON.parse(text) as {
        device_code?: string;
        user_code?: string;
        verification_uri?: string;
        expires_in?: number;
        interval?: number;
      };
      res.json({
        device_code: d.device_code,
        user_code: d.user_code,
        verification_uri: d.verification_uri,
        expires_in: d.expires_in,
        interval: d.interval ?? 5,
      });
    } catch (e) {
      res.status(502).json({error: 'github_unreachable', detail: (e as Error).message});
    }
  });

  // POST /device/poll { device_code } — un tic de polling. Le client reboucle selon le statut.
  // Statuts : pending | slow_down | expired | denied | error | ok (+ access_token, user).
  router.post('/device/poll', async (req, res) => {
    const deviceCode = String(req.body?.device_code ?? '').trim();
    if (!deviceCode) {
      res.status(400).json({error: 'missing_device_code'});
      return;
    }
    try {
      const r = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
        body: new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await r.json().catch(() => ({}))) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (data.access_token) {
        // Profil GitHub pour affichage (best-effort, non bloquant).
        let user: {login?: string; name?: string | null; avatar_url?: string} | null = null;
        try {
          const ur = await fetch(GITHUB_USER_URL, {
            headers: {
              Authorization: `Bearer ${data.access_token}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'api-manage/1.0.0',
            },
            signal: AbortSignal.timeout(10_000),
          });
          if (ur.ok) {
            const u = (await ur.json()) as {login?: string; name?: string | null; avatar_url?: string};
            user = {login: u.login, name: u.name ?? null, avatar_url: u.avatar_url};
          }
        } catch {
          /* profil non bloquant */
        }
        res.json({status: 'ok', access_token: data.access_token, user});
        return;
      }

      switch (data.error) {
        case 'authorization_pending':
          res.json({status: 'pending'});
          return;
        case 'slow_down':
          res.json({status: 'slow_down'});
          return;
        case 'expired_token':
          res.json({status: 'expired'});
          return;
        case 'access_denied':
          res.json({status: 'denied'});
          return;
        default:
          res.json({status: 'error', detail: data.error_description ?? data.error ?? 'inconnu'});
          return;
      }
    } catch (e) {
      res.status(502).json({error: 'github_unreachable', detail: (e as Error).message});
    }
  });

  return router;
}
