import {ChevronLeft, ChevronRight} from 'lucide-react';
import type {CSSProperties, ReactElement} from 'react';
import type {LucideIcon} from 'lucide-react';

export type PrototypeSkillFamilyId = 'image' | 'volume' | 'system' | 'story' | 'soft';
export type PrototypeSkillArcId = 'creation' | 'dialogue' | 'direction' | 'structure' | 'science' | 'pedagogy' | 'dataviz' | 'support';
export type PrototypePersonaMoodId = 'fear' | 'disgust' | 'sad' | 'neutral' | 'confident' | 'joy';

export type PrototypePersonaMetric = {
  id: string;
  value: number;
  masteryValue: number;
  label: string;
  color: string;
};

export type PrototypePersonaMoodState = {
  id: PrototypePersonaMoodId;
  color: string;
  asset: string;
};

export type PrototypePortraitLayers = {
  current: PrototypePersonaMoodState;
  previous: PrototypePersonaMoodState | null;
};

export type PrototypeSkillArc = {
  id: PrototypeSkillArcId;
  label: string;
  galaxyTitle: string;
  icon: LucideIcon;
  color: string;
  metrics: PrototypePersonaMetric[];
  skills: Array<{
    label: string;
    icon: LucideIcon;
    weight: number;
    mastery: number;
    xp: number;
    family: PrototypeSkillFamilyId;
  }>;
};

type PrototypeSkilltreeSurfaceProps = {
  activePersonaMood: PrototypePersonaMoodState;
  activePersonaStat: PrototypePersonaMetric;
  activeProfileName: string;
  activeSkillArcs: PrototypeSkillArc[];
  activeSkillFamily: PrototypeSkillFamilyId | null;
  displayedPersonaMood: PrototypePersonaMoodState;
  personaDisplayValue: number;
  portraitLayers: PrototypePortraitLayers;
  selectedSkillArc: PrototypeSkillArc | null;
  shortLabels: Record<string, string>;
  skillFamilyColors: Record<PrototypeSkillFamilyId, string>;
  skillGalaxyOpen: boolean;
  skillSliderIndex: number;
  skillsOverviewOpen: boolean;
  onSelectArc: (arcId: PrototypeSkillArcId) => void;
  onSelectSkillSliderIndex: (index: number) => void;
};

