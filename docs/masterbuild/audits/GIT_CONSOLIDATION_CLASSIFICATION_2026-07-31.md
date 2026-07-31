# Classification Git et assets — GTC-001 à GTC-003

Date : 2026-07-31
Statut : preuve locale, non commitée et non publiée
Round : `GIT-CONSOLIDATION-001`

## Vérité Git

| Niveau | État vérifié |
|---|---|
| Worktree au début de l'audit | propre |
| Branche | `codex/masterbuild-v2` |
| HEAD et branche distante | `65e9c0e7b31c1b5e294cba00ba37915184c6e002` |
| `origin/main` et GitHub `main` | `bf041f725003e015fa8f9dc1b44078d41f8b7222` |
| Écart | 22 commits devant, 0 derrière |
| PR #214 | ouverte, draft, 262 fichiers, sans conflit détecté |
| Checks et review | aucun check publié, aucune décision de review |
| Live | aucune preuve de déploiement |

Le statut GitHub `CLEAN` signifie uniquement que la PR est fusionnable sans conflit détecté. Il ne
vaut ni validation produit, ni recette, ni autorisation de merge.

## Classification des lots de la PR

| Lot | Classification | Règle |
|---|---|---|
| Cockpit, moteur, état et registres MASTERBUILD | garder | socle opérationnel autonome |
| Configuration agents et gouvernance GitHub | séparer | revue transversale distincte de l'UI |
| Shell, Command Dock, prototype et Component Lab | garder mais séparer | référence d'expérience, pas runtime final |
| Assets déjà actifs | garder | usages UI existants vérifiés |
| Assets candidats et pipeline Identity Assets | séparer | Lab ou process uniquement |
| Archives et rejets | archive de preuve | aucune promotion runtime |
| Retrait des deux anciens PNG `*-ui-v2.png` | décision séparée | retrait cohérent mais à valider avec la tranche UI |

## Classification des assets

### Actifs

- six portraits MasterFlex et six portraits ProfKrapu ;
- canon full body MasterFlex ;
- canon ProfKrapu V4 ;
- logo et wordmark MasterFlow.

### Candidats

- vingt poses Stage Actor MasterFlex normalisées, Lab seulement ;
- pipeline Identity Assets, process futur.

### Archives

- vingt sources alpha MasterFlex ;
- source normalisée ayant produit le canon ProfKrapu V4 ;
- reboot Stage Actor ProfKrapu : quatre raw, quatre alpha et quatre normalisés ;
- ancien pack ProfKrapu du 26 juillet : vingt alpha, vingt normalisés et deux raw, non importés par
  le code UI ;
- backups et anciennes sources conservés uniquement pour provenance.

### Rejet

- `neutral-left-wrong-direction.png` : preuve de dérive, sans import UI.

### À décider

- sources PSD et autres sources lourdes hors runtime ;
- maintien du retrait de `masterflex-ui-v2.png` et `profkrapu-ui-v2.png` dans le futur lot UI.

## Écarts documentaires à corriger plus tard

- l'ancien pack ProfKrapu est encore rangé sous `candidates/` alors que son statut est archive ;
- le registre du Lab décrit un volume incohérent pour le reboot ProfKrapu ;
- `git diff --check origin/main...HEAD` signale des espaces finaux dans quatre documents
  Shell/Dock historiques.

Ces écarts ne justifient ni déplacement, ni suppression, ni promotion d'asset pendant la
consolidation.

## Queues et demandes

- `MASTERBUILD_WORKBOARD.json` est l'unique queue active du Round ;
- `.opencode/INBOX.md` est en pause ;
- `AGENT_TASKS.md` ne contient aucune tâche `open` ou `claimed` active ;
- les anciennes entrées `open` des inbox MALEX/Vincent restent des demandes historiques non
  absorbées, pas des autorisations ni des tâches réactivées ;
- `MASTERFLOW_ACTION_QUEUE.md` devient une source historique à relire élément par élément avant
  toute absorption dans le workboard.

## Décision de phase

GTC-001, GTC-002 et GTC-003 sont terminés. Le Round passe à l'étape `4/8 — Décider`.

Prochaine action : GTC-004, décider si la PR #214 est conservée, découpée ou remplacée. Cette étape
n'autorise encore aucun merge, déploiement, suppression, déplacement d'asset ou raccord UI/backend.
