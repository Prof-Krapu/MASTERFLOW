import {
  BookOpen,
  Boxes,
  Brain,
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  FolderKanban,
  Gem,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Microscope,
  PackageOpen,
  Palette,
  PenTool,
  ScrollText,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type {CSSProperties, ReactElement} from 'react';
import type {LucideIcon} from 'lucide-react';

export type LabProductMode = {
  id: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

export type LabProductSkill = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  orbit: number;
  scale: number;
  speed: number;
  active?: boolean;
};

export type LabProductArc = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  short: string;
  skills: LabProductSkill[];
};

export type LabProductProfile = {
  name: string;
  rank: string;
  greeting: string;
  body: string;
  punchline: string;
  avatar: string;
  canon: string;
  canonAlt: string;
  accent: string;
  persona: string;
  support: string;
  modes: LabProductMode[];
  arcs: LabProductArc[];
  inventory: Array<{label: string; count: number; icon: LucideIcon; color: string}>;
};

export const createLabModes = (): LabProductMode[] => [
  {id: 'project', label: 'Project', icon: FolderKanban, primary: true},
  {id: 'teaching', label: 'Teaching', icon: GraduationCap},
  {id: 'learn', label: 'Learn', icon: BookOpen},
  {id: 'story', label: 'MasterStory', icon: ScrollText},
  {id: 'da', label: 'DA Studio', icon: Palette},
  {id: 'inventory', label: 'Inventory', icon: PackageOpen},
  {id: 'companions', label: 'Companions', icon: UsersRound},
];

export const masterflexFixtureArcs: LabProductArc[] = [
  {
    id: 'creation',
    label: 'Création',
    icon: Sparkles,
    color: '#f06a3e',
    short: 'DA carnivore',
    skills: [
      {id: 'motion', label: 'Motion', icon: Brush, color: '#f06a3e', orbit: 128, scale: 1.45, speed: 34, active: true},
      {id: 'proto', label: 'Prototype', icon: Boxes, color: '#f06a3e', orbit: 184, scale: 1.16, speed: 48, active: true},
      {id: 'style', label: 'Style', icon: Palette, color: '#f06a3e', orbit: 244, scale: 0.86, speed: 72},
      {id: 'idea', label: 'Idée tordue', icon: Lightbulb, color: '#f06a3e', orbit: 304, scale: 0.74, speed: 96},
    ],
  },
  {
    id: 'dialogue',
    label: 'Dialogue',
    icon: MessageCircle,
    color: '#3979e8',
    short: 'Punchline utile',
    skills: [
      {id: 'tunnel', label: 'Tunnel', icon: MessageCircle, color: '#3979e8', orbit: 124, scale: 1.35, speed: 30, active: true},
      {id: 'brief', label: 'Brief', icon: PenTool, color: '#3979e8', orbit: 178, scale: 1.04, speed: 44, active: true},
      {id: 'feedback', label: 'Feedback', icon: Check, color: '#3979e8', orbit: 238, scale: 0.92, speed: 66},
      {id: 'soft', label: 'Patience', icon: Brain, color: '#3979e8', orbit: 318, scale: 0.68, speed: 104},
    ],
  },
  {
    id: 'structure',
    label: 'Structure',
    icon: Boxes,
    color: '#8b62c9',
    short: 'Rangement nerveux',
    skills: [
      {id: 'cdc', label: 'CDC', icon: ScrollText, color: '#8b62c9', orbit: 130, scale: 1.26, speed: 36, active: true},
      {id: 'grid', label: 'Grille', icon: Boxes, color: '#8b62c9', orbit: 194, scale: 1.08, speed: 56},
      {id: 'queue', label: 'Queue', icon: Check, color: '#8b62c9', orbit: 256, scale: 0.82, speed: 84},
    ],
  },
];

export const profkrapuFixtureArcs: LabProductArc[] = [
  {
    id: 'science',
    label: 'Science',
    icon: FlaskConical,
    color: '#35a879',
    short: 'Précision acide',
    skills: [
      {id: 'chimie', label: 'Chimie', icon: FlaskConical, color: '#35a879', orbit: 126, scale: 1.42, speed: 34, active: true},
      {id: 'botanique', label: 'Botanique', icon: Microscope, color: '#35a879', orbit: 190, scale: 1.08, speed: 50, active: true},
      {id: 'sources', label: 'Sources', icon: Check, color: '#35a879', orbit: 262, scale: 0.82, speed: 86},
    ],
  },
  {
    id: 'pedagogy',
    label: 'Pédagogie',
    icon: GraduationCap,
    color: '#e84f8a',
    short: 'Cours carré',
    skills: [
      {id: 'vulga', label: 'Vulgarisation', icon: MessageCircle, color: '#e84f8a', orbit: 132, scale: 1.34, speed: 32, active: true},
      {id: 'schema', label: 'Schémas', icon: PenTool, color: '#e84f8a', orbit: 202, scale: 1.02, speed: 58},
      {id: 'molekids', label: 'Molekids', icon: Sparkles, color: '#e84f8a', orbit: 310, scale: 0.72, speed: 108},
    ],
  },
];

