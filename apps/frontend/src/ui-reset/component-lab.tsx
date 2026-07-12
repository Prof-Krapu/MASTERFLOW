import {BookOpen, Command, GraduationCap, MessageCircle, Moon, PackageOpen, Palette, Sun} from 'lucide-react';
import {useState} from 'react';
import type {ReactElement} from 'react';

import {CurrentUiDemo} from '../current-ui-demo';
import '../current-ui-demo.css';

type ComponentLabProps = {
  workspaceId?: 'malex' | 'vincent';
};

const labNotes = {
  malex: {
    title: 'Lab MALEX',
    profile: 'MasterFlex par défaut',
    theme: 'Orange / bleu',
    note: 'Décisions UI, DA, navigation et comportement avant promotion.',
  },
  vincent: {
    title: 'Lab Vincent',
    profile: 'ProfKrapu par défaut',
    theme: 'Orchidée rose',
    note: 'Contrats, backend, permissions et états runtime sans redessiner la DA.',
  },
} as const;

const labChecks = [
  {id: 'navigation', label: 'Navigation', icon: Command},
  {id: 'dock', label: 'Command Dock', icon: MessageCircle},
  {id: 'teaching', label: 'Teaching', icon: GraduationCap},
  {id: 'learn', label: 'Learn', icon: BookOpen},
  {id: 'inventory', label: 'Inventory', icon: PackageOpen},
  {id: 'theme', label: 'Thèmes', icon: Palette},
];

export function ComponentLab({workspaceId = 'malex'}: ComponentLabProps): ReactElement {
  const [light, setLight] = useState(false);
  const workspace = labNotes[workspaceId] ?? labNotes.malex;

  return (
    <main className={`ui-lab-shell proto-shell--theme-${light ? 'light' : 'dark'}`}>
      <aside className="ui-lab-panel" aria-label="Component Lab">
        <header>
          <small>MASTERBUILD · Component Lab</small>
          <h1>{workspace.title}</h1>
          <p>{workspace.note}</p>
        </header>
        <div className="ui-lab-panel__facts">
          <span>{workspace.profile}</span>
          <span>{workspace.theme}</span>
          <span>Shell/Dock P1</span>
        </div>
        <button className="ui-lab-panel__theme" onClick={() => setLight((current) => !current)} type="button">
          {light ? <Moon size={18} /> : <Sun size={18} />}
          <span>{light ? 'Tester sombre' : 'Tester clair'}</span>
        </button>
        <nav className="ui-lab-panel__checks" aria-label="Familles de composants">
          {labChecks.map((check) => {
            const Icon = check.icon;
            return (
              <button key={check.id} type="button">
                <Icon size={18} />
                <span>{check.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <section className="ui-lab-preview" aria-label="Aperçu interactif">
        <CurrentUiDemo />
      </section>
    </main>
  );
}
