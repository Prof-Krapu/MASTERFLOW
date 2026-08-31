import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';
import {BookOpenCheck, Search, SlidersHorizontal} from 'lucide-react';

import type {AcademicFramework, PedagogicalClassification, PedagogicalResourceResult, Role} from '@masterflow/shared';

import {
  adjustPedagogicalResourceClassification,
  getAcademicFrameworks,
  getPedagogicalClassificationReview,
  searchPedagogicalResources,
} from './api.ts';

type Props = {
  role: Role;
  token: string;
};

type ReviewItem = {resource_id: string; title: string; classification: PedagogicalClassification};

export function PedagogicalResourceRegistry({role, token}: Props): ReactElement {
  const [frameworks, setFrameworks] = useState<AcademicFramework[]>([]);
  const [frameworkCode, setFrameworkCode] = useState('higher_education_fr');
  const [levelCode, setLevelCode] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PedagogicalResourceResult[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Chargement du registre…');
  const canSeeCandidates = role === 'admin' || role === 'godmode';

  const activeFramework = useMemo(
    () => frameworks.find((framework) => framework.code === frameworkCode) ?? null,
    [frameworkCode, frameworks],
  );

  const refreshReview = useCallback(async (): Promise<void> => {
    const items = await getPedagogicalClassificationReview(token);
    setReview(items);
    setSelectedLevels(Object.fromEntries(items.map((item) => [
      item.resource_id,
      item.classification.effective_level_code ?? '',
    ])));
  }, [token]);

  const runSearch = useCallback(async (nextQuery = query): Promise<void> => {
    setStatus('Recherche dans les ressources validées…');
    try {
      const response = await searchPedagogicalResources({
        q: nextQuery,
        framework: frameworkCode,
        level: levelCode || undefined,
        includeCandidates: canSeeCandidates,
        limit: 8,
      }, token);
      setResults(response.results);
      setStatus(`${response.total} ressource${response.total > 1 ? 's' : ''} pertinente${response.total > 1 ? 's' : ''}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Recherche indisponible.');
    }
  }, [canSeeCandidates, frameworkCode, levelCode, query, token]);

  useEffect(() => {
    void Promise.all([getAcademicFrameworks(token), getPedagogicalClassificationReview(token)])
      .then(([nextFrameworks, items]) => {
        setFrameworks(nextFrameworks);
        setReview(items);
        setSelectedLevels(Object.fromEntries(items.map((item) => [
          item.resource_id,
          item.classification.effective_level_code ?? '',
        ])));
        return searchPedagogicalResources({framework: frameworkCode, includeCandidates: canSeeCandidates, limit: 8}, token);
      })
      .then((response) => {
        setResults(response.results);
        setStatus(`${response.total} ressource${response.total > 1 ? 's' : ''} affichée${response.total > 1 ? 's' : ''}.`);
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Registre indisponible.'));
  }, [canSeeCandidates, frameworkCode, token]);

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void runSearch();
  };

  const applyClassification = async (item: ReviewItem): Promise<void> => {
    const selected = selectedLevels[item.resource_id] ?? '';
    setStatus(`Mise à jour de ${item.title}…`);
    try {
      await adjustPedagogicalResourceClassification(item.resource_id, {
        framework_code: frameworkCode,
        level_code: selected || null,
        reason: 'Ajustement professeur depuis Teaching',
        lock: true,
      }, token);
      await Promise.all([refreshReview(), runSearch()]);
      setStatus(`Classement de ${item.title} verrouillé.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Classement impossible.');
    }
  };

  return (
    <details className="pedagogical-resource-registry">
      <summary>
        <span><BookOpenCheck size={18} /> Ressources pédagogiques</span>
        <small>{review.length} classement{review.length > 1 ? 's' : ''} à vérifier</small>
      </summary>
      <div className="pedagogical-resource-registry__content">
        <form className="pedagogical-resource-registry__search" onSubmit={submitSearch}>
          <label>
            <Search size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Notion, besoin, logiciel…" value={query} />
          </label>
          <select aria-label="Niveau cible" onChange={(event) => setLevelCode(event.target.value)} value={levelCode}>
            <option value="">Tous les niveaux</option>
            {activeFramework?.levels.map((level) => <option key={level.id} value={level.code}>{level.label}</option>)}
          </select>
          <button type="submit">Chercher</button>
        </form>

        <div className="pedagogical-resource-registry__results">
          {results.map((resource) => (
            <article key={resource.resource_id}>
              <div>
                <strong>{resource.title}</strong>
                <small>{resource.resource_kind} · {resource.classification?.effective_level_code ?? 'transversal'}</small>
              </div>
              <p>{resource.why.slice(0, 2).join(' ')}</p>
              {resource.matched_notions[0] ? (
                <span>{resource.matched_notions[0].label}{resource.matched_notions[0].timestamp_seconds !== null ? ` · ${Math.floor(resource.matched_notions[0].timestamp_seconds / 60)}:${String(resource.matched_notions[0].timestamp_seconds % 60).padStart(2, '0')}` : ''}</span>
              ) : null}
            </article>
          ))}
        </div>

        {review.length > 0 ? (
          <section className="pedagogical-resource-registry__review">
            <header><SlidersHorizontal size={17} /><strong>Classements à confirmer</strong></header>
            {review.slice(0, 20).map((item) => (
              <article key={item.resource_id}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.classification.explanation[0] ?? 'Inférence à vérifier'}</small>
                </div>
                <select
                  aria-label={`Niveau de ${item.title}`}
                  onChange={(event) => setSelectedLevels((current) => ({...current, [item.resource_id]: event.target.value}))}
                  value={selectedLevels[item.resource_id] ?? ''}
                >
                  <option value="">Transversal / aucun niveau</option>
                  {activeFramework?.levels.map((level) => <option key={level.id} value={level.code}>{level.short_label}</option>)}
                </select>
                <button onClick={() => void applyClassification(item)} type="button">Valider</button>
              </article>
            ))}
          </section>
        ) : null}
        <p aria-live="polite" className="muted compact">{status}</p>
      </div>
    </details>
  );
}
