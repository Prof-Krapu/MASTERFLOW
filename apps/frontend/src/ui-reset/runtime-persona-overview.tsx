import {ArrowRight, Gauge, LoaderCircle, Orbit, PackageOpen} from 'lucide-react';
import type {CSSProperties, ReactElement} from 'react';
import type {Persona, RuntimeUserProfile} from '@masterflow/shared';

type RuntimePersonaOverviewProps = {
  error: string | null;
  onOpenGalaxy: () => void;
  onOpenInventory: () => void;
  persona: Persona | null;
  profile: RuntimeUserProfile | null;
};

type PersonaMeterProps = {
  detail: string;
  icon: typeof Gauge;
  label: string;
  progress: number;
  value: string;
};

function PersonaMeter({detail, icon: Icon, label, progress, value}: PersonaMeterProps): ReactElement {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <article className="proto-persona-meter">
      <div
        aria-label={`${label} : ${value}`}
        className="proto-persona-meter__ring"
        role="img"
        style={{'--persona-meter-value': `${safeProgress}%`} as CSSProperties}
      >
        <span><Icon aria-hidden="true" size={17} /></span>
      </div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

export function RuntimePersonaOverview({
  error,
  onOpenGalaxy,
  onOpenInventory,
  persona,
  profile,
}: RuntimePersonaOverviewProps): ReactElement {
  if (error) {
    return (
      <section className="proto-persona-overview" aria-label="Profil dynamique indisponible">
        <p className="proto-persona-overview__notice" role="status">
          Le profil personnel n’a pas pu être chargé : {error}
        </p>
      </section>
    );
  }
  if (!profile) {
    return (
      <section className="proto-persona-overview" aria-label="Chargement du profil dynamique">
        <p className="proto-persona-overview__notice" role="status">
          <LoaderCircle className="spin" size={18} /> Chargement des données réelles…
        </p>
      </section>
    );
  }

  const learning = profile.learning_profile;
  const professional = learning?.professional_self;
  const strengths = learning?.learning_state.strengths ?? [];
  const blockers = learning?.learning_state.blockers ?? [];
  const professionalSkills = profile.professional_skills;
  const professionalFamilies = new Set(professionalSkills.map((skill) => skill.arc));
  const sourcedSkills = professionalSkills.filter((skill) => skill.evidence_refs.length > 0);
  const validatedSkills = professionalSkills.filter((skill) => skill.validation_status === 'validated');
  const evidenceRefs = new Set(professionalSkills.flatMap((skill) => skill.evidence_refs));
  const sourceCoverage = professionalSkills.length > 0
    ? Math.round((sourcedSkills.length / professionalSkills.length) * 100)
    : 0;
  const validationCoverage = professionalSkills.length > 0
    ? Math.round((validatedSkills.length / professionalSkills.length) * 100)
    : 0;
  const inventoryProgress = profile.inventory.total > 0
    ? Math.round((profile.inventory.validated / profile.inventory.total) * 100)
    : profile.declared_resources.total > 0
      ? Math.round((profile.declared_resources.attached_to_inventory / profile.declared_resources.total) * 100)
      : 0;

  return (
    <section className="proto-persona-overview" aria-label={`Accueil Persona de ${profile.user.display_name}`}>
      <header className="proto-persona-overview__header">
        <small>Accueil Persona · {learning?.profile_status === 'user_validated' ? 'profil sourcé' : 'profil en construction'}</small>
        <h2>{professional?.headline ?? 'Ta progression, sans tableau de bord.'}</h2>
        <p>
          {professional?.summary ?? (persona
            ? `${persona.name} accompagne cette Room. Ton compte et ses données restent séparés.`
            : 'MasterFlow accompagne cette Room sans persona imposé.')}
        </p>
        {professional?.source_status ? <span>{professional.source_status}</span> : null}
      </header>

      <div className="proto-persona-overview__meters">
        <PersonaMeter
          detail={`${professionalFamilies.size} famille(s) professionnelle(s)`}
          icon={Gauge}
          label="Skills cartographiés"
          progress={sourceCoverage}
          value={`${professionalSkills.length}`}
        />
        <PersonaMeter
          detail={`${evidenceRefs.size} référence(s) publique(s) et locale(s)`}
          icon={Orbit}
          label="Skills sourcés"
          progress={validationCoverage}
          value={`${sourcedSkills.length} / ${professionalSkills.length}`}
        />
        <PersonaMeter
          detail={`${profile.declared_resources.videos} vidéo(s) détectée(s) · ${profile.declared_resources.attached_to_inventory} rattachée(s)`}
          icon={PackageOpen}
          label="Inventory personnel"
          progress={inventoryProgress}
          value={`${profile.inventory.total} / ${profile.declared_resources.total}`}
        />
      </div>

      <div className="proto-persona-overview__signals">
        <div>
          <small>Posture créative</small>
          <strong>{professional?.working_style ?? profile.progression.current_milestone ?? 'À observer dans l’usage'}</strong>
          <span>{profile.progression.milestone_count} jalon(s) · {profile.progression.signals_count} preuve(s)</span>
        </div>
        <div>
          <small>Mode de collaboration</small>
          <strong>{learning ? `${learning.help_style ?? 'direct'} · ${learning.help_format ?? 'visuel'}` : 'À enrichir progressivement'}</strong>
          <span>{professional?.preferred_interaction?.[0] ?? (learning ? `${learning.guidance_mode} · ${learning.help_density ?? 'équilibré'}` : 'Aucune préférence inventée')}</span>
        </div>
      </div>

      {strengths.length > 0 || blockers.length > 0 ? (
        <div className="proto-persona-overview__tags" aria-label="Signaux déclarés">
          {strengths.map((strength) => <span className="is-strength" key={`strength-${strength}`}>{strength}</span>)}
          {blockers.map((blocker) => <span key={`blocker-${blocker}`}>{blocker}</span>)}
        </div>
      ) : null}

      <div className="proto-persona-overview__actions">
        <button className="is-primary" onClick={onOpenGalaxy} type="button">
          <Orbit aria-hidden="true" size={18} />
          Explorer la galaxie {persona?.name ?? 'MasterFlex'}
          <ArrowRight aria-hidden="true" size={17} />
        </button>
        <button onClick={onOpenInventory} type="button">
          <PackageOpen aria-hidden="true" size={17} />
          Ouvrir mon Inventory
        </button>
      </div>
    </section>
  );
}
