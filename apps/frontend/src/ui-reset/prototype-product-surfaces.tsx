import {Gem, X} from 'lucide-react';
import type {AnimationEvent as ReactAnimationEvent, CSSProperties, ReactElement, ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';

export type PrototypeHomeMode = {
  id: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  resume?: boolean;
};

export type PrototypeHomeCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

type HomeSurfaceProps = {
  copy: PrototypeHomeCopy;
  primaryModes: PrototypeHomeMode[];
  secondaryModes: PrototypeHomeMode[];
  onSelectMode: (mode: string) => void;
  onResume?: () => void;
};

export function PrototypeHomeSurface({
  copy,
  onResume,
  onSelectMode,
  primaryModes,
  secondaryModes,
}: HomeSurfaceProps): ReactElement {
  return (
    <div className="proto-entry-greeting">
      <span aria-label="MasterFlow" className="proto-home-wordmark" role="img" />
      <small>{copy.eyebrow}</small>
      <strong>{copy.title}</strong>
      <span>{copy.body}</span>
      <nav className="proto-home-access" aria-label="Accès principaux">
        <div className="proto-home-access__row proto-home-access__row--primary">
          {primaryModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                aria-label={mode.resume ? `Reprendre ${mode.label}` : mode.label}
                className={`${mode.primary ? 'is-primary' : ''}${mode.resume ? ' is-resume' : ''}`.trim() || undefined}
                key={mode.id}
                onClick={() => mode.resume && onResume ? onResume() : onSelectMode(mode.id)}
                type="button"
              >
                <Icon size={22} />
                <span>{mode.label}</span>
                {mode.resume ? <small className="proto-home-access__resume">Reprendre</small> : null}
              </button>
            );
          })}
        </div>
        <div className="proto-home-access__row proto-home-access__row--secondary">
          {secondaryModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                aria-label={mode.resume ? `Reprendre ${mode.label}` : mode.label}
                className={mode.resume ? 'is-resume' : undefined}
                key={mode.id}
                onClick={() => mode.resume && onResume ? onResume() : onSelectMode(mode.id)}
                type="button"
              >
                <Icon size={22} />
                <span>{mode.label}</span>
                {mode.resume ? <small className="proto-home-access__resume">Reprendre</small> : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export type PrototypeCharacterInventoryItem = {
  id: string;
  label: string;
  color: string;
  count: number;
  icon: LucideIcon;
};

type CharacterSurfaceProps = {
  canonAlt: string;
  canonAsset: string;
  children: ReactNode;
  closing: boolean;
  galaxyOpen: boolean;
  inventoryItems: PrototypeCharacterInventoryItem[];
  name: string;
  profileId: string;
  punchline: string;
  rankTitle: string;
  skillsOverviewOpen: boolean;
  onAnimationEnd: (event: ReactAnimationEvent<HTMLElement>) => void;
  onClose: () => void;
};

export function PrototypeCharacterSurface({
  canonAlt,
  canonAsset,
  children,
  closing,
  galaxyOpen,
  inventoryItems,
  name,
  onAnimationEnd,
  onClose,
  profileId,
  punchline,
  rankTitle,
  skillsOverviewOpen,
}: CharacterSurfaceProps): ReactElement {
  return (
    <section
      className={`proto-character-page${galaxyOpen ? ' is-galaxy' : ''}${skillsOverviewOpen ? ' is-skills-overview' : ''}${closing ? ' is-closing' : ''}`}
      aria-label={`Personnage ${name}`}
      data-profile={profileId}
      onAnimationEnd={onAnimationEnd}
    >
      <button
        aria-label="Fermer la page personnage"
        className="proto-character-page__back"
        onClick={onClose}
        type="button"
      >
        <X size={19} />
      </button>
      <div className="proto-character-page__profile">
        <div className="proto-character-page__identity">
          <div className="proto-character-role" aria-label={`Rang MasterFlow : ${rankTitle}`}>
            <Gem aria-hidden="true" size={19} />
            <strong>{rankTitle}</strong>
          </div>
          <h1>{name}</h1>
          <p key={punchline}>{punchline}</p>
        </div>
        <div className="proto-character-taxonomy proto-character-inventory">
          <div className="proto-character-inventory__items" aria-label={`Assets liés à ${name}`}>
            {inventoryItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} style={{'--inventory-color': item.color} as CSSProperties} type="button">
                  <Icon size={27} />
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {children}
      <figure className="proto-character-canon">
        <img alt={canonAlt} src={canonAsset} />
      </figure>
    </section>
  );
}
