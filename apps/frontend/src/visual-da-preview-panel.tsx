import {useCallback, useState} from 'react';
import type {ReactElement} from 'react';

import type {VisualDaResolverPreview, VisualDaResolverPreviewQuery} from '@masterflow/shared';

import {getVisualDaResolverPreview} from './api.ts';

type Props = {
  token: string;
  defaultQuery?: Partial<VisualDaResolverPreviewQuery>;
  compact?: boolean;
};

const ENTITY_OPTIONS = [
  {id: 'masterflex-001', label: 'MasterFlex'},
  {id: 'prof-krapu-001', label: 'ProfKrapu'},
] as const;

const SURFACE_OPTIONS = [
  {id: 'ui_state_pack', label: 'UI state pack'},
  {id: 'avatar_fullbody', label: 'Avatar fullbody'},
  {id: 'avatar_badge', label: 'Avatar badge'},
  {id: 'badge_container', label: 'Badge Ours d’Or'},
] as const;

const STATE_OPTIONS = [
  {id: '', label: 'État par défaut'},
  {id: 'normal', label: 'MasterFlex · normal'},
  {id: 'amused', label: 'MasterFlex · amusé'},
  {id: 'suspicious', label: 'MasterFlex · suspicieux'},
  {id: 'closed', label: 'MasterFlex · fermé'},
  {id: 'analytical', label: 'ProfKrapu · analytique'},
  {id: 'suspicion', label: 'ProfKrapu · suspicion'},
  {id: 'troll_trap', label: 'ProfKrapu · troll pédagogique'},
  {id: 'revelation', label: 'ProfKrapu · révélation'},
] as const;

function queryDefaults(defaultQuery?: Partial<VisualDaResolverPreviewQuery>): VisualDaResolverPreviewQuery {
  return {
    entity_id: defaultQuery?.entity_id ?? 'masterflex-001',
    context: defaultQuery?.context ?? 'theme_studio',
    output_surface: defaultQuery?.output_surface ?? 'ui_state_pack',
    active_mode: defaultQuery?.active_mode ?? 'theme_studio',
    optional_event_layer: defaultQuery?.optional_event_layer,
    emotional_state: defaultQuery?.emotional_state,
  };
}

function statusLabel(status: VisualDaResolverPreview['resolution_status']): string {
  if (status === 'ready_for_manifest_preview') return 'prêt pour manifest preview';
  if (status === 'limited_missing_inputs') return 'limité : éléments manquants';
  return 'bloqué';
}

