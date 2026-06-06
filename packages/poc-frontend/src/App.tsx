import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {ChangeEvent, FormEvent, ReactElement} from 'react';

import type {AuthResponse, CurrentContext, Persona, User} from '@masterflow/shared';

import {BlendCanvas} from './canvas/BlendCanvas';
import {api} from './api';
import {useChatWs} from './useChatWs';

/**
 * Harness PoC MasterFlow — assemble TOUT le « money-shot ».
 *
 * Parcours : login → contexte courant (room + personas) → chat WS en streaming →
 * slider de fusion ProfKrapu ⇄ Corrector qui pilote les métaballs de {@link BlendCanvas}.
 *
 * Ce fichier n'est qu'un harness de démonstration : MALEX construit le vrai front.
 * On consomme le VRAI backend (REST `/api/v1` + WS `/ws/{room_instance_id}`).
 *
 * Invariant produit rappelé en bandeau : 1 SEUL porte-parole sémantique = le persona
 * PRIMAIRE de la chimère. La fusion est visuelle / d'inspiration, jamais de permissions.
 */

// ───────────────────────── Constantes de démo ─────────────────────────

/** Persona primaire de la chimère du PoC (porte-parole). */
const PROFKRAPU_ID = 'profkrapu-001';
/** Persona secondaire de la chimère du PoC (prête sa méthode). */
const CORRECTOR_ID = 'corrector-001';

/** Couleur ProfKrapu (vert) — pôle « primaire » des métaballs. */
const COLOR_PROFKRAPU = '#3ddc84';
/** Couleur Corrector (violet) — pôle « secondaire » des métaballs. */
const COLOR_CORRECTOR = '#a855f7';

/** Délai de debounce (ms) avant d'envoyer la mise à jour de blend au backend. */
const BLEND_DEBOUNCE_MS = 120;

// ───────────────────────── Helpers ─────────────────────────

/** Retrouve un persona par id dans la liste du contexte (ou `null`). */
function findPersona(personas: readonly Persona[], id: string): Persona | null {
  return personas.find((p) => p.id === id) ?? null;
}

/** Détecte la préférence système « mouvement réduit » (réactif). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

// ───────────────────────── Écran 1 — Login ─────────────────────────

/** Props de l'écran de connexion. */
interface LoginScreenProps {
  /** Appelé après une authentification réussie. */
  onAuth: (auth: AuthResponse) => void;
}

/** Formulaire de connexion (prérempli vincent / masterflow pour la démo). */
function LoginScreen({onAuth}: LoginScreenProps): ReactElement {
  const [username, setUsername] = useState('vincent');
  const [password, setPassword] = useState('masterflow');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const auth = await api.login(username, password);
        onAuth(auth);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Échec de connexion.');
      } finally {
        setLoading(false);
      }
    },
    [username, password, onAuth],
  );

  return (
    <div className="screen screen--login">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>MasterFlow — PoC</h1>
        <p className="login-subtitle">Connexion au runtime vivant</p>

        <label>
          Identifiant
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}

// ───────────────────────── Écran 2 — Room (money-shot) ─────────────────────────

/** Props de l'écran de room (utilisateur déjà authentifié). */
interface RoomScreenProps {
  /** Jeton JWT courant (auth WS + REST). */
  token: string;
  /** Utilisateur authentifié. */
  user: User;
  /** Déconnexion (efface le jeton). */
  onLogout: () => void;
}

/**
 * Écran principal : fond métaballs (BlendCanvas) + slider de fusion + chat WS streaming.
 * Charge le contexte courant, gère la chimère ProfKrapu ⇄ Corrector et le porte-parole.
 */
