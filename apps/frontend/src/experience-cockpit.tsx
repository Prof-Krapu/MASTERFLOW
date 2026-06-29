import {useCallback, useState} from 'react';
import type {ReactElement} from 'react';

import type {
  AutonomyCycle,
  DomainEventEnvelope,
  PrecedentSearchResult,
} from '@masterflow/shared';

import {
  getExperienceAutonomyCycle,
  getExperienceEvents,
  getExperiencePrecedents,
} from './api.ts';

type ExperienceCockpitProps = {
  projectId?: string;
  token: string;
};

function formatDate(value: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ExperienceCockpit({projectId, token}: ExperienceCockpitProps): ReactElement {
  const [cycle, setCycle] = useState<AutonomyCycle | null>(null);
  const [events, setEvents] = useState<DomainEventEnvelope[]>([]);
  const [precedents, setPrecedents] = useState<PrecedentSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Données non chargées.');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setStatus('Lecture de l’Experience Fabric…');
    try {
      const [nextCycle, nextEvents, nextPrecedents] = await Promise.all([
        getExperienceAutonomyCycle(projectId, token),
        getExperienceEvents(projectId, token),
        getExperiencePrecedents(projectId, token),
      ]);
      setCycle(nextCycle);
      setEvents(nextEvents);
      setPrecedents(nextPrecedents);
      setOpen(true);
      setStatus('Lecture synchronisée. Aucune action créée.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Experience Fabric indisponible.');
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  if (!open) {
    return (
      <section className="experience-cockpit experience-cockpit--closed">
        <div>
          <strong>Experience Fabric</strong>
          <span>Chronologie, précédents et recommandations explicables.</span>
        </div>
        <button disabled={loading} onClick={() => void load()} type="button">
          {loading ? 'Chargement…' : 'Analyser le contexte'}
        </button>
        <small aria-live="polite">{status}</small>
      </section>
    );
  }

  return (
    <section className="experience-cockpit" aria-label="Experience Fabric">
      <header>
        <div>
          <small>Orchestration contrôlée · lecture seule</small>
          <h3>Ce que MasterFlow comprend maintenant</h3>
        </div>
        <button className="secondary" disabled={loading} onClick={() => void load()} type="button">
          {loading ? 'Actualisation…' : 'Actualiser'}
        </button>
      </header>
      <p className="muted compact" aria-live="polite">{status}</p>

      {cycle ? (
        <>
          <dl className="experience-cockpit__summary">
            <div><dt>Événements</dt><dd>{cycle.monitor.snapshot.event_count}</dd></div>
            <div><dt>Précédents</dt><dd>{cycle.analyze.precedent_count}</dd></div>
            <div><dt>Propositions</dt><dd>{cycle.analyze.storylet_count}</dd></div>
            <div><dt>Blocages</dt><dd>{cycle.analyze.blocker_count}</dd></div>
          </dl>

          <section className="experience-cockpit__section">
            <div>
              <strong>Prochaine décision à éclairer</strong>
              <span>MasterFlow propose ; l’humain choisit.</span>
            </div>
            {cycle.plan.candidates.length > 0 ? (
              <div className="experience-cockpit__cards">
                {cycle.plan.candidates.slice(0, 4).map((candidate) => (
                  <article key={candidate.candidate_id}>
                    <div>
                      <strong>{candidate.title}</strong>
                      <span>{candidate.readiness}</span>
                    </div>
                    <p>{candidate.proposed_action}</p>
                    <small>
                      Priorité {Math.round(candidate.priority * 100)} %
                      {candidate.validation_required ? ' · validation requise' : ''}
                    </small>
                  </article>
                ))}
              </div>
            ) : <p className="muted compact">Aucune proposition sûre dans ce contexte.</p>}
            {cycle.analyze.findings.map((finding) => <p className="experience-cockpit__finding" key={finding}>{finding}</p>)}
          </section>
        </>
      ) : null}

      <div className="experience-cockpit__columns">
        <section className="experience-cockpit__section">
          <div><strong>Derniers événements</strong><span>Ce qui s’est réellement passé.</span></div>
          {events.length > 0 ? events.slice(0, 5).map((event) => (
            <article className="experience-cockpit__event" key={event.event_id}>
              <div><strong>{event.summary}</strong><span>{event.outcome}</span></div>
              <small>{formatDate(event.occurred_at)} · {event.stream_type}</small>
            </article>
          )) : <p className="muted compact">Aucun événement visible.</p>}
        </section>

        <section className="experience-cockpit__section">
          <div><strong>Précédents utiles</strong><span>À adapter, jamais à appliquer seuls.</span></div>
          {precedents.length > 0 ? precedents.slice(0, 3).map((result) => (
            <article className="experience-cockpit__precedent" key={result.case.case_id}>
              <div><strong>{result.case.title}</strong><span>{Math.round(result.relevance_score * 100)} %</span></div>
              <p>{result.case.lesson}</p>
              <small>{result.adaptation_note}</small>
            </article>
          )) : <p className="muted compact">Aucun précédent comparable disponible.</p>}
        </section>
      </div>
      <footer>
        Plan uniquement · aucune Action créée · aucune mémoire retenue automatiquement.
      </footer>
    </section>
  );
}