export function VisualDaPreviewPanel({token, defaultQuery, compact = false}: Props): ReactElement {
  const defaults = queryDefaults(defaultQuery);
  const [entityId, setEntityId] = useState(defaults.entity_id);
  const [context, setContext] = useState(defaults.context);
  const [outputSurface, setOutputSurface] = useState(defaults.output_surface);
  const [activeMode, setActiveMode] = useState(defaults.active_mode);
  const [optionalEventLayer, setOptionalEventLayer] = useState(defaults.optional_event_layer ?? '');
  const [emotionalState, setEmotionalState] = useState(defaults.emotional_state ?? '');
  const [preview, setPreview] = useState<VisualDaResolverPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Resolver DA prêt. Aucun provider image ouvert.');

  const resolve = useCallback(async (): Promise<void> => {
    setBusy(true);
    setStatus('Compilation DA en lecture seule…');
    try {
      const nextPreview = await getVisualDaResolverPreview({
        entity_id: entityId,
        context,
        output_surface: outputSurface,
        active_mode: activeMode,
        optional_event_layer: optionalEventLayer.trim() || undefined,
        emotional_state: emotionalState.trim() || undefined,
      }, token);
      setPreview(nextPreview);
      setStatus(`Preview DA construit : ${statusLabel(nextPreview.resolution_status)}.`);
    } catch (error) {
      setPreview(null);
      setStatus(error instanceof Error ? error.message : 'Preview DA indisponible.');
    } finally {
      setBusy(false);
    }
  }, [activeMode, context, emotionalState, entityId, optionalEventLayer, outputSurface, token]);

  return (
    <section className={`theme-studio__explanations visual-da-preview${compact ? ' visual-da-preview--compact' : ''}`}>
      <div>
        <strong>Resolver DA Registry</strong>
        <span>stack, refs, interdits, gates</span>
      </div>

      <div className="visual-da-preview__controls">
        <label>
          Persona / entité
          <select value={entityId} onChange={(event) => setEntityId(event.target.value)}>
            {ENTITY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label>
          Surface
          <select value={outputSurface} onChange={(event) => setOutputSurface(event.target.value)}>
            {SURFACE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label>
          État narratif
          <select value={emotionalState} onChange={(event) => setEmotionalState(event.target.value)}>
            {STATE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label>
          Couche optionnelle
          <input
            value={optionalEventLayer}
            onChange={(event) => setOptionalEventLayer(event.target.value)}
            placeholder="event_layer_ours_dor"
          />
        </label>
        <label>
          Contexte
          <input value={context} onChange={(event) => setContext(event.target.value)} />
        </label>
        <label>
          Mode actif
          <input value={activeMode} onChange={(event) => setActiveMode(event.target.value)} />
        </label>
        <button disabled={busy} onClick={() => void resolve()} type="button">
          {busy ? 'Résolution…' : 'Pourquoi ce visuel ?'}
        </button>
      </div>

      <p className="owner-cockpit__status" aria-live="polite">{status}</p>

      {preview ? (
        <div className="visual-da-preview__result">
          <dl className="theme-studio__summary">
            <div><dt>Statut</dt><dd>{statusLabel(preview.resolution_status)}</dd></div>
            <div><dt>Exécution</dt><dd>{preview.execution_policy}</dd></div>
            <div><dt>Génération</dt><dd>{preview.d08_manifest_preview.generation_allowed ? 'ouverte' : 'fermée'}</dd></div>
            <div><dt>Canonisation</dt><dd>{preview.d08_manifest_preview.canon_promotion_allowed ? 'ouverte' : 'fermée'}</dd></div>
          </dl>

          <div className="theme-studio__columns">
            <section>
              <div><strong>Stack DA</strong><span>ordre de compilation</span></div>
              {preview.da_stack.map((item) => (
                <article key={`${item.stack_type}:${item.stack_ref}`}>
                  <div><strong>{item.label}</strong><span>{item.stack_type}</span></div>
                  <p>{item.stack_ref} · {item.authority}</p>
                </article>
              ))}
            </section>

            <section>
              <div><strong>Acting narratif</strong><span>pose, regard, intention</span></div>
              {preview.narrative_acting_payload ? (
                <article>
                  <div>
                    <strong>{preview.narrative_acting_payload.label}</strong>
                    <span>{preview.narrative_acting_payload.emotional_state}</span>
                  </div>
                  <p>{preview.narrative_acting_payload.narrative_intent}</p>
                  <p>{preview.narrative_acting_payload.expression} · {preview.narrative_acting_payload.pose}</p>
                </article>
              ) : <p className="muted compact">Aucun acting résolu.</p>}
            </section>
          </div>

          <div className="theme-studio__columns">
            <section>
              <div><strong>Références</strong><span>rôles typés</span></div>
              {preview.reference_boards.map((board) => (
                <article key={board.board_id}>
                  <div><strong>{board.label}</strong><span>{board.role}</span></div>
                  <p>Autorisé : {board.allowed_use.join(', ')}</p>
                  {board.forbidden_use.length > 0 ? <small>Interdit : {board.forbidden_use.join(', ')}</small> : null}
                </article>
              ))}
            </section>

            <section>
              <div><strong>Jauges et gates</strong><span>anti-dérive</span></div>
              {preview.visual_gauges.map((gauge) => (
                <article className="theme-studio__arc" key={gauge.gauge_id}>
                  <div><strong>{gauge.label}</strong><span>{gauge.default_value}/{gauge.max}</span></div>
                  <div className="theme-studio__meter" aria-label={`${gauge.label} ${gauge.default_value} sur ${gauge.max}`}>
                    <span style={{width: `${Math.round((gauge.default_value / gauge.max) * 100)}%`}} />
                  </div>
                  <small>{gauge.applies_to.join(' · ')}</small>
                </article>
              ))}
              <article>
                <strong>Gates bloquants</strong>
                <p>{preview.blocking_gates.join(' · ') || 'Aucun gate déclaré.'}</p>
              </article>
            </section>
          </div>

          <section className={`theme-studio__diagnostics ${preview.missing_items.length > 0 ? 'theme-studio__diagnostics--warning' : ''}`}>
            <strong>Manques / interdits</strong>
            {preview.missing_items.length === 0 ? <p>Aucun manque critique signalé.</p> : (
              <ul>{preview.missing_items.map((item) => <li key={item}>{item}</li>)}</ul>
            )}
            <p>Negative locks : {preview.negative_locks.join(' · ') || 'Aucun lock négatif.'}</p>
          </section>

          <section className="theme-studio__explanations">
            <div><strong>Explication courte</strong><span>preuves</span></div>
            {preview.explanation_cards.map((card) => (
              <article key={card.title}>
                <strong>{card.title}</strong>
                <p>{card.explanation}</p>
                <small>{card.source_refs.slice(0, 4).join(' · ')}</small>
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </section>
  );
}