function RoomScreen({token, user, onLogout}: RoomScreenProps): ReactElement {
  const reducedMotion = usePrefersReducedMotion();

  // Contexte courant (room_instance, personas, chimère active).
  const [context, setContext] = useState<CurrentContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  // Valeur du slider de fusion (0 = ProfKrapu seul → 1 = Corrector au max).
  const [blend, setBlend] = useState(0);
  // Id de la chimère active une fois créée (null tant qu'on n'a pas interagi).
  const [blendId, setBlendId] = useState<string | null>(null);
  const [blendBusy, setBlendBusy] = useState(false);

  // Timer de debounce pour les mises à jour de blend.
  const blendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement du contexte ──
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await api.getCurrentContext(token);
        if (cancelled) return;
        setContext(ctx);
        // Reprend l'état d'une chimère déjà active côté backend.
        if (ctx.active_blend) {
          setBlendId(ctx.active_blend.id);
          setBlend(ctx.active_blend.blend_weights.voice);
        }
      } catch (err) {
        if (!cancelled) {
          setContextError(err instanceof Error ? err.message : 'Contexte indisponible.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const roomInstanceId = context?.room_instance.id ?? null;

  // ── Chat WS (streaming) ──
  const chat = useChatWs(roomInstanceId, token);

  // Personas de la chimère (résolus depuis le contexte).
  const profkrapu = useMemo(
    () => (context ? findPersona(context.personas, PROFKRAPU_ID) : null),
    [context],
  );
  const corrector = useMemo(
    () => (context ? findPersona(context.personas, CORRECTOR_ID) : null),
    [context],
  );

  // ── Pilotage du blend : crée la chimère à la 1re interaction, puis met à jour ──
  const applyBlend = useCallback(
    (value: number): void => {
      if (!roomInstanceId) return;

      if (blendTimer.current) clearTimeout(blendTimer.current);
      blendTimer.current = setTimeout(() => {
        void (async () => {
          setBlendBusy(true);
          try {
            const weights = {voice: value, method: 1 - value, mirror: value};
            if (!blendId) {
              // 1re interaction : création de la chimère ProfKrapu (primaire) ⇄ Corrector (secondaire).
              const created = await api.createBlend(token, {
                room_instance_id: roomInstanceId,
                primary_persona_id: PROFKRAPU_ID,
                secondary_persona_id: CORRECTOR_ID,
                blend_weights: weights,
                active_layers: ['voice', 'method_signature'],
              });
              setBlendId(created.id);
            } else {
              await api.updateBlend(token, blendId, weights);
            }
          } catch {
            // Démo : on garde l'animation locale même si la persistance échoue.
          } finally {
            setBlendBusy(false);
          }
        })();
      }, BLEND_DEBOUNCE_MS);
    },
    [roomInstanceId, blendId, token],
  );

  const handleBlendChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const value = Number(e.target.value);
      setBlend(value); // pilotage immédiat des métaballs (UI réactive).
      applyBlend(value); // persistance debouncée côté backend.
    },
    [applyBlend],
  );

  // Nettoyage du timer de debounce au démontage.
  useEffect(() => {
    return () => {
      if (blendTimer.current) clearTimeout(blendTimer.current);
    };
  }, []);

  // ── Chat : envoi ──
  const [draft, setDraft] = useState('');
  const handleSend = useCallback(
    (e: FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      const content = draft.trim();
      if (!content) return;
      chat.send(content);
      setDraft('');
    },
    [draft, chat],
  );

  // Porte-parole courant : nom annoncé par le WS, sinon le primaire de la chimère.
  const speakerName = chat.currentSpeaker ?? profkrapu?.name ?? 'ProfKrapu';
  // Connexion WS prête à recevoir/envoyer.
  const wsConnected = chat.status === 'open';

  if (contextError) {
    return (
      <div className="screen screen--error">
        <p className="error">Erreur de contexte : {contextError}</p>
        <button type="button" onClick={onLogout}>
          Se reconnecter
        </button>
      </div>
    );
  }

  if (!context || !roomInstanceId) {
    return (
      <div className="screen screen--loading">
        <p>Chargement du contexte…</p>
      </div>
    );
  }

  return (
    <div className="screen screen--room">
      {/* Fond métaballs : la valeur du slider pilote le smoothMin GLSL. */}
      <BlendCanvas
        blendWeight={blend}
        primaryColor={COLOR_PROFKRAPU}
        secondaryColor={COLOR_CORRECTOR}
        reducedMotion={reducedMotion}
      />

      <div className="room-overlay">
        {/* Bandeau invariant : 1 seul porte-parole. */}
        <header className="speaker-banner">
          <span className="speaker-banner__label">1 seul porte-parole :</span>{' '}
          <strong>{speakerName}</strong>
          <button type="button" className="logout" onClick={onLogout}>
            {user.display_name} · Déconnexion
          </button>
        </header>

        {/* Slider de fusion ProfKrapu ⇄ Corrector. */}
        <section className="blend-control">
          <label htmlFor="blend-slider">
            Fusion <span style={{color: COLOR_PROFKRAPU}}>{profkrapu?.name ?? 'ProfKrapu'}</span>{' '}
            ⇄ <span style={{color: COLOR_CORRECTOR}}>{corrector?.name ?? 'Corrector'}</span>
            {blendBusy ? ' · sync…' : null}
          </label>
          <input
            id="blend-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={blend}
            onChange={handleBlendChange}
            aria-label="Fusion ProfKrapu vers Corrector"
          />
          <span className="blend-control__value">{Math.round(blend * 100)} %</span>
        </section>

        {/* Zone de chat WS streaming. */}
        <section className="chat">
          <div className="chat__status" aria-live="polite">
            {wsConnected ? 'WS connecté' : 'WS déconnecté'}
            {chat.status === 'error' ? ' · erreur de connexion' : null}
          </div>

          <ul className="chat__messages">
            {chat.messages.map((m) => (
              <li key={m.id} className={`chat__msg chat__msg--${m.role}`}>
                {m.role === 'assistant' && m.speaker ? (
                  <span className="chat__speaker">{m.speaker}</span>
                ) : null}
                <p className="chat__content">{m.content}</p>
                {m.method_attribution ? (
                  <p className="chat__attribution">{m.method_attribution}</p>
                ) : null}
              </li>
            ))}
          </ul>

          <form className="chat__form" onSubmit={handleSend}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Parler à ${speakerName}…`}
              disabled={!wsConnected}
            />
            <button type="submit" disabled={!wsConnected || !draft.trim()}>
              Envoyer
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

// ───────────────────────── Racine ─────────────────────────

/**
 * Composant racine : gère l'état d'auth (token + user) et bascule entre
 * l'écran de login et l'écran de room.
 */
export default function App(): ReactElement {
  const [auth, setAuth] = useState<AuthResponse | null>(null);

  const handleLogout = useCallback((): void => {
    setAuth(null);
  }, []);

  if (!auth) {
    return <LoginScreen onAuth={setAuth} />;
  }

  return <RoomScreen token={auth.token} user={auth.user} onLogout={handleLogout} />;
}