export function PrototypeSkilltreeSurface({
  activePersonaMood,
  activePersonaStat,
  activeProfileName,
  activeSkillArcs,
  activeSkillFamily,
  displayedPersonaMood,
  onSelectArc,
  onSelectSkillSliderIndex,
  personaDisplayValue,
  portraitLayers,
  selectedSkillArc,
  shortLabels,
  skillFamilyColors,
  skillGalaxyOpen,
  skillSliderIndex,
  skillsOverviewOpen,
}: PrototypeSkilltreeSurfaceProps): ReactElement {
  const SelectedSkillIcon = selectedSkillArc?.icon;

  return (
    <div
      className={`proto-skill-arc${skillGalaxyOpen ? ' is-focused' : ''}`}
      aria-label="Arc de compétences"
      style={{
        '--stat-color': activeSkillFamily ? skillFamilyColors[activeSkillFamily] : displayedPersonaMood.color,
      } as CSSProperties}
    >
      <div className="proto-skill-arc__orbit" aria-hidden="true" />
      {skillGalaxyOpen ? (
        <nav className="proto-skill-slider-nav" aria-label="Navigation entre les galaxies">
          <button
            aria-label="Écran de compétences précédent"
            onClick={() => onSelectSkillSliderIndex(skillSliderIndex - 1)}
            type="button"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            aria-label="Écran de compétences suivant"
            onClick={() => onSelectSkillSliderIndex(skillSliderIndex + 1)}
            type="button"
          >
            <ChevronRight size={20} />
          </button>
        </nav>
      ) : null}
      {selectedSkillArc ? (
        <>
          <header className="proto-skill-galaxy-title" key={`title-${selectedSkillArc.id}`}>
            <small>{selectedSkillArc.label}</small>
            <strong>{selectedSkillArc.galaxyTitle}</strong>
          </header>
          <div className="proto-skill-constellation" key={`galaxy-${selectedSkillArc.id}`} aria-label={`Skills ${selectedSkillArc.label}`}>
            {selectedSkillArc.skills.map((skill, index) => {
              const Icon = skill.icon;
              const isActiveFamily = skill.family === activeSkillFamily;
              const distanceFactor = (100 - skill.mastery) / 100;
              const importanceFactor = Math.max(0.45, Math.min(skill.weight, 1.55));
              const orbitRadius = Math.round(116 + distanceFactor * 460 + (skill.family === 'soft' ? 34 : 0));
              const mobileOrbitRadius = Math.round(72 + distanceFactor * 130 + (skill.family === 'soft' ? 12 : 0));
              const orbitSpeed = Math.max(
                20,
                Math.round(42 + distanceFactor * 62 + (100 - skill.xp) * 0.34 + (index % 4) * 4),
              );
              const iconSize = Math.round(12 + importanceFactor * 18 + (isActiveFamily ? 3 : 0));
              const orbitAngle = Math.round((360 / selectedSkillArc.skills.length) * index + (selectedSkillArc.id.length * 7) % 38);
              const skillScale = isActiveFamily
                ? 0.82 + importanceFactor * 0.92
                : 0.48 + importanceFactor * 0.34;
              return (
                <span
                  className="proto-skill-node-orbit"
                  key={skill.label}
                  style={{
                    '--skill-angle': `${orbitAngle}deg`,
                    '--skill-counter-angle': `${-orbitAngle}deg`,
                    '--skill-orbit-radius': `clamp(${Math.round(orbitRadius * 0.58)}px, ${(orbitRadius / 5.2).toFixed(1)}vw, ${orbitRadius}px)`,
                    '--skill-mobile-radius': `${mobileOrbitRadius}px`,
                    '--skill-speed': `${orbitSpeed}s`,
                  } as CSSProperties}
                >
                  <span
                    className={`proto-skill-node${isActiveFamily ? ' is-active-family' : ''}`}
                    style={{
                      '--skill-color': skillFamilyColors[skill.family],
                      '--skill-delay': `${index * 35}ms`,
                      '--skill-icon-size': `${iconSize}px`,
                      '--skill-scale': skillScale,
                    } as CSSProperties}
                  >
                    <span className="proto-skill-node__inner">
                      <Icon size={18} />
                      <small>{skill.label}</small>
                    </span>
                  </span>
                </span>
              );
            })}
          </div>
        </>
      ) : null}
      {skillsOverviewOpen ? (
        <section className="proto-skills-overview" aria-label="Cartographie complète des compétences">
          <header>
            <small>Cartographie complète</small>
            <h2>Tout ce qui tourne là-dedans</h2>
          </header>
          <div className="proto-skills-overview__grid">
            {activeSkillArcs.map((arc) => {
              const ArcIcon = arc.icon;
              return (
                <section key={arc.id} style={{'--skill-color': arc.color} as CSSProperties}>
                  <h3><ArcIcon size={17} />{arc.label}</h3>
                  <ul>
                    {arc.skills.map((skill) => {
                      const SkillIcon = skill.icon;
                      return (
                        <li key={skill.label}>
                          <SkillIcon size={14} />
                          <span>{skill.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </section>
      ) : null}
      {!skillGalaxyOpen ? (
        <div className="proto-skill-fields" aria-label="Champs de compétence">
          {activeSkillArcs.map((arc, index) => {
            const Icon = arc.icon;
            const positionClass = ['one', 'two', 'three', 'four'][index] ?? 'one';
            const fieldAngle = ['135deg', '225deg', '315deg', '45deg'][index] ?? '0deg';
            const fieldCounterAngle = ['-135deg', '-225deg', '-315deg', '-45deg'][index] ?? '0deg';
            return (
              <span
                className={`proto-skill-field-orbit proto-skill-field-orbit--${positionClass}`}
                key={arc.id}
                style={{
                  '--field-angle': fieldAngle,
                  '--field-counter-angle': fieldCounterAngle,
                } as CSSProperties}
              >
                <button
                  className={`proto-skill proto-skill--${positionClass}`}
                  onClick={() => onSelectArc(arc.id)}
                  style={{'--skill-color': arc.color} as CSSProperties}
                  type="button"
                >
                  <span className="proto-skill__inner">
                    <Icon size={19} />
                    <span>{arc.label}</span>
                  </span>
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
      {!skillsOverviewOpen ? <div className="proto-skill-arc__center">
        {!selectedSkillArc ? (
          <div className="proto-character-stat-value">
            <strong>{personaDisplayValue}%</strong>
          </div>
        ) : null}
        {selectedSkillArc ? (
          <button
            aria-label={`Revenir à ${activeProfileName}`}
            className="proto-character-page__skill-focus"
            onClick={() => onSelectSkillSliderIndex(0)}
            style={{
              '--persona-score': `${personaDisplayValue}%`,
              '--persona-target': `${activePersonaStat.value}%`,
            } as CSSProperties}
            type="button"
          >
            {SelectedSkillIcon ? <SelectedSkillIcon size={27} /> : null}
          </button>
        ) : (
          <div
            className="proto-character-page__portrait"
            data-mood={activePersonaMood.id}
            style={{
              '--persona-score': `${personaDisplayValue}%`,
              '--persona-target': `${activePersonaStat.value}%`,
            } as CSSProperties}
          >
            {portraitLayers.previous ? (
              <img
                alt=""
                className="proto-character-page__portrait-image is-leaving"
                src={portraitLayers.previous.asset}
              />
            ) : null}
            <img
              alt=""
              className="proto-character-page__portrait-image is-entering"
              key={portraitLayers.current.id}
              src={portraitLayers.current.asset}
            />
          </div>
        )}
        <div className="proto-character-affinity">
          {!selectedSkillArc ? <small>{shortLabels[activePersonaStat.id] ?? activePersonaStat.label}</small> : null}
        </div>
      </div> : null}
    </div>
  );
}
