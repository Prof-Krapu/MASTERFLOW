import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Code2,
  Compass,
  ExternalLink,
  FileSearch,
  GitBranch,
  Handshake,
  Layers3,
  LoaderCircle,
  Menu,
  PackageCheck,
  PanelLeftClose,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { masterbuildApi } from "./api";
import type {
  DesignPreflight,
  Handoff,
  LocalProfile,
  MasterbuildStatus,
  SensitiveAction
} from "./types";

type ViewId =
  | "cockpit"
  | "goals"
  | "domains"
  | "lab"
  | "git"
  | "research"
  | "team"
  | "housekeeping"
  | "resume";

const navItems: Array<{
  id: ViewId;
  label: string;
  icon: typeof Compass;
}> = [
  { id: "cockpit", label: "Cockpit", icon: Compass },
  { id: "domains", label: "Carte fonctionnelle", icon: Layers3 },
  { id: "goals", label: "Workboard", icon: Target },
  { id: "lab", label: "Intégration UI", icon: Code2 },
  { id: "research", label: "Philosophie & Design", icon: Sparkles },
  { id: "team", label: "Équipe", icon: Users },
  { id: "housekeeping", label: "Sources & Cohérence", icon: Archive },
  { id: "git", label: "Release", icon: GitBranch }
];

const viewTitles: Record<ViewId, string> = {
  cockpit: "Prochaine action",
  goals: "Travail partagé",
  domains: "Fonctionnalités MasterFlow",
  lab: "Lab, prototype et runtime",
  git: "Publication et preuves",
  research: "Règles produit et UI",
  team: "MALEX, Vincent et agents",
  housekeeping: "Provenance et cohérence",
  resume: "Handoff et reprise"
};

function StatusPill({
  tone,
  children
}: {
  tone: "good" | "warn" | "muted" | "danger";
  children: React.ReactNode;
}) {
  return <span className={`mb-pill mb-pill--${tone}`}>{children}</span>;
}

function LoadingScreen() {
  return (
    <main className="mb-loading">
      <LoaderCircle className="mb-spin" aria-hidden="true" />
      <strong>MASTERBUILD s’oriente…</strong>
      <span>État partagé, Git et environnement local.</span>
    </main>
  );
}

