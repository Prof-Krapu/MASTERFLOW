# MASTERFLOW — Registre courant des chemins et accès

Dernière vérification : 31 août 2026, bascule server-first

Ce registre remplace la carte locale non versionnée du preflight full-stack pour les opérations
courantes. La doctrine active est
`docs/source-truth/SERVER_OPERABLE_SOURCE_OF_TRUTH_2026-08-31.md`.

## 1. Source de vérité opérable

| Fonction | Valeur | Règle |
|---|---|---|
| Hôte | `ssh malex-graphics` | Vérifier host key ; ne jamais exposer la clé SSH. |
| Racine serveur | `/Users/alexcoulot/Playground/MASTERFLOW_SERVER` | Autorité runtime. |
| Preview active | `releases/preview/current` | Pointeur atomique, jamais édité en place. |
| Release vérifiée | `releases/preview/33f553fb8bbd` | Baseline server-first. |
| Données preview | `shared/preview` | Persistance autoritaire ; backup avant migration. |
| Logs preview | `shared/preview/logs` | Lecture bornée, aucun secret. |
| Backups preview | `shared/preview/backups` | Restauration isolée avant promotion risquée. |
| Stable | `shared/stable`, aucun `current` actif | Aucune stable déclarée. |
| URL privée | `https://malex-graphics.taild22ef5.ts.net` | Tailscale uniquement. |
| Docker CLI | `/Applications/Docker.app/Contents/Resources/bin/docker` | Mode utilisateur. |

Preflight : `npm run server:preflight`.

Interdiction absolue : ne pas lire, afficher, copier ou versionner `.env`, credentials bootstrap,
tokens, clés, mots de passe ou URL ICS sécurisées.

## 2. Atelier local

| Fonction | Chemin | Statut |
|---|---|---|
| Clone/worktree actif | `/Users/malex/Documents/Playground/MASTERFLOW_UI_NO_PROVIDER` | Atelier server-first propre au moment de la transition. |
| Repo historique principal | `/Users/malex/Documents/Playground/MASTERFLOW` | Checkout sale `vincent/masterplan` ; ne pas nettoyer ni utiliser comme base de release. |
| Audit profond | `/Users/malex/Documents/Playground/MASTERFLOW_DEEP_FILE_AUDIT_OPENCODE_2026-08-28` | Référence, pas runtime. |
| Contrôle OpenCode | `/Users/malex/Documents/Playground/OPENCODE_MASTERFLOW_CONTROL` | Pilotage secondaire, pas autorité. |

Une modification locale est `candidate` tant qu'elle n'est pas installée dans une nouvelle release
serveur immuable et activée par le pointeur `current` après validation.

## 3. MasterPlan local

| Fonction | Chemin |
|---|---|
| Contrôleur Data-First | `/Users/malex/Documents/Playground/masterplan_data_controller.py` |
| Synchronisation calendrier | `/Users/malex/Documents/Playground/masterplan_calendar_sync.py` |
| Runtime données | `/Users/malex/Documents/Playground/masterplan_data_runtime.js` |
| PWA | `/Users/malex/Documents/Playground/masterplan_pwa` |
| Webapp | `/Users/malex/Documents/Playground/masterplan_webapp` |
| Menu bar | `/Users/malex/Documents/Playground/masterplan_menubar` |
| Assets | `/Users/malex/Documents/Playground/masterplan_assets` |

Ces outils restent actifs tant que la parité serveur/mobile n'est pas signée. Ils ne sont pas
automatiquement absorbés dans la release MasterFlow.

## 4. Drive opérationnel

Racine :
`/Users/malex/Library/CloudStorage/GoogleDrive-oursdoriscomlille@gmail.com/Mon Drive`

- `MASTERPLAN` : données privées MasterPlan, autorité temporaire jusqu'à parité ;
- `MASTERPLAN_PUBLIC` : projection publique seulement ;
- `TALENTS_CREATIFS` : corpus opérationnel temporaire ;
- `ISCOM_2026_2027` : données pédagogiques vivantes.

Le Drive n'est ni la release serveur ni une destination de copie automatique.

## 5. GitHub

- remote historique : `git@github.com:Prof-Krapu/MASTERFLOW.git` ;
- dernier miroir avant transition : `3d91c0a1ba0a89a11be1c7ad8343fab957b31f0a` ;
- statut : **pause volontaire** ;
- règle : aucun fetch, push, PR ou merge après la fusion finale de transition sans nouveau GO
  explicite MALEX.

Ne pas supprimer le remote ni les branches : ils restent une sauvegarde historique réactivable.

## 6. Archives et backups

Racine lecture seule : `/Users/malex/Documents/MASTERFLOW_BACKUP`.

Les Factories, archives MasterFlow/MasterPlan, snapshots Drive, DA et quarantaines restent des
preuves ou sources candidates. Aucun fichier de cette racine ne devient runtime sans provenance,
droits, statut et validation.
