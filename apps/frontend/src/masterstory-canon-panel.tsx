import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {
  NarrativeCanonGraph,
  NarrativePresentationMode,
  StoryletEvaluation,
} from '@masterflow/shared';

import {getNarrativeCanonGraph, getNarrativeStorylets} from './api.ts';

type MasterStoryCanonPanelProps = {
  token: string;
  workbenchId: string;
};

const MODES: Array<{id: NarrativePresentationMode; label: string}> = [
  {id: 'reader', label: 'Lecteur'},
  {id: 'workshop', label: 'Atelier'},
  {id: 'full_spoilers', label: 'Spoilers complets'},
];

export function MasterStoryCanonPanel({token, workbenchId}: MasterStoryCanonPanelProps): ReactElement {
  const [mode, setMode] = useState<NarrativePresentationMode>('reader');
  const [graph, setGraph] = useState<NarrativeCanonGraph | null>(null);
  const [storylets, setStorylets] = useState<StoryletEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Lecture narrative non chargée.');

  useEffect(() => {
    setGraph(null);
    setStorylets(null);
    setStatus('Lecture narrative non chargée.');
  }, [workbenchId]);

  const load = useCallback(async (): Promise<void> => {
    if (!workbenchId) return;
    setLoading(true);
    setStatus('Construction de la lecture narrative…');
    try {
      const [nextGraph, nextStorylets] = await Promise.all([
        getNarrativeCanonGraph(workbenchId, mode, token),
        getNarrativeStorylets(workbenchId, token),
      ]);
      setGraph(nextGraph);
      setStorylets(nextStorylets);
      setStatus(`Lecture ${mode} construite sans modifier le canon.`);
    } catch (error) {
      setGraph(null);
      setStorylets(null);
      setStatus(error instanceof Error ? error.message : 'Lecture narrative indisponible.');
    } finally {
      setLoading(false);
    }
  }, [mode, token, workbenchId]);

  const visibleFacts = useMemo(() => {
    if (!graph) return [];
    const visible = new Set(graph.presentation.visible_fact_refs);
    return graph.facts.filter((fact) => visible.has(fact.fact_id));
  }, [graph]);

  return (
    <section className="masterstory-canon" aria-label="Canon narratif MasterStory">
      <header>
        <div>
          <small>Vérité narrative ≠ manière de la raconter</small>
          <h3>Lecture du canon</h3>
        </div>
        <div className="masterstory-canon__modes" aria-label="Niveau de révélation">
          {MODES.map((candidate) => (
            <button
              className={mode === candidate.id ? undefined : 'secondary'}
              key={candidate.id}
              onClick={() => {
                setMode(candidate.id);
                setGraph(null);
                setStorylets(null);
                setStatus(`Mode ${candidate.label} sélectionné. Relancer la lecture.`);
              }}
              type="button"
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </header>
      <div className="masterstory-canon__load">
        <span>{status}</span>
        <button disabled={loading || !workbenchId} onClick={() => void load()} type="button">
          {loading ? 'Analyse…' : 'Construire cette lecture'}
        </button>
      </div>

      {graph ? (
        <>
          <dl className="masterstory-canon__summary">
            <div><dt>Faits visibles</dt><dd>{visibleFacts.length}</dd></div>
            <div><dt>Spoilers masqués</dt><dd>{graph.presentation.hidden_spoiler_refs.length}</dd></div>
            <div><dt>Fils narratifs</dt><dd>{graph.setup_payoffs.length}</dd></div>
            <div><dt>Personnages informés</dt><dd>{new Set(graph.character_knowledge.map((item) => item.character_ref)).size}</dd></div>
          </dl>

          <div className="masterstory-canon__columns">
            <section>
              <div><strong>Faits visibles</strong><span>{graph.presentation.mode}</span></div>
              {visibleFacts.length > 0 ? visibleFacts.map((fact) => (
                <article key={fact.fact_id}>
                  <div><strong>{fact.summary}</strong><span>{fact.truth_state}</span></div>
                  <small>{fact.confidence} · spoiler {fact.spoiler_level}</small>
                </article>
              )) : <p className="muted compact">Aucun fait visible dans cette lecture.</p>}
            </section>

            <section>
              <div><strong>Setup / payoff</strong><span>continuité</span></div>
              {graph.setup_payoffs.length > 0 ? graph.setup_payoffs.map((thread) => (
                <article key={thread.thread_id}>
                  <div><strong>{thread.explanation}</strong><span>{thread.status}</span></div>
                  <small>{thread.setup_refs.length} setup · {thread.payoff_refs.length} payoff</small>
                </article>
              )) : <p className="muted compact">Aucun fil setup/payoff détecté.</p>}
            </section>
          </div>

          <section className="masterstory-canon__diagnostics">
            <strong>Cohérence</strong>
            {graph.diagnostics.contradictions.length === 0
              && graph.diagnostics.spoiler_leaks.length === 0
              && graph.diagnostics.temporal_warnings.length === 0
              && graph.diagnostics.emotion_without_cause.length === 0
              ? <p>Aucune alerte narrative dans cette projection.</p>
              : (
                <ul>
                  {graph.diagnostics.contradictions.map((item) => <li key={`contradiction:${item}`}>Contradiction · {item}</li>)}
                  {graph.diagnostics.spoiler_leaks.map((item) => <li key={`spoiler:${item}`}>Spoiler · {item}</li>)}
                  {graph.diagnostics.temporal_warnings.map((item) => <li key={`time:${item}`}>Temps · {item}</li>)}
                  {graph.diagnostics.emotion_without_cause.map((item) => <li key={`emotion:${item}`}>Émotion · {item}</li>)}
                </ul>
              )}
          </section>

          <section className="masterstory-canon__storylets">
            <div><strong>Événements narratifs proposés</strong><span>jamais déclenchés seuls</span></div>
            {storylets && storylets.instances.length > 0 ? storylets.instances.map((item) => (
              <article key={item.instance_id}>
                <div><strong>{item.definition.title}</strong><span>{item.readiness}</span></div>
                <p>{item.definition.proposed_action}</p>
                <small>{item.reason}</small>
              </article>
            )) : <p className="muted compact">Aucune storylet narrative disponible.</p>}
          </section>
        </>
      ) : null}
      <footer>Lecture seulement · aucun delta canon · aucun export · aucune publication.</footer>
    </section>
  );
}
