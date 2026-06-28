import {useState} from 'react';
import type {ReactElement, ReactNode} from 'react';

type ControlTab = 'control' | 'admin' | 'ops';

type ControlWorkspaceProps = {
  control: ReactNode;
  admin: ReactNode;
  ops: ReactNode;
  onClose: () => void;
};

const TABS: Array<{id: ControlTab; label: string}> = [
  {id: 'control', label: 'Contrôle'},
  {id: 'admin', label: 'Admin'},
  {id: 'ops', label: 'Ops'},
];

export function ControlWorkspace({control, admin, ops, onClose}: ControlWorkspaceProps): ReactElement {
  const [activeTab, setActiveTab] = useState<ControlTab>('control');

  return (
    <section className="control-workspace" aria-label="Pilotage MasterFlow">
      <header className="control-workspace__header">
        <div>
          <p className="eyebrow">Surface privée</p>
          <h2>Pilotage MasterFlow</h2>
        </div>
        <button className="secondary" onClick={onClose} type="button">
          Retour au workspace
        </button>
      </header>
      <nav className="control-tabs" aria-label="Surfaces de pilotage" role="tablist">
        {TABS.map((tab) => (
          <button
            aria-controls="control-workspace-panel"
            aria-selected={activeTab === tab.id}
            className={`control-tab${activeTab === tab.id ? ' control-tab--active' : ''}`}
            id={`control-workspace-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div
        aria-labelledby={`control-workspace-tab-${activeTab}`}
        className="control-content"
        id="control-workspace-panel"
        role="tabpanel"
      >
        {activeTab === 'control' ? control : null}
        {activeTab === 'admin' ? admin : null}
        {activeTab === 'ops' ? ops : null}
      </div>
    </section>
  );
}
