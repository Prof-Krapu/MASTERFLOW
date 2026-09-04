import {
  Bell,
  Lock,
  LogOut,
  Mic,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react';
import type {CSSProperties, ReactElement} from 'react';

import type {RuntimeAuthPersistence} from './runtime-auth-storage';
import type {RuntimeUserPreferences} from './runtime-user-preferences';
import {
  RuntimeStyleLearningSettings,
  type RuntimeStyleLearningState,
} from './runtime-style-learning-settings';
import type {UpdateStyleLearningPreferencesRequest} from '@masterflow/shared';
import {
  getPrototypeThemePalette,
  themePalettes,
} from './ui-reset/prototype-profile-registry';
import type {
  AppearanceTheme,
  ThemePaletteId,
} from './ui-reset/prototype-profile-registry';

export type RuntimeSettingsView =
  | 'account'
  | 'interface'
  | 'accessibility'
  | 'voice'
  | 'notifications'
  | 'privacy';

type RuntimeSettingsPanelProps = {
  activeView: RuntimeSettingsView;
  appearanceTheme: AppearanceTheme;
  displayName: string;
  interfaceColor: string;
  onAppearanceThemeChange: (theme: AppearanceTheme) => void;
  onLogout: () => void;
  onPaletteChange: (paletteId: ThemePaletteId, userColor: string) => void;
  onPersonaColorChange: (color: string) => void;
  onPreferencesChange: (preferences: RuntimeUserPreferences) => void;
  onViewChange: (view: RuntimeSettingsView) => void;
  personaColor: string;
  preferences: RuntimeUserPreferences;
  role: string | null;
  sessionPersistence: RuntimeAuthPersistence | null;
  styleLearning?: RuntimeStyleLearningState;
  onStyleLearningReset?: () => void;
  onStyleLearningUpdate?: (input: UpdateStyleLearningPreferencesRequest) => void;
  themePaletteId: ThemePaletteId;
  userRoleColor: string;
  username: string | null;
};

const settingsViews: Array<{
  id: RuntimeSettingsView;
  label: string;
  icon: typeof UserRound;
}> = [
  {id: 'account', label: 'Compte', icon: UserRound},
  {id: 'interface', label: 'Interface', icon: Palette},
  {id: 'accessibility', label: 'Accessibilité', icon: ShieldCheck},
  {id: 'voice', label: 'Voix et transcription', icon: Mic},
  {id: 'notifications', label: 'Notifications', icon: Bell},
  {id: 'privacy', label: 'Confidentialité', icon: Lock},
];

function SettingSwitch({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <button
      aria-checked={checked}
      className="proto-setting-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <i aria-hidden="true" />
    </button>
  );
}

export function RuntimeSettingsPanel({
  activeView,
  appearanceTheme,
  displayName,
  interfaceColor,
  onAppearanceThemeChange,
  onLogout,
  onPaletteChange,
  onPersonaColorChange,
  onPreferencesChange,
  onViewChange,
  personaColor,
  preferences,
  role,
  sessionPersistence,
  styleLearning,
  onStyleLearningReset,
  onStyleLearningUpdate,
  themePaletteId,
  userRoleColor,
  username,
}: RuntimeSettingsPanelProps): ReactElement {
  const themePalette = getPrototypeThemePalette(themePaletteId);
  const update = (next: Partial<RuntimeUserPreferences>): void => {
    onPreferencesChange({...preferences, ...next});
  };
  const updateAccessibility = (next: Partial<RuntimeUserPreferences['accessibility']>): void => {
    update({accessibility: {...preferences.accessibility, ...next}});
  };
  const updateVoice = (next: Partial<RuntimeUserPreferences['voice']>): void => {
    update({voice: {...preferences.voice, ...next}});
  };
  const updateNotifications = (next: Partial<RuntimeUserPreferences['notifications']>): void => {
    update({notifications: {...preferences.notifications, ...next}});
  };
  const updatePrivacy = (next: Partial<RuntimeUserPreferences['privacy']>): void => {
    update({privacy: {...preferences.privacy, ...next}});
  };

  return (
    <>
      <aside aria-label="Sections des paramètres" className="proto-settings__menu">
        <strong>Paramètres</strong>
        {settingsViews.map((view) => {
          const Icon = view.icon;
          return (
            <button
              aria-current={activeView === view.id ? 'page' : undefined}
              className={activeView === view.id ? 'is-active' : undefined}
              key={view.id}
              onClick={() => onViewChange(view.id)}
              type="button"
            >
              <Icon aria-hidden="true" size={17} /> {view.label}
            </button>
          );
        })}
      </aside>

      <div className="proto-settings__content">
        {activeView === 'account' ? (
          <>
            <small>Compte</small>
            <h2>Ton identité</h2>
            <section className="proto-account-identity" aria-label="Identité du compte actif">
              <div>
                <span aria-hidden="true"><UserRound size={22} /></span>
                <strong>{displayName}</strong>
                <small>{username ? `@${username}` : 'Compte local'}{role ? ` · accès ${role}` : ''}</small>
              </div>
              <p>La session décide de l’identité. Changer de Room, de persona ou de projet ne la modifie jamais.</p>
            </section>
            <section className="proto-settings-card">
              <strong>Session</strong>
              <p>{sessionPersistence === 'persistent'
                ? 'Cet appareil garde la session pendant la durée autorisée.'
                : 'La session se ferme avec le navigateur.'}</p>
              <button className="proto-settings-action" onClick={onLogout} type="button">
                <LogOut aria-hidden="true" size={17} /> Se déconnecter
              </button>
            </section>
          </>
        ) : null}

        {activeView === 'interface' ? (
          <>
            <small>Interface</small>
            <h2>Apparence</h2>
            <div className="proto-theme-choice" role="group" aria-label="Thème de l’interface">
              <button aria-pressed={appearanceTheme === 'auto'} onClick={() => onAppearanceThemeChange('auto')} type="button"><Monitor size={20} /><span>Automatique</span></button>
              <button aria-pressed={appearanceTheme === 'dark'} onClick={() => onAppearanceThemeChange('dark')} type="button"><Moon size={20} /><span>Sombre</span></button>
              <button aria-pressed={appearanceTheme === 'light'} onClick={() => onAppearanceThemeChange('light')} type="button"><Sun size={20} /><span>Clair</span></button>
            </div>
            <div className="proto-theme-customizer">
              <section>
                <h3>Palettes recommandées</h3>
                <div className="proto-palette-presets" role="group" aria-label="Palettes recommandées">
                  {themePalettes.map((palette) => (
                    <button aria-label={palette.label} aria-pressed={themePaletteId === palette.id} key={palette.id} onClick={() => onPaletteChange(palette.id, palette.userColor)} type="button">
                      <span className="proto-palette-presets__colors" aria-hidden="true"><i style={{background: palette.color}} /><i style={{background: palette.userColor}} /><i style={{background: palette.supportColor}} /></span>
                      <strong>{palette.label}</strong><small>{palette.logic}</small>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3>Ta nuance</h3>
                <div className="proto-color-swatches" role="group" aria-label="Couleur personnelle et bulles utilisateur">
                  {themePalette.userTones.map((option) => (
                    <button aria-label={option.label} aria-pressed={personaColor === option.color} key={option.color} onClick={() => onPersonaColorChange(option.color)} style={{'--swatch-color': option.color} as CSSProperties} type="button"><span /><small>{option.label}</small></button>
                  ))}
                </div>
              </section>
              <section>
                <h3>Valeurs</h3>
                <button aria-pressed={preferences.paletteValuesInverted} className="proto-value-switch" onClick={() => update({paletteValuesInverted: !preferences.paletteValuesInverted})} type="button">
                  <span aria-hidden="true"><i style={{background: interfaceColor}} /></span>
                  <strong>{preferences.paletteValuesInverted ? 'Valeurs inversées' : 'Valeurs originales'}</strong>
                  <small>{preferences.paletteValuesInverted ? 'Ta nuance pilote l’interface' : 'La palette pilote l’interface'}</small>
                </button>
              </section>
              <section className="proto-theme-preview" aria-label="Aperçu des rôles de couleur">
                <div><span style={{background: interfaceColor}} /><small>Interface</small></div>
                <div><span style={{background: userRoleColor}} /><small>Toi · bulles</small></div>
                <div><span style={{background: themePalette.supportColor}} /><small>Signal secondaire</small></div>
              </section>
            </div>
          </>
        ) : null}

        {activeView === 'accessibility' ? (
          <>
            <small>Accessibilité</small>
            <h2>Lecture et mouvement</h2>
            <section className="proto-settings-group">
              <h3>Mouvement</h3>
              <div className="proto-settings-segmented" role="group" aria-label="Préférence de mouvement">
                {([['auto', 'Système'], ['reduce', 'Réduit'], ['full', 'Complet']] as const).map(([value, label]) => (
                  <button aria-pressed={preferences.accessibility.motion === value} key={value} onClick={() => updateAccessibility({motion: value})} type="button">{label}</button>
                ))}
              </div>
            </section>
            <section className="proto-settings-group">
              <h3>Taille du texte</h3>
              <div className="proto-settings-segmented" role="group" aria-label="Taille du texte">
                {([['small', 'Compact'], ['standard', 'Standard'], ['large', 'Grand']] as const).map(([value, label]) => (
                  <button aria-pressed={preferences.accessibility.textScale === value} key={value} onClick={() => updateAccessibility({textScale: value})} type="button">{label}</button>
                ))}
              </div>
            </section>
            <SettingSwitch checked={preferences.accessibility.enhancedContrast} description="Renforce les séparations, bordures et textes secondaires." label="Contraste renforcé" onChange={(enhancedContrast) => updateAccessibility({enhancedContrast})} />
          </>
        ) : null}

        {activeView === 'voice' ? (
          <>
            <small>Voix et transcription</small>
            <h2>Préférences vocales</h2>
            <label className="proto-settings-field">
              <span><strong>Langue de transcription</strong><small>Utilisée dès qu’un micro compatible est raccordé.</small></span>
              <select value={preferences.voice.transcriptionLanguage} onChange={(event) => updateVoice({transcriptionLanguage: event.target.value as RuntimeUserPreferences['voice']['transcriptionLanguage']})}>
                <option value="fr-FR">Français</option>
                <option value="en-US">Anglais</option>
              </select>
            </label>
            <SettingSwitch checked={preferences.voice.autoplay} description="Indisponible tant que la lecture vocale runtime n’est pas raccordée." disabled label="Lecture automatique des réponses" onChange={(autoplay) => updateVoice({autoplay})} />
            <p className="proto-settings-note" role="status">Aucun provider vocal n’est activé. La conversation texte reste disponible.</p>
          </>
        ) : null}

        {activeView === 'notifications' ? (
          <>
            <small>Notifications</small>
            <h2>Ce qui attire ton attention</h2>
            <SettingSwitch checked={preferences.notifications.validations} description="Affiche le compteur de la Validation Inbox." label="Validations" onChange={(validations) => updateNotifications({validations})} />
            <SettingSwitch checked={preferences.notifications.jobs} description="Affiche les tâches en cours ou à vérifier." label="Tâches et traitements" onChange={(jobs) => updateNotifications({jobs})} />
            <SettingSwitch checked={preferences.notifications.planning} description="Affiche le rappel compact du prochain créneau." label="Prochain cours" onChange={(planning) => updateNotifications({planning})} />
          </>
        ) : null}

        {activeView === 'privacy' ? (
          <>
            <small>Confidentialité</small>
            <h2>Données sur cet appareil</h2>
            <SettingSwitch checked={preferences.privacy.localHistory} description="Affiche l’historique récent conservé par l’application locale." label="Historique local" onChange={(localHistory) => updatePrivacy({localHistory})} />
            <SettingSwitch checked={preferences.privacy.diagnostics} description="Aucun envoi de diagnostic externe n’est raccordé dans cette version." disabled label="Diagnostics externes" onChange={(diagnostics) => updatePrivacy({diagnostics})} />
            <p className="proto-settings-note"><Lock aria-hidden="true" size={16} /> Les préférences restent sur cet appareil et sont isolées par compte.</p>
            <section className="proto-settings-group proto-settings-group--style-learning">
              <h3>Apprentissage de style Persona</h3>
              <p>Tu gardes le contrôle sur les marqueurs de langage utilisés pour rendre les réponses plus naturelles.</p>
            </section>
            <RuntimeStyleLearningSettings
              error={styleLearning?.error ?? null}
              onReset={onStyleLearningReset}
              onUpdate={onStyleLearningUpdate}
              snapshot={styleLearning?.snapshot ?? null}
              status={styleLearning?.status ?? 'loading'}
            />
          </>
        ) : null}
      </div>
    </>
  );
}
