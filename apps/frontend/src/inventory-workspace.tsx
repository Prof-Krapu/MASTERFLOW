import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {
  InventoryCollection,
  InventoryItem,
  InventoryItemStatus,
  InventoryItemType,
  InventoryNeedMatchResult,
  InventorySearchResult,
  Project,
  ProjectMemberRole,
  Role,
} from '@masterflow/shared';
import {
  Archive,
  Boxes,
  Check,
  CircleHelp,
  DatabaseZap,
  FolderKanban,
  LibraryBig,
  ListChecks,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import {
  archiveInventoryItem,
  createInventoryCollection,
  createInventoryItem,
  createInventoryProjectNeed,
  getInventoryCollections,
  getInventoryItems,
  indexInventoryItem,
  matchInventoryProjectNeed,
  searchInventory,
  setInventoryCollectionCompletion,
  validateInventoryCollection,
  validateInventoryItem,
} from './api.ts';
import {
  INVENTORY_STATUS_LABELS,
  INVENTORY_TYPE_LABELS,
  canManageProjectInventory,
  formatInventoryError,
  inventoryCounts,
} from './inventory-runtime.ts';
import type {InventoryScopeMode, InventoryView} from './inventory-runtime.ts';

type InventoryWorkspaceProps = {
  token: string;
  role: Role;
  projects: Project[];
  selectedProjectId: string;
  projectMemberRole: ProjectMemberRole | null;
  onProjectChange: (projectId: string) => void;
};

type OperationState = {
  status: 'idle' | 'loading' | 'working' | 'ready' | 'error';
  message: string;
};

const ITEM_TYPES = Object.keys(INVENTORY_TYPE_LABELS) as InventoryItemType[];
const ITEM_STATUSES: InventoryItemStatus[] = [
  'detected',
  'owned_confirmed',
  'owned_declared',
  'wishlist',
  'loan',
  'sell_or_give',
  'to_verify',
];

const COMPLETION_LABELS: Record<InventoryCollection['completion_state'], string> = {
  unknown: 'Completion inconnue',
  selective: 'Selection volontaire',
  complete_declared: 'Complete declaree',
  abandoned: 'Abandonnee',
};

function tagsFromInput(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 30);
}

function ItemStatus({item}: {item: InventoryItem}): ReactElement {
  return (
    <div className="inventory-item__status">
      <span className={`inventory-badge inventory-badge--${item.validation_status}`}>
        {item.validation_status === 'validated' ? 'Valide' : 'A valider'}
      </span>
      <span className="inventory-badge">{INVENTORY_STATUS_LABELS[item.item_status]}</span>
    </div>
  );
}