function Onboarding({
  sharedProfiles,
  profileAudits,
  onSave
}: {
  sharedProfiles: MasterbuildStatus["state"]["shared_profiles"];
  profileAudits: MasterbuildStatus["profile_audits"];
  onSave: (profile: Partial<LocalProfile>) => Promise<void>;
}) {
  const [profileId, setProfileId] = useState<"malex" | "vincent">("malex");
  const [guidance, setGuidance] =
    useState<LocalProfile["guidance"]>("assisted");
  const [verification, setVerification] =
    useState<LocalProfile["verification"]>("human_first");
  const [saving, setSaving] = useState(false);
  const [currentFocus, setCurrentFocus] = useState("");
  const [frictionNote, setFrictionNote] = useState("");

  const selected = sharedProfiles.find((profile) => profile.profile_id === profileId);
  const audit = profileAudits.find((profile) => profile.profile_id === profileId);

  async function submit() {
    setSaving(true);
    await onSave({
      profile_id: profileId,
      guidance,
      verification,
      context_percent: 0,
      current_focus: currentFocus,
      friction_note: frictionNote
    }).finally(() => setSaving(false));
  }

  return (
    <div className="mb-onboarding">
      <section className="mb-onboarding__panel">
        <span className="mb-kicker">Premier boot local</span>
        <h1>Qui pilote aujourd’hui ?</h1>
        <p>
          L’objectif est partagé. Vos préférences de guidance restent sur cette
          machine.
        </p>

        <div className="mb-choice-grid">
          {sharedProfiles.map((profile) => (
            <button
              className={`mb-profile-choice ${
                profileId === profile.profile_id ? "is-selected" : ""
              }`}
              key={profile.profile_id}
              onClick={() => {
                setProfileId(profile.profile_id);
                setGuidance(profile.default_guidance);
              }}
              type="button"
            >
              <span>{profile.display_name}</span>
              <small>{profile.ownership.join(" · ")}</small>
            </button>
          ))}
        </div>

        <label className="mb-field">
          <span>Accompagnement</span>
          <select
            value={guidance}
            onChange={(event) =>
              setGuidance(event.target.value as LocalProfile["guidance"])
            }
          >
            <option value="guided">Guidé — étapes très explicites</option>
            <option value="assisted">Assisté — recommandations courtes</option>
            <option value="fast">Rapide — preuves et actions</option>
          </select>
        </label>

        <label className="mb-field">
          <span>Vérification</span>
          <select
            value={verification}
            onChange={(event) =>
              setVerification(
                event.target.value as LocalProfile["verification"]
              )
            }
          >
            <option value="human_first">Humain d’abord pour le visuel</option>
            <option value="balanced">Équilibrée</option>
          </select>
        </label>

        <div className="mb-onboarding__summary">
          <ShieldCheck aria-hidden="true" />
          <span>
            Profil prérempli : <strong>{audit?.role ?? selected?.ownership.join(", ")}</strong>.
          </span>
        </div>

        <label className="mb-field">
          <span>Focus du moment</span>
          <input
            onChange={(event) => setCurrentFocus(event.target.value)}
            placeholder="Ex. backend, UI, intégration…"
            value={currentFocus}
          />
        </label>

        <label className="mb-field">
          <span>Friction à éviter</span>
          <input
            onChange={(event) => setFrictionNote(event.target.value)}
            placeholder="Une phrase suffit"
            value={frictionNote}
          />
        </label>

        <button
          className="mb-primary"
          disabled={saving}
          onClick={submit}
          type="button"
        >
          {saving ? "Enregistrement…" : "Entrer dans MASTERBUILD"}
          <ChevronRight aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}

function StepRail({ status }: { status: MasterbuildStatus }) {
  return (
    <ol className="mb-step-rail" aria-label="Progression MASTERBUILD">
      {status.state.stages.map((stage) => (
        <li className={`is-${stage.status}`} key={stage.id}>
          <span className="mb-step-rail__marker">
            {stage.status === "completed" ? <Check aria-hidden="true" /> : stage.index}
          </span>
          <span className="mb-step-rail__label">{stage.label}</span>
        </li>
      ))}
    </ol>
  );
}

function CockpitView({
  status,
  onContextChange,
  onNavigate
}: {
  status: MasterbuildStatus;
  onContextChange: (value: number) => Promise<void>;
  onNavigate: (view: ViewId) => void;
}) {
  const goal = status.state.active_round;
  const currentProfile = status.state.shared_profiles.find(
    (profile) => profile.profile_id === status.profile?.profile_id
  );
  const nextAction = goal.recommended_next_action;

  return (
    <div className="mb-view mb-view--cockpit">
      <section className="mb-focus-band">
        <div>
          <span className="mb-kicker">
            MASTERBUILD · Round {goal.stage_index}/8 · {goal.stage_label}
          </span>
          <h2>{goal.stage_label}</h2>
          <p>{nextAction}</p>
        </div>
        <CircleDot aria-hidden="true" />
      </section>

      <section className="mb-split">
        <div className="mb-section">
          <div className="mb-section__heading">
            <div>
              <span className="mb-kicker">Répartition de la preuve</span>
              <h3>Qui vérifie quoi ?</h3>
            </div>
            <ClipboardCheck aria-hidden="true" />
          </div>
          <div className="mb-proof-grid">
            <div>
              <strong>{currentProfile?.display_name ?? "Humain"} vérifie</strong>
              <span>Rendu, ressenti, clarté et décision produit.</span>
            </div>
            <div>
              <strong>Codex vérifie</strong>
              <span>Contrats, fichiers, Git et tests ciblés.</span>
            </div>
          </div>
        </div>

        <div className="mb-section">
          <div className="mb-section__heading">
            <div>
              <span className="mb-kicker">Drive gauge · contexte Codex</span>
              <h3>{status.context.label}</h3>
            </div>
            <span className="mb-context-value">
              {status.profile?.context_percent ?? 0}%
            </span>
          </div>
          <input
            aria-label="Pourcentage de contexte indiqué par la commande status"
            className="mb-range"
            max="100"
            min="0"
            onChange={(event) => onContextChange(Number(event.target.value))}
            step="5"
            type="range"
            value={status.profile?.context_percent ?? 0}
          />
          <p className="mb-note">
            Valeur reportée depuis <code>/status</code>. {status.context.message}
          </p>
        </div>
      </section>

      <section className="mb-metric-grid" aria-label="Résumé fonctionnel MasterFlow">
        <button onClick={() => onNavigate("domains")} type="button">
          <strong>{status.feature_summary.total}</strong>
          <span>fonctionnalités suivies</span>
        </button>
        <button onClick={() => onNavigate("domains")} type="button">
          <strong>{status.feature_summary.backend.verified ?? 0}</strong>
          <span>backend vérifiées</span>
        </button>
        <button onClick={() => onNavigate("lab")} type="button">
          <strong>
            {(status.feature_summary.ui.connected ?? 0) +
              (status.feature_summary.ui.verified ?? 0)}
          </strong>
          <span>UI connectées</span>
        </button>
        <button onClick={() => onNavigate("domains")} type="button">
          <strong>{status.feature_summary.likely_missing}</strong>
          <span>raccords à surveiller</span>
        </button>
      </section>

      <section className="mb-section mb-section--actions">
        <div className="mb-section__heading">
          <div>
            <span className="mb-kicker">Choix bornés · attente du GO</span>
            <h3>Quelle suite lancer ?</h3>
          </div>
        </div>
        <div className="mb-action-list">
          {status.state.next_moves.map((move) => (
            <button onClick={() => onNavigate("goals")} type="button" key={move.move_id}>
              <CircleDot aria-hidden="true" />
              <span>
                <strong>
                  {move.label}
                  {move.recommended ? " · recommandé" : ""}
                </strong>
                <small>{move.reason}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="mb-section mb-section--actions">
        <div className="mb-section__heading">
          <div>
            <span className="mb-kicker">État simple</span>
            <h3>Ce qui accompagne le Round</h3>
          </div>
        </div>
        <div className="mb-action-list">
          <button onClick={() => onNavigate("git")} type="button">
            <GitBranch aria-hidden="true" />
            <span>
              <strong>{status.git.files.length} changements locaux</strong>
              <small>À classer, pas à publier automatiquement</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button onClick={() => onNavigate("housekeeping")} type="button">
            <Archive aria-hidden="true" />
            <span>
              <strong>{status.findings.length} éléments à surveiller</strong>
              <small>Candidats, sources protégées et ménage préparé</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button onClick={() => onNavigate("git")} type="button">
            <PackageCheck aria-hidden="true" />
            <span>
              <strong>Reprise portable</strong>
              <small>Préparer un handoff avant de changer de thread</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

function GoalsView({
  status,
  onStageChange,
  onWorkPackageUpdate
}: {
  status: MasterbuildStatus;
  onStageChange: (stage: number) => Promise<void>;
  onWorkPackageUpdate: (workPackageId: string, nextStatus: string) => Promise<void>;
}) {
  const goal = status.state.active_round;
  return (
    <div className="mb-view">
      <section className="mb-goal-header">
        <div>
          <span className="mb-kicker">{goal.round_id}</span>
          <h2>{goal.title}</h2>
        </div>
        <StatusPill tone={goal.status === "blocked" ? "danger" : "good"}>
          {goal.status}
        </StatusPill>
      </section>
      <section className="mb-section">
        <div className="mb-section__heading">
          <h3>Réussite attendue</h3>
        </div>
        <ul className="mb-check-list">
          {goal.success_criteria.map((criterion) => (
            <li key={criterion}>
              <Check aria-hidden="true" />
              {criterion}
            </li>
          ))}
        </ul>
      </section>
      <section className="mb-workboard">
        {status.workboard.work_packages.map((workPackage) => (
          <article className={`is-${workPackage.status}`} key={workPackage.work_package_id}>
            <div className="mb-workboard__status">
              <span>{workPackage.work_package_id}</span>
              <StatusPill
                tone={
                  workPackage.status === "completed"
                    ? "good"
                    : workPackage.status === "blocked"
                      ? "danger"
                      : workPackage.status === "in_progress"
                        ? "warn"
                        : "muted"
                }
              >
                {workPackage.status}
              </StatusPill>
            </div>
            <h3>{workPackage.label}</h3>
            <p>
              Owner : <strong>{workPackage.owner}</strong> · outil :{" "}
              <strong>{workPackage.tool_route}</strong>
            </p>
            <small>
              Preuves : {workPackage.expected_evidence.join(" · ")}
            </small>
            <button
              onClick={() =>
                onWorkPackageUpdate(
                  workPackage.work_package_id,
                  workPackage.status === "completed" ? "in_progress" : "completed"
                )
              }
              type="button"
            >
              {workPackage.status === "completed" ? "Rouvrir" : "Marquer terminé"}
            </button>
          </article>
        ))}
      </section>
      <section className="mb-stage-controls">
        <button
          disabled={goal.stage_index <= 1}
          onClick={() => onStageChange(goal.stage_index - 1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" />
          Étape précédente
        </button>
        <div>
          <strong>{goal.stage_index}/8</strong>
          <span>{goal.stage_label}</span>
        </div>
        <button
          disabled={goal.stage_index >= 8}
          onClick={() => onStageChange(goal.stage_index + 1)}
          type="button"
        >
          Étape suivante
          <ArrowRight aria-hidden="true" />
        </button>
      </section>
      <p className="mb-warning">
        Changer d’étape met à jour l’état partagé dans Git, mais ne crée aucun commit.
      </p>
    </div>
  );
}

function DomainsView({ status }: { status: MasterbuildStatus }) {
  const [filter, setFilter] = useState("all");
  const features = status.feature_registry.filter(
    (feature) =>
      filter === "all" ||
      feature.domain === filter ||
      feature.product_state === filter ||
      feature.ui_state === filter
  );
  return (
    <div className="mb-view">
      <div className="mb-filter-bar">
        <p>
          Une fonctionnalité peut être validée produit sans être branchée, ou
          exister en backend sans interface exploitable.
        </p>
        <label>
          <span>Filtrer</span>
          <select onChange={(event) => setFilter(event.target.value)} value={filter}>
            <option value="all">Tout</option>
            <option value="validated">Produit validé</option>
            <option value="future">Futur</option>
            <option value="prototype">UI prototype</option>
            <option value="connected">UI connectée</option>
            {Array.from(new Set(status.feature_registry.map((feature) => feature.domain))).map(
              (domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              )
            )}
          </select>
        </label>
      </div>
      <section className="mb-feature-list">
        {features.map((feature) => (
          <article key={feature.feature_id}>
            <div className="mb-feature-list__title">
              <span>{feature.domain}</span>
              <h3>{feature.label}</h3>
              <small>{feature.owner}</small>
            </div>
            <div className="mb-state-strip">
              <span>Produit · {feature.product_state}</span>
              <span>Backend · {feature.backend_state}</span>
              <span>UI · {feature.ui_state}</span>
              <span>Release · {feature.release_state}</span>
            </div>
            <p>{feature.next_action}</p>
            <details>
              <summary>Manques et risque</summary>
              <p>{feature.missing.join(" · ") || "Aucun manque déclaré."}</p>
              <small>{feature.risk}</small>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}

function LabView({ status }: { status: MasterbuildStatus }) {
  const layers = [
    {
      label: "Component Lab",
      status: "Travail isolé",
      description: "Composants, états, responsive et profils sans backend.",
      href: "http://127.0.0.1:5174/ui-lab"
    },
    {
      label: "Prototype UI",
      status: "Validation d’expérience",
      description: "Navigation et scènes assemblées, encore séparées du runtime.",
      href: "http://127.0.0.1:5174/ui-reset"
    },
    {
      label: "Runtime",
      status: "Promotion contrôlée",
      description: "Contrats réels, permissions, données et preuves de livraison.",
      href: null
    }
  ];
  return (
    <div className="mb-view">
      <p className="mb-intro">
        Le passage d’une couche à la suivante demande une décision. Une réussite
        dans le Lab n’est pas encore une fonctionnalité produit.
      </p>
      <section className="mb-promotion-flow">
        {layers.map((layer, index) => (
          <div className="mb-promotion-step" key={layer.label}>
            <span>{index + 1}</span>
            <div>
              <small>{layer.status}</small>
              <h3>{layer.label}</h3>
              <p>{layer.description}</p>
            </div>
            {layer.href ? (
              <a href={layer.href} rel="noreferrer" target="_blank">
                Ouvrir <ExternalLink aria-hidden="true" />
              </a>
            ) : (
              <StatusPill tone="muted">Après audit</StatusPill>
            )}
          </div>
        ))}
      </section>
      <section className="mb-section">
        <div className="mb-section__heading">
          <div>
            <span className="mb-kicker">État des surfaces</span>
            <h3>Ce qui doit encore traverser la chaîne</h3>
          </div>
        </div>
        <div className="mb-ui-promotion-list">
          {status.feature_registry
            .filter((feature) => feature.ui_state !== "absent")
            .map((feature) => (
              <article key={feature.feature_id}>
                <strong>{feature.label}</strong>
                <span className="mb-ui-steps">
                  <i className={["lab", "prototype", "connected", "verified"].includes(feature.ui_state) ? "is-done" : ""}>Lab</i>
                  <i className={["prototype", "connected", "verified"].includes(feature.ui_state) ? "is-done" : ""}>Proto</i>
                  <i className={["connected", "verified"].includes(feature.ui_state) ? "is-done" : ""}>Runtime</i>
                  <i className={feature.ui_state === "verified" ? "is-done" : ""}>Vérifié</i>
                </span>
                <small>{feature.next_action}</small>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}

function GitView({
  status,
  onPrepare,
  onPrepareExport,
  onPrepareHandoff,
  exportResult
}: {
  status: MasterbuildStatus;
  onPrepare: (action: string) => Promise<void>;
  onPrepareExport: () => Promise<void>;
  onPrepareHandoff: () => Promise<void>;
  exportResult: string | null;
}) {
  const authorization = status.workboard.authorizations.find(
    (item) =>
      item.round_id === status.state.active_round.round_id && item.status === "active"
  );
  return (
    <div className="mb-view">
      <section className="mb-git-summary">
        <div>
          <small>Branche locale</small>
          <strong>{status.git.branch}</strong>
        </div>
        <div>
          <small>Synchronisation</small>
          <strong>
            +{status.git.ahead} / -{status.git.behind}
          </strong>
        </div>
        <div>
          <small>Fichiers locaux</small>
          <strong>{status.git.files.length}</strong>
        </div>
        <div>
          <small>Publication</small>
          <strong>{status.state.publication.state}</strong>
        </div>
      </section>
      <section className="mb-authorization">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>
            {authorization
              ? "GO Round actif jusqu’à la draft PR"
              : "Aucune autorisation de publication active"}
          </strong>
          <span>
            {authorization
              ? `Exclus : ${authorization.excluded.join(" · ")}`
              : "Commit, push et PR restent bloqués."}
          </span>
        </div>
      </section>
      <section className="mb-section">
        <div className="mb-section__heading">
          <div>
            <span className="mb-kicker">Périmètre local</span>
            <h3>Changements détectés</h3>
          </div>
        </div>
        <div className="mb-file-list">
          {status.git.files.map((file) => (
            <div key={`${file.status}-${file.path}`}>
              <code>{file.status.trim() || "M"}</code>
              <span>{file.path}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="mb-button-row">
        <button
          className="is-primary"
          onClick={() => onPrepare("release")}
          type="button"
        >
          Préparer toute la séquence
        </button>
        <button onClick={() => onPrepare("commit")} type="button">
          Préparer le commit
        </button>
        <button onClick={() => onPrepare("push")} type="button">
          Préparer le push
        </button>
        <button onClick={() => onPrepare("pr")} type="button">
          Préparer la PR
        </button>
        <button onClick={() => onPrepare("merge")} type="button">
          Préparer le merge
        </button>
        <button onClick={onPrepareExport} type="button">
          Export multi-IA
        </button>
        <button onClick={onPrepareHandoff} type="button">
          Handoff local
        </button>
      </div>
      <p className="mb-warning">
        Ces boutons montrent la portée et le risque. Ils n’exécutent aucune
        commande Git.
      </p>
      <section className="mb-release-flow">
        {["Périmètre", "Tests", "Commit", "Push", "PR + revue", "Merge + preuve"].map(
          (step, index) => (
            <div key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          )
        )}
      </section>
      {exportResult && <p className="mb-note">Export prêt : <code>{exportResult}</code></p>}
    </div>
  );
}

function ResearchView({
  status,
  preflight,
  onGeneratePreflight
}: {
  status: MasterbuildStatus;
  preflight: DesignPreflight | null;
  onGeneratePreflight: (surface: string, audience: string) => Promise<void>;
}) {
  const [surface, setSurface] = useState("navigation");
  const [audience, setAudience] = useState("all");
  return (
    <div className="mb-view">
      <section className="mb-research-rule">
        <Sparkles aria-hidden="true" />
        <div>
          <h3>MUI inspire l’ergonomie, pas la DA</h3>
          <p>
            Les principes sont condensés ici. Les agents ne relisent pas tous les
            PDF avant chaque composant.
          </p>
        </div>
      </section>
      <form
        className="mb-preflight-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onGeneratePreflight(surface, audience);
        }}
      >
        <label>
          <span>Surface</span>
          <select onChange={(event) => setSurface(event.target.value)} value={surface}>
            <option value="navigation">Navigation</option>
            <option value="command_dock">Command Dock</option>
            <option value="home">Home</option>
            <option value="teaching">Teaching</option>
            <option value="global">Global</option>
          </select>
        </label>
        <label>
          <span>Utilisateur</span>
          <select onChange={(event) => setAudience(event.target.value)} value={audience}>
            <option value="all">Tous</option>
            <option value="student">Élève</option>
            <option value="teacher">Professeur</option>
            <option value="supervision">Supervision</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit">Générer le Design Preflight</button>
      </form>
      {preflight && (
        <section className="mb-preflight-output">
          <div>
            <span className="mb-kicker">{preflight.surface} · {preflight.audience}</span>
            <h3>Brief avant modification</h3>
            <p>{preflight.context}</p>
          </div>
          <div className="mb-preflight-columns">
            <div>
              <strong>Décisions verrouillées</strong>
              <ul>{preflight.locked_decisions.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <strong>Zones libres</strong>
              <ul>{preflight.free_zones.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
          <small>
            Revue MALEX : {preflight.validations.malex} · Revue Vincent :{" "}
            {preflight.validations.vincent}
          </small>
        </section>
      )}
      <section className="mb-design-rule-grid">
        {status.design_rules.map((rule) => (
          <article key={rule.rule_id}>
            <div>
              <span>{rule.rule_id}</span>
              <StatusPill tone={rule.status === "canon" ? "good" : "muted"}>
                {rule.status}
              </StatusPill>
            </div>
            <h3>{rule.title}</h3>
            <p>{rule.intent}</p>
            <small>Contrôles : {rule.checks.join(" · ")}</small>
          </article>
        ))}
      </section>
    </div>
  );
}

function TeamView({
  status,
  onSendRecap
}: {
  status: MasterbuildStatus;
  onSendRecap: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const currentProfile = status.profile?.profile_id ?? "malex";
  const recipient = currentProfile === "malex" ? "vincent" : "malex";
  const currentAudit = status.profile_audits.find(
    (audit) => audit.profile_id === currentProfile
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    await onSendRecap(body);
    setBody("");
  }

  return (
    <div className="mb-view">
      <p className="mb-intro">
        Même objectif partagé, préférences locales séparées. Les ownerships
        définissent qui tranche, pas qui a le droit de proposer.
      </p>
      <section className="mb-team-grid">
        {status.state.shared_profiles.map((profile) => (
          <article key={profile.profile_id}>
            <div className="mb-avatar">
              {profile.display_name.slice(0, 1)}
            </div>
            <span className="mb-kicker">@{profile.github_handle}</span>
            <h3>{profile.display_name}</h3>
            <div className="mb-tag-row">
              {profile.ownership.map((ownership) => (
                <span key={ownership}>{ownership}</span>
              ))}
            </div>
            <small>Mode par défaut : {profile.default_guidance}</small>
            <div className="mb-guidance-grid">
              {Object.entries(
                status.profile_audits.find(
                  (audit) => audit.profile_id === profile.profile_id
                )?.domain_guidance ?? {}
              ).map(([domain, guidance]) => (
                <span key={domain}>
                  {domain} · <strong>{guidance}</strong>
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
      <section className="mb-review-gate">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Gate partagé</strong>
          <span>Revue MALEX obligatoire sur UI, DA, canon et main.</span>
        </div>
      </section>
      <section className="mb-agent-lanes">
        <div className="mb-section__heading">
          <div>
            <span className="mb-kicker">Renforts externes</span>
            <h3>OpenCode / Big Pickle</h3>
          </div>
          <Zap aria-hidden="true" />
        </div>
        {status.external_agents.map((agent) => (
          <article key={agent.agent_id}>
            <div>
              <strong>{agent.label}</strong>
              <span>
                Canal : {agent.channel} · statut inbox : {agent.inbox_status}
              </span>
            </div>
            <div className="mb-agent-status">
              {agent.ready
                ? "READY"
                : agent.requires_codex_review
                  ? "À relire"
                  : "Pause"}
            </div>
            <p>
              Training uniquement : audit long, extraction, comparaison. Pas de canon, pas de Git,
              pas de ranked sans GO.
            </p>
          </article>
        ))}
      </section>
      {currentAudit && (
        <section className="mb-audit-strip">
          <div>
            <span className="mb-kicker">Audit métier à confirmer</span>
            <h3>{currentAudit.role}</h3>
          </div>
          <div>
            <strong>Forces observées</strong>
            <span>{currentAudit.strengths.join(" · ")}</span>
          </div>
          <div>
            <strong>MASTERBUILD répond par</strong>
            <span>{currentAudit.masterbuild_response.join(" · ")}</span>
          </div>
        </section>
      )}
      <section className="mb-recaps">
        <div className="mb-section__heading">
          <div>
            <span className="mb-kicker">Recap partagé · hors boot</span>
            <h3>Envoyer à {recipient === "vincent" ? "Vincent" : "MALEX"}</h3>
          </div>
          <Handshake aria-hidden="true" />
        </div>
        <form onSubmit={submit}>
          <textarea
            onChange={(event) => setBody(event.target.value)}
            placeholder="Décision, preuve, blocage ou prochaine passe…"
            rows={3}
            value={body}
          />
          <button className="mb-primary" type="submit">
            Partager le recap
          </button>
        </form>
        <div className="mb-recap-list">
          {status.recaps.slice(0, 5).map((recap) => (
            <article key={recap.message_id}>
              <small>
                {recap.sender} → {recap.recipient} · Round {recap.stage_index}
              </small>
              <p>{recap.body}</p>
              <span>{recap.tagline}</span>
            </article>
          ))}
          {!status.recaps.length && (
            <p className="mb-empty">Aucun recap partagé pour ce round.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function HousekeepingView({
  status,
  onAddLearning
}: {
  status: MasterbuildStatus;
  onAddLearning: (signal: string, proposal: string) => Promise<void>;
}) {
  const [signal, setSignal] = useState("");
  const [proposal, setProposal] = useState("");
  const grouped = useMemo(
    () =>
      status.findings.reduce<Record<string, MasterbuildStatus["findings"]>>(
        (result, finding) => {
          result[finding.level] ??= [];
          result[finding.level].push(finding);
          return result;
        },
        {}
      ),
    [status.findings]
  );
  const groups = [
    ["auto_clean_candidate", "Nettoyage allowlisté"],
    ["candidate", "Candidats à conserver"],
    ["review", "À classer"],
    ["protected", "Sources protégées"]
  ] as const;

  return (
    <div className="mb-view">
      <p className="mb-intro">
        MASTERBUILD détecte et groupe. Rien n’est supprimé depuis cette
        interface.
      </p>
      <section className="mb-learning-rule">
        <Sparkles aria-hidden="true" />
        <div>
          <strong>Apprentissage sous contrôle</strong>
          <span>
            {status.learning.observations.length} observation(s),{" "}
            {status.learning.proposals.length} proposition(s). Aucune auto-application.
          </span>
        </div>
      </section>
      <section className="mb-source-list">
        <div className="mb-section__heading">
          <div>
            <span className="mb-kicker">Registre unique progressif</span>
            <h3>Sources absorbées et encore actives</h3>
          </div>
        </div>
        {status.source_registry.map((source) => (
          <article key={source.source_id}>
            <div>
              <code>{source.path}</code>
              <StatusPill
                tone={
                  source.status === "conflict"
                    ? "danger"
                    : source.status === "still_active"
                      ? "good"
                      : "muted"
                }
              >
                {source.status}
              </StatusPill>
            </div>
            <p>{source.note}</p>
          </article>
        ))}
      </section>
      <form
        className="mb-learning-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!signal.trim() || !proposal.trim()) return;
          await onAddLearning(signal, proposal);
          setSignal("");
          setProposal("");
        }}
      >
        <label>
          <span>Friction observée</span>
          <input
            onChange={(event) => setSignal(event.target.value)}
            placeholder="Ce qui a ralenti ou dérivé"
            value={signal}
          />
        </label>
        <label>
          <span>Amélioration proposée</span>
          <input
            onChange={(event) => setProposal(event.target.value)}
            placeholder="Un changement testable, pas une auto-réécriture"
            value={proposal}
          />
        </label>
        <button type="submit">Ajouter comme candidate</button>
      </form>
      {groups.map(([key, label]) => (
        <section className="mb-finding-group" key={key}>
          <div className="mb-section__heading">
            <h3>{label}</h3>
            <StatusPill tone={key === "protected" ? "danger" : "muted"}>
              {grouped[key]?.length ?? 0}
            </StatusPill>
          </div>
          {(grouped[key] ?? []).map((finding) => (
            <div className="mb-finding" key={finding.finding_id}>
              <code>{finding.path}</code>
              <span>{finding.reason}</span>
              <strong>{finding.action}</strong>
            </div>
          ))}
          {!grouped[key]?.length && <p className="mb-empty">Aucun finding.</p>}
        </section>
      ))}
    </div>
  );
}

function ResumeView({
  status,
  handoff,
  onPrepareHandoff
}: {
  status: MasterbuildStatus;
  handoff: Handoff | null;
  onPrepareHandoff: () => Promise<void>;
}) {
  return (
    <div className="mb-view">
      <section className="mb-resume-hero">
        <PackageCheck aria-hidden="true" />
        <div>
          <span className="mb-kicker">Checkpoint portable</span>
          <h2>Reprendre sans relire toute la conversation</h2>
          <p>
            Objectif, étape, Git, vérifications et prompt de reprise sont
            regroupés dans un fichier local.
          </p>
        </div>
      </section>
      <div className="mb-resume-status">
        <span>Étape {status.state.active_round.stage_index}/8</span>
        <span>{status.git.branch}</span>
        <span>{status.git.files.length} fichiers locaux</span>
      </div>
      {status.handoff.stale && (
        <p className="mb-warning">
          {status.handoff.reason} MASTERBUILD utilise l’état partagé et ne reprend
          aucune ancienne tâche.
        </p>
      )}
      <button className="mb-primary" onClick={onPrepareHandoff} type="button">
        Préparer le handoff
        <PackageCheck aria-hidden="true" />
      </button>
      {handoff && (
        <section className="mb-handoff-output">
          <small>Fichier local</small>
          <code>{handoff.path}</code>
          <small>Prompt de reprise</small>
          <p>{handoff.prompt}</p>
        </section>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="mb-modal" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="mb-modal__panel"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Fermer"
          className="mb-icon-button"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
        <span className="mb-kicker">Action préparée</span>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function App() {
  const [status, setStatus] = useState<MasterbuildStatus | null>(null);
  const [view, setView] = useState<ViewId>("cockpit");
  const [navOpen, setNavOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparedAction, setPreparedAction] =
    useState<SensitiveAction | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [designPreflight, setDesignPreflight] =
    useState<DesignPreflight | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setStatus(await masterbuildApi.status());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveProfile(profile: Partial<LocalProfile>) {
    await masterbuildApi.saveProfile(profile);
    await refresh();
  }

  async function updateContext(contextPercent: number) {
    if (!status?.profile) return;
    const nextProfile = { ...status.profile, context_percent: contextPercent };
    setStatus({
      ...status,
      profile: nextProfile,
      context:
        contextPercent >= 70
          ? {
              level: "handoff",
              label: "Préparer une reprise",
              message:
                "Le contexte devient lourd. Créez un handoff puis reprenez dans un nouveau thread."
            }
          : contextPercent >= 50
            ? {
                level: "checkpoint",
                label: "Faire un checkpoint",
                message:
                  "Conservez l’objectif, les décisions, les fichiers et les tests avant de continuer."
              }
            : {
                level: "continue",
                label: "Continuer",
                message: "Le contexte reste confortable. Continuez la vague en cours."
              }
    });
    await masterbuildApi.saveProfile(nextProfile);
  }

  async function changeStage(stageIndex: number) {
    await masterbuildApi.updateGoal({ stage_index: stageIndex });
    await refresh();
  }

  async function prepareAction(action: string) {
    setPreparedAction(await masterbuildApi.prepareAction(action));
  }

  async function prepareHandoff() {
    setHandoff(await masterbuildApi.prepareHandoff());
  }

  async function prepareExport() {
    const result = await masterbuildApi.prepareExport();
    setExportResult(result.markdown_path);
  }

  async function generateDesignPreflight(surface: string, audience: string) {
    setDesignPreflight(
      await masterbuildApi.designPreflight({
        surface,
        audience,
        contributor:
          status?.profile?.profile_id === "vincent" ? "vincent" : "malex"
      })
    );
  }

  async function updateWorkPackage(workPackageId: string, nextStatus: string) {
    await masterbuildApi.updateWorkPackage({
      work_package_id: workPackageId,
      status: nextStatus
    });
    await refresh();
  }

  async function sendRecap(body: string) {
    if (!status?.profile?.profile_id) return;
    const sender = status.profile.profile_id;
    await masterbuildApi.sendRecap({
      sender,
      recipient: sender === "malex" ? "vincent" : "malex",
      body
    });
    await refresh();
  }

  async function addLearning(signal: string, proposal: string) {
    await masterbuildApi.addLearningProposal({ signal, proposal });
    await refresh();
  }

  if (loading) return <LoadingScreen />;

  if (!status) {
    return (
      <main className="mb-fatal">
        <Boxes aria-hidden="true" />
        <h1>MASTERBUILD ne peut pas s’orienter.</h1>
        <p>{error ?? "Le service local ne répond pas."}</p>
        <button onClick={() => void refresh()} type="button">
          Réessayer
        </button>
      </main>
    );
  }

  if (!status.profile?.onboarding_complete) {
    return (
      <Onboarding
        onSave={saveProfile}
        profileAudits={status.profile_audits}
        sharedProfiles={status.state.shared_profiles}
      />
    );
  }

  const activeNav = navItems.find((item) => item.id === view)!;

  return (
    <div className="mb-shell">
      <aside className={`mb-nav ${navOpen ? "is-open" : ""}`}>
        <div className="mb-brand">
          <span className="mb-brand__mark">M</span>
          <span className="mb-brand__name">MASTERBUILD</span>
          <button
            aria-label={navOpen ? "Replier le menu" : "Déplier le menu"}
            onClick={() => setNavOpen((open) => !open)}
            type="button"
          >
            {navOpen ? <PanelLeftClose /> : <Menu />}
          </button>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={view === item.id ? "page" : undefined}
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  if (window.innerWidth < 760) setNavOpen(false);
                }}
                title={item.label}
                type="button"
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mb-nav__footer">
          <span>{status.profile.profile_id}</span>
          <small>{status.profile.guidance}</small>
        </div>
      </aside>

      <main className="mb-main">
        <header className="mb-topbar">
          <button
            aria-label="Ouvrir la navigation"
            className="mb-mobile-menu"
            onClick={() => setNavOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" />
          </button>
          <div>
            <span className="mb-kicker">
              {activeNav.label} · Étape {status.state.active_round.stage_index}/8
            </span>
            <h1>{viewTitles[view]}</h1>
          </div>
          <div className="mb-topbar__status">
            <StatusPill tone={status.runtime.available ? "good" : "muted"}>
              Runtime {status.runtime.available ? "connecté" : "facultatif"}
            </StatusPill>
            <button
              aria-label="Actualiser"
              className="mb-icon-button"
              onClick={() => void refresh()}
              title="Actualiser Git et le runtime"
              type="button"
            >
              <RefreshCw aria-hidden="true" />
            </button>
          </div>
        </header>

        <StepRail status={status} />

        {error && <div className="mb-error">{error}</div>}

        <div className="mb-content">
          {view === "cockpit" && (
            <CockpitView
              onContextChange={updateContext}
              onNavigate={setView}
              status={status}
            />
          )}
          {view === "goals" && (
            <GoalsView
              onStageChange={changeStage}
              onWorkPackageUpdate={updateWorkPackage}
              status={status}
            />
          )}
          {view === "domains" && <DomainsView status={status} />}
          {view === "lab" && <LabView status={status} />}
          {view === "git" && (
            <GitView
              exportResult={exportResult}
              onPrepare={prepareAction}
              onPrepareExport={prepareExport}
              onPrepareHandoff={prepareHandoff}
              status={status}
            />
          )}
          {view === "research" && (
            <ResearchView
              onGeneratePreflight={generateDesignPreflight}
              preflight={designPreflight}
              status={status}
            />
          )}
          {view === "team" && (
            <TeamView onSendRecap={sendRecap} status={status} />
          )}
          {view === "housekeeping" && (
            <HousekeepingView onAddLearning={addLearning} status={status} />
          )}
          {view === "resume" && (
            <ResumeView
              handoff={handoff}
              onPrepareHandoff={prepareHandoff}
              status={status}
            />
          )}
        </div>
      </main>

      {preparedAction && (
        <Modal
          onClose={() => setPreparedAction(null)}
          title={preparedAction.label}
        >
          <div className="mb-action-preview">
            <small>Commande proposée</small>
            <code>{preparedAction.command}</code>
            <small>Risque</small>
            <p>{preparedAction.risk}</p>
            <small>Gate</small>
            <p>{preparedAction.gate}</p>
            <StatusPill tone="warn">Non exécutable depuis le cockpit</StatusPill>
          </div>
        </Modal>
      )}
    </div>
  );
}