type HomeFixtureProps = {
  profile: LabProductProfile;
  onSelectMode: (mode: string) => void;
  wordmark: ReactElement;
};

export function PrototypeHomeFixture({profile, onSelectMode, wordmark}: HomeFixtureProps): ReactElement {
  return (
    <section className="ui-lab-product ui-lab-home-fixture" aria-label="Fixture Home">
      <div className="ui-lab-home-fixture__center">
        <span className="ui-lab-home-fixture__wordmark">{wordmark}</span>
        <small>{profile.greeting}</small>
        <strong>{profile.name === 'MasterFlex' ? 'Oh, te revoilà toi.' : 'Bonjour, blouse propre.'}</strong>
        <p>{profile.body}</p>
        <nav className="ui-lab-home-fixture__modes" aria-label="Entrées Home">
          {profile.modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button className={mode.primary ? 'is-primary' : undefined} key={mode.id} onClick={() => onSelectMode(mode.id)} type="button">
                <Icon size={30} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}

type PersonaFixtureProps = {
  activeArcId: string | null;
  profile: LabProductProfile;
  onSelectArc: (arcId: string | null) => void;
  onSelectRelativeArc: (direction: 1 | -1) => void;
};

export function PrototypePersonaFixture({
  activeArcId,
  onSelectArc,
  onSelectRelativeArc,
  profile,
}: PersonaFixtureProps): ReactElement {
  const activeArc = profile.arcs.find((arc) => arc.id === activeArcId) ?? null;
  const CenterIcon = activeArc?.icon;
  const galaxySkills = activeArc?.skills ?? [];

  return (
    <section className={`ui-lab-product ui-lab-persona-fixture${activeArc ? ' is-galaxy' : ''}`} aria-label="Fixture Persona Skilltree">
      {!activeArc ? (
        <aside className="ui-lab-persona-fixture__identity">
          <span className="ui-lab-persona-fixture__rank"><Gem size={26} />{profile.rank}</span>
          <h2>{profile.name}</h2>
          <p>{profile.punchline}</p>
          <div className="ui-lab-persona-fixture__inventory">
            {profile.inventory.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} style={{'--fixture-node-color': item.color} as CSSProperties} type="button">
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}

      <div className="ui-lab-persona-fixture__galaxy">
        <button className="ui-lab-persona-fixture__nav ui-lab-persona-fixture__nav--left" onClick={() => onSelectRelativeArc(-1)} type="button">
          <ChevronLeft size={28} />
        </button>
        <button className="ui-lab-persona-fixture__nav ui-lab-persona-fixture__nav--right" onClick={() => onSelectRelativeArc(1)} type="button">
          <ChevronRight size={28} />
        </button>

        {activeArc ? (
          <header className="ui-lab-persona-fixture__galaxy-title" style={{'--fixture-node-color': activeArc.color} as CSSProperties}>
            <strong>{activeArc.label}</strong>
            <span>{activeArc.short}</span>
          </header>
        ) : null}

        <div className="ui-lab-persona-fixture__orbit" aria-label="Orbites de compétence">
          {!activeArc ? (
            profile.arcs.map((arc, index) => {
              const Icon = arc.icon;
              return (
                <button
                  className="ui-lab-persona-fixture__arc"
                  key={arc.id}
                  onClick={() => onSelectArc(arc.id)}
                  style={{
                    '--fixture-angle': `${index * (360 / profile.arcs.length) - 70}deg`,
                    '--fixture-node-color': arc.color,
                  } as CSSProperties}
                  type="button"
                >
                  <Icon size={22} />
                  <span>{arc.label}</span>
                </button>
              );
            })
          ) : (
            galaxySkills.map((skill, index) => {
              const Icon = skill.icon;
              return (
                <span
                  className={`ui-lab-persona-fixture__skill${skill.active ? ' is-active' : ''}`}
                  key={skill.id}
                  style={{
                    '--fixture-angle': `${index * (360 / galaxySkills.length) + 22}deg`,
                    '--fixture-node-color': skill.color,
                    '--fixture-orbit': `${skill.orbit}px`,
                    '--fixture-scale': skill.scale,
                    '--fixture-speed': `${skill.speed}s`,
                  } as CSSProperties}
                >
                  <span>
                    <Icon size={20} />
                    <small>{skill.label}</small>
                  </span>
                </span>
              );
            })
          )}

          <button
            className="ui-lab-persona-fixture__center"
            onClick={() => onSelectArc(null)}
            style={{'--fixture-node-color': activeArc?.color ?? profile.persona} as CSSProperties}
            type="button"
          >
            {CenterIcon ? <CenterIcon size={30} /> : <img alt="" src={profile.avatar} />}
          </button>
        </div>
      </div>

      {!activeArc ? (
        <figure className="ui-lab-persona-fixture__canon">
          <img alt={profile.canonAlt} src={profile.canon} />
        </figure>
      ) : null}
    </section>
  );
}
