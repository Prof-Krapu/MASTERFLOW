import {useEffect, useState} from 'react';
import type {CSSProperties, ReactElement} from 'react';

import './masterflow-intro.css';
import {
  introUserChangeEvent,
  readIntroUserSnapshot,
  resolveIntroPunchline,
} from './masterflow-intro-personalization';
import type {IntroUserSnapshot} from './masterflow-intro-personalization';
import {
  getPrototypeThemePalette,
  readStoredAppearanceTheme,
  readStoredThemePaletteId,
} from './ui-reset/prototype-profile-registry';

/**
 * Signature de démarrage purement décorative.
 * Le composant est monté une seule fois avec l'application : il se rejoue donc
 * au chargement ou au refresh, jamais pendant la navigation interne.
 */
export function MasterFlowIntro(): ReactElement {
  const palette = getPrototypeThemePalette(readStoredThemePaletteId() ?? 'masterflow');
  const [punchline, setPunchline] = useState(() => resolveIntroPunchline(readIntroUserSnapshot()));
  const storedAppearance = readStoredAppearanceTheme();
  const resolvedAppearance = storedAppearance === 'auto'
    ? window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    : storedAppearance;
  const themeStyle = {
    '--masterflow-intro-accent': palette.color,
    '--masterflow-intro-deep': palette.deep,
    '--masterflow-intro-support': palette.supportColor,
    '--masterflow-intro-user': palette.userColor,
  } as CSSProperties;

  useEffect(() => {
    const handleUserChange = (event: Event): void => {
      setPunchline(resolveIntroPunchline((event as CustomEvent<IntroUserSnapshot>).detail));
    };
    window.addEventListener(introUserChangeEvent, handleUserChange);
    return () => window.removeEventListener(introUserChangeEvent, handleUserChange);
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`masterflow-intro masterflow-intro--${resolvedAppearance}`}
      style={themeStyle}
    >
      <span className="masterflow-intro__lockup">
        <span className="masterflow-intro__wordmark" />
        <span className="masterflow-intro__flowbar">
          <span />
          <span />
          <span />
        </span>
        <span className="masterflow-intro__punchline">{punchline}</span>
      </span>
    </div>
  );
}