export function InventoryWorkspace({
  token,
  role,
  projects,
  selectedProjectId,
  projectMemberRole,
  onProjectChange,
}: InventoryWorkspaceProps): ReactElement {
  const [scope, setScope] = useState<InventoryScopeMode>('personal');
  const [view, setView] = useState<InventoryView>('catalog');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [collections, setCollections] = useState<InventoryCollection[]>([]);
  const [searchResults, setSearchResults] = useState<InventorySearchResult[]>([]);
  const [needResult, setNeedResult] = useState<InventoryNeedMatchResult | null>(null);
  const [operation, setOperation] = useState<OperationState>({
    status: 'idle',
    message: 'Inventaire non charge.',
  });

  const [query, setQuery] = useState('');
  const [itemLabel, setItemLabel] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemType, setItemType] = useState<InventoryItemType>('custom');
  const [itemStatus, setItemStatus] = useState<InventoryItemStatus>('detected');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemTags, setItemTags] = useState('');
  const [itemCollectionId, setItemCollectionId] = useState('');
  const [collectionLabel, setCollectionLabel] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [needLabel, setNeedLabel] = useState('');
  const [needQuantity, setNeedQuantity] = useState(1);
  const [needTags, setNeedTags] = useState('');
  const [needInventoryComplete, setNeedInventoryComplete] = useState(false);

  const project = projects.find((candidate) => candidate.project_id === selectedProjectId) ?? null;
  const projectScopeAvailable = project !== null;
  const canManage = scope === 'personal' || canManageProjectInventory(role, projectMemberRole);
  const effectiveProjectId = scope === 'project' ? selectedProjectId || null : null;
  const counts = useMemo(() => inventoryCounts(items, collections), [collections, items]);
  const candidates = useMemo(
    () => items.filter((item) => item.validation_status === 'candidate'),
    [items],
  );
  const validatedItems = useMemo(
    () => items.filter((item) => item.validation_status === 'validated'),
    [items],
  );
  const validatedCollections = useMemo(
    () => collections.filter((collection) => collection.validation_status === 'validated'),
    [collections],
  );
  const completeCollections = useMemo(
    () => validatedCollections.filter((collection) => collection.completion_state === 'complete_declared'),
    [validatedCollections],
  );
  const sourceRefsCount = useMemo(
    () => items.reduce((total, item) => total + item.source_refs.length, 0),
    [items],
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (scope === 'project' && !selectedProjectId) {
      setItems([]);
      setCollections([]);
      setOperation({status: 'idle', message: 'Selectionnez un projet pour ouvrir son inventaire.'});
      return;
    }
    setOperation({status: 'loading', message: 'Chargement de l inventaire.'});
    try {
      const [nextItems, nextCollections] = await Promise.all([
        getInventoryItems({
          projectId: effectiveProjectId,
          includeCandidates: canManage,
        }, token),
        getInventoryCollections({
          projectId: effectiveProjectId,
          includeCandidates: canManage,
        }, token),
      ]);
      setItems(nextItems);
      setCollections(nextCollections);
      setSearchResults([]);
      setOperation({
        status: 'ready',
        message: `${nextItems.length} item(s), ${nextCollections.length} collection(s).`,
      });
    } catch (error) {
      setItems([]);
      setCollections([]);
      setOperation({status: 'error', message: formatInventoryError(error)});
    }
  }, [canManage, effectiveProjectId, scope, selectedProjectId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (scope === 'project' && !projectScopeAvailable) setScope('personal');
  }, [projectScopeAvailable, scope]);

  useEffect(() => {
    if (scope === 'personal' && view === 'needs') setView('catalog');
  }, [scope, view]);

  const runMutation = useCallback(async (
    label: string,
    mutation: () => Promise<unknown>,
  ): Promise<void> => {
    setOperation({status: 'working', message: label});
    try {
      await mutation();
      await refresh();
      setOperation({status: 'ready', message: `${label} Termine.`});
    } catch (error) {
      setOperation({status: 'error', message: formatInventoryError(error)});
    }
  }, [refresh]);

  const handleSearch = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) {
      setSearchResults([]);
      setOperation({status: 'error', message: 'Saisissez au moins deux caracteres.'});
      return;
    }
    setOperation({status: 'loading', message: 'Recherche dans les items valides.'});
    try {
      const results = await searchInventory(value, effectiveProjectId, token);
      setSearchResults(results);
      setOperation({
        status: 'ready',
        message: results.length > 0
          ? `${results.length} correspondance(s), disponibilite non garantie.`
          : 'Aucune correspondance validee.',
      });
    } catch (error) {
      setOperation({status: 'error', message: formatInventoryError(error)});
    }
  }, [effectiveProjectId, query, token]);

  const handleCreateItem = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const label = itemLabel.trim();
    if (!label) return;
    await runMutation('Creation du candidat.', async () => {
      await createInventoryItem({
        project_id: effectiveProjectId,
        collection_id: itemCollectionId || null,
        type: itemType,
        label,
        creator_or_brand: itemBrand.trim() || null,
        item_status: itemStatus,
        quantity: itemQuantity,
        usage_tags: tagsFromInput(itemTags),
        source_refs: ['frontend:inventory-manual'],
        visibility_scope: effectiveProjectId ? 'project' : 'private',
      }, token);
      setItemLabel('');
      setItemBrand('');
      setItemTags('');
      setItemQuantity(1);
      setView('review');
    });
  }, [
    effectiveProjectId,
    itemBrand,
    itemCollectionId,
    itemLabel,
    itemQuantity,
    itemStatus,
    itemTags,
    itemType,
    runMutation,
    token,
  ]);

  const handleCreateCollection = useCallback(async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const label = collectionLabel.trim();
    if (!label) return;
    await runMutation('Creation de la collection candidate.', async () => {
      await createInventoryCollection({
        project_id: effectiveProjectId,
        label,
        description: collectionDescription.trim() || null,
        visibility_scope: effectiveProjectId ? 'project' : 'private',
      }, token);
      setCollectionLabel('');
      setCollectionDescription('');
    });
  }, [collectionDescription, collectionLabel, effectiveProjectId, runMutation, token]);

  const handleCreateNeed = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!effectiveProjectId || !needLabel.trim()) return;
    setOperation({status: 'working', message: 'Creation et recherche du besoin projet.'});
    try {
      const need = await createInventoryProjectNeed({
        project_id: effectiveProjectId,
        label: needLabel.trim(),
        quantity: needQuantity,
        required_tags: tagsFromInput(needTags),
      }, token);
      const result = await matchInventoryProjectNeed(need.need_id, {
        inventory_complete_declared: needInventoryComplete,
        limit: 10,
      }, token);
      setNeedResult(result);
      setNeedLabel('');
      setNeedTags('');
      setNeedQuantity(1);
      setNeedInventoryComplete(false);
      setOperation({
        status: 'ready',
        message: result.coverage_state === 'candidate_available'
          ? 'Des items candidats sont declares disponibles, sans garantie de reservation.'
          : result.coverage_state === 'missing'
            ? 'Besoin marque manquant sur inventaire declare complet.'
            : 'Couverture inconnue : inventaire non declare complet.',
      });
    } catch (error) {
      setOperation({status: 'error', message: formatInventoryError(error)});
    }
  }, [effectiveProjectId, needInventoryComplete, needLabel, needQuantity, needTags, token]);

  const displayedItems = searchResults.length > 0
    ? searchResults.map((result) => result.item)
    : validatedItems;

  return (
    <article className="panel panel--wide inventory-workspace">
      <header className="inventory-header">
        <div>
          <p className="eyebrow">Inventory runtime</p>
          <h2>Inventaire</h2>
          <p className="muted compact">
            Objets valides, collections et besoins. Les nouvelles entrees restent candidates.
          </p>
        </div>
        <button
          aria-label="Rafraichir l inventaire"
          className="icon-button secondary"
          disabled={operation.status === 'loading' || operation.status === 'working'}
          onClick={() => void refresh()}
          title="Rafraichir"
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} />
        </button>
      </header>

      <div className="inventory-toolbar">
        <div className="segmented-control" aria-label="Scope inventaire">
          <button
            className={scope === 'personal' ? 'is-active' : ''}
            onClick={() => setScope('personal')}
            type="button"
          >
            <UserRound aria-hidden="true" size={16} />
            Personnel
          </button>
          <button
            className={scope === 'project' ? 'is-active' : ''}
            disabled={!projectScopeAvailable}
            onClick={() => setScope('project')}
            type="button"
          >
            <FolderKanban aria-hidden="true" size={16} />
            Projet
          </button>
        </div>
        {scope === 'project' && projectScopeAvailable ? (
          <label className="inventory-project-select">
            <span>Projet</span>
            <select onChange={(event) => onProjectChange(event.target.value)} value={selectedProjectId}>
              {projects.map((candidate) => (
                <option key={candidate.project_id} value={candidate.project_id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className={`inventory-operation inventory-operation--${operation.status}`} aria-live="polite">
        <strong>{canManage ? 'Edition autorisee' : 'Lecture seule'}</strong>
        <span>{operation.message}</span>
      </div>

      <div className="inventory-metrics" aria-label="Resume inventaire">
        <div><span>Valides</span><strong>{counts.validated}</strong></div>
        <div><span>A valider</span><strong>{counts.candidates}</strong></div>
        <div><span>Collections</span><strong>{counts.collections}</strong></div>
        <div><span>Declares disponibles</span><strong>{counts.declaredAvailable}</strong></div>
      </div>

      <div className="inventory-scope-deck" aria-label="Etat du scope inventaire">
        <div>
          <span>Scope</span>
          <strong>{scope === 'project' ? project?.name ?? 'Projet' : 'Personnel'}</strong>
        </div>
        <div>
          <span>Collections completes</span>
          <strong>{completeCollections.length}/{validatedCollections.length}</strong>
        </div>
        <div>
          <span>Sources tracees</span>
          <strong>{sourceRefsCount}</strong>
        </div>
        <div>
          <span>Regle RAG</span>
          <strong>Valides seulement</strong>
        </div>
      </div>

      <nav className="inventory-tabs" aria-label="Vues inventaire">
        <button className={view === 'catalog' ? 'is-active' : ''} onClick={() => setView('catalog')} type="button">
          <PackageOpen aria-hidden="true" size={17} />
          Catalogue
        </button>
        <button className={view === 'review' ? 'is-active' : ''} onClick={() => setView('review')} type="button">
          <ShieldCheck aria-hidden="true" size={17} />
          Validation
          {candidates.length > 0 ? <span>{candidates.length}</span> : null}
        </button>
        <button className={view === 'collections' ? 'is-active' : ''} onClick={() => setView('collections')} type="button">
          <LibraryBig aria-hidden="true" size={17} />
          Collections
        </button>
        {scope === 'project' ? (
          <button className={view === 'needs' ? 'is-active' : ''} onClick={() => setView('needs')} type="button">
            <CircleHelp aria-hidden="true" size={17} />
            Besoins
          </button>
        ) : null}
      </nav>

      {view === 'catalog' ? (
        <section className="inventory-pane">
          <form className="inventory-search" onSubmit={handleSearch}>
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="Rechercher dans l inventaire"
              onChange={(event) => {
                setQuery(event.target.value);
                if (!event.target.value) setSearchResults([]);
              }}
              placeholder="Camera, pigment, livre..."
              type="search"
              value={query}
            />
            <button disabled={query.trim().length < 2} type="submit">Chercher</button>
          </form>

          {canManage ? (
            <details className="inventory-create">
              <summary><Plus aria-hidden="true" size={17} /> Ajouter un item</summary>
              <form className="inventory-item-form" onSubmit={handleCreateItem}>
                <label>Nom<input aria-label="Nom" onChange={(event) => setItemLabel(event.target.value)} required value={itemLabel} /></label>
                <label>Type<select aria-label="Type" onChange={(event) => setItemType(event.target.value as InventoryItemType)} value={itemType}>
                  {ITEM_TYPES.map((type) => <option key={type} value={type}>{INVENTORY_TYPE_LABELS[type]}</option>)}
                </select></label>
                <label>Etat declare<select aria-label="Etat declare" onChange={(event) => setItemStatus(event.target.value as InventoryItemStatus)} value={itemStatus}>
                  {ITEM_STATUSES.map((status) => <option key={status} value={status}>{INVENTORY_STATUS_LABELS[status]}</option>)}
                </select></label>
                <label>Quantite<input aria-label="Quantite" min={1} onChange={(event) => setItemQuantity(Number(event.target.value))} type="number" value={itemQuantity} /></label>
                <label>Marque / auteur<input aria-label="Marque / auteur" onChange={(event) => setItemBrand(event.target.value)} value={itemBrand} /></label>
                <label>Tags<input aria-label="Tags" onChange={(event) => setItemTags(event.target.value)} placeholder="atelier, photo" value={itemTags} /></label>
                <label>Collection<select aria-label="Collection" onChange={(event) => setItemCollectionId(event.target.value)} value={itemCollectionId}>
                  <option value="">Aucune</option>
                  {validatedCollections.map((collection) => <option key={collection.collection_id} value={collection.collection_id}>{collection.label}</option>)}
                </select></label>
                <button disabled={operation.status === 'working'} type="submit"><Plus aria-hidden="true" size={17} /> Creer comme candidat</button>
              </form>
            </details>
          ) : null}

          <div className="inventory-list">
            {displayedItems.length > 0 ? displayedItems.map((item) => (
              <article className="inventory-item" key={item.item_id}>
                <div className="inventory-item__main">
                  <Boxes aria-hidden="true" size={20} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>
                      {INVENTORY_TYPE_LABELS[item.type]} · quantite {item.quantity}
                      {item.creator_or_brand ? ` · ${item.creator_or_brand}` : ''}
                    </span>
                    {item.usage_tags.length > 0 ? <small>{item.usage_tags.join(' · ')}</small> : null}
                  </div>
                </div>
                <ItemStatus item={item} />
                <div className="inventory-item__meta" aria-label={`Provenance ${item.label}`}>
                  <span>{item.visibility_scope === 'project' ? 'Projet' : 'Prive'}</span>
                  <span>{item.source_refs.length > 0 ? item.source_refs[0] : 'Source absente'}</span>
                </div>
                {canManage ? (
                  <div className="inventory-item__actions">
                    <button
                      className="secondary"
                      onClick={() => void runMutation('Indexation RAG.', () => indexInventoryItem(item.item_id, token))}
                      type="button"
                    >
                      <DatabaseZap aria-hidden="true" size={16} /> Indexer
                    </button>
                    <button
                      className="secondary danger-button"
                      onClick={() => void runMutation('Archivage.', () => archiveInventoryItem(item.item_id, token))}
                      type="button"
                    >
                      <Archive aria-hidden="true" size={16} /> Archiver
                    </button>
                  </div>
                ) : null}
              </article>
            )) : (
              <div className="inventory-empty">
                <PackageOpen aria-hidden="true" size={28} />
                <strong>Aucun item valide</strong>
                <span>{canManage ? 'Ajoutez un candidat puis validez-le.' : 'Aucun item partage dans ce scope.'}</span>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {view === 'review' ? (
        <section className="inventory-pane">
          <div className="inventory-pane__heading">
            <div><h3>Validation des candidats</h3><p className="muted compact">OCR ou saisie manuelle : rien n entre dans le RAG avant validation.</p></div>
            <span className="counter">{candidates.length}</span>
          </div>
          {canManage ? (
            <div className="inventory-list">
              {candidates.length > 0 ? candidates.map((item) => (
                <article className="inventory-item inventory-item--candidate" key={item.item_id}>
                  <div className="inventory-item__main">
                    <ShieldCheck aria-hidden="true" size={20} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{INVENTORY_TYPE_LABELS[item.type]} · {INVENTORY_STATUS_LABELS[item.item_status]}</span>
                      <small>{item.source_refs.join(' · ') || 'source non renseignee'}</small>
                    </div>
                  </div>
                  <div className="inventory-item__actions">
                    <button
                      onClick={() => void runMutation('Validation de l item.', () => validateInventoryItem(item.item_id, token))}
                      type="button"
                    >
                      <Check aria-hidden="true" size={16} /> Valider
                    </button>
                    <button
                      className="secondary danger-button"
                      onClick={() => void runMutation('Archivage du candidat.', () => archiveInventoryItem(item.item_id, token))}
                      type="button"
                    >
                      <Archive aria-hidden="true" size={16} /> Ecarter
                    </button>
                  </div>
                </article>
              )) : <div className="inventory-empty"><ShieldCheck aria-hidden="true" size={28} /><strong>File vide</strong><span>Aucun candidat a examiner.</span></div>}
            </div>
          ) : (
            <div className="inventory-empty"><ShieldCheck aria-hidden="true" size={28} /><strong>Lecture seule</strong><span>Les candidats ne sont visibles qu aux editeurs du scope.</span></div>
          )}
        </section>
      ) : null}

      {view === 'collections' ? (
        <section className="inventory-pane">
          {canManage ? (
            <form className="inventory-collection-form" onSubmit={handleCreateCollection}>
              <label>Nouvelle collection<input aria-label="Nouvelle collection" onChange={(event) => setCollectionLabel(event.target.value)} required value={collectionLabel} /></label>
              <label>Description<input aria-label="Description collection" onChange={(event) => setCollectionDescription(event.target.value)} value={collectionDescription} /></label>
              <button disabled={operation.status === 'working'} type="submit"><Plus aria-hidden="true" size={17} /> Creer</button>
            </form>
          ) : null}
          <div className="inventory-collection-list">
            {collections.length > 0 ? collections.map((collection) => (
              <article className="inventory-collection" key={collection.collection_id}>
                <div>
                  <LibraryBig aria-hidden="true" size={20} />
                  <div>
                    <strong>{collection.label}</strong>
                    <span>{collection.description ?? 'Sans description'}</span>
                    <small>{COMPLETION_LABELS[collection.completion_state]}</small>
                  </div>
                </div>
                <span className={`inventory-badge inventory-badge--${collection.validation_status}`}>{collection.validation_status}</span>
                {canManage ? (
                  <div className="inventory-collection__actions">
                    {collection.validation_status === 'candidate' ? (
                      <button onClick={() => void runMutation('Validation de la collection.', () => validateInventoryCollection(collection.collection_id, token))} type="button">
                        <Check aria-hidden="true" size={16} /> Valider
                      </button>
                    ) : (
                      <select
                        aria-label={`Completion ${collection.label}`}
                        onChange={(event) => void runMutation(
                          'Mise a jour de la completion.',
                          () => setInventoryCollectionCompletion(
                            collection.collection_id,
                            {completion_state: event.target.value as InventoryCollection['completion_state']},
                            token,
                          ),
                        )}
                        value={collection.completion_state}
                      >
                        {Object.entries(COMPLETION_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : null}
              </article>
            )) : <div className="inventory-empty"><LibraryBig aria-hidden="true" size={28} /><strong>Aucune collection</strong><span>Les collections regroupent les items sans changer leur ownership.</span></div>}
          </div>
        </section>
      ) : null}

      {view === 'needs' ? (
        <section className="inventory-pane">
          {canManage && effectiveProjectId ? (
            <form className="inventory-need-form" onSubmit={handleCreateNeed}>
              <label>Besoin projet<input aria-label="Besoin projet" onChange={(event) => setNeedLabel(event.target.value)} placeholder="Objectif anamorphique" required value={needLabel} /></label>
              <label>Quantite<input aria-label="Quantite besoin" min={1} onChange={(event) => setNeedQuantity(Number(event.target.value))} type="number" value={needQuantity} /></label>
              <label>Tags requis<input aria-label="Tags requis" onChange={(event) => setNeedTags(event.target.value)} placeholder="cinema, tournage" value={needTags} /></label>
              <label className="inventory-toggle">
                <input
                  checked={needInventoryComplete}
                  onChange={(event) => setNeedInventoryComplete(event.target.checked)}
                  type="checkbox"
                />
                Inventaire declare complet
              </label>
              <button disabled={operation.status === 'working'} type="submit"><Search aria-hidden="true" size={17} /> Evaluer</button>
            </form>
          ) : (
            <div className="inventory-empty"><CircleHelp aria-hidden="true" size={28} /><strong>Lecture seule</strong><span>La creation de besoins est reservee aux editeurs du projet.</span></div>
          )}
          {needResult ? (
            <div className="inventory-need-result">
              <div>
                <strong>{needResult.need.label}</strong>
                <span>
                  {needResult.coverage_state === 'candidate_available'
                    ? 'Candidat disponible'
                    : needResult.coverage_state === 'missing'
                      ? 'Manquant declare'
                      : 'Couverture inconnue'}
                </span>
              </div>
              <p>Disponibilite garantie : non. Une reservation ou verification reste necessaire.</p>
              {needResult.matches.length > 0 ? needResult.matches.map((match) => (
                <article className="inventory-need-match" key={match.item.item_id}>
                  <strong>{match.item.label}</strong>
                  <span>{Math.round(match.score * 100)}% · {match.availability_state}</span>
                </article>
              )) : (
                <article className="inventory-need-match inventory-need-match--empty">
                  <ListChecks aria-hidden="true" size={16} />
                  <span>Aucun item valide ne couvre ce besoin.</span>
                </article>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
