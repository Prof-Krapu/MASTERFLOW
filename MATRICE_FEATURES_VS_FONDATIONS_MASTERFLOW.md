# MATRICE — Features MasterFlow vs fondations

Statut : `PRODUCT/TECH DEPENDENCY MAP / 2026-06-13`

## Objectif

Relier les cas d'usage MasterFlow aux fondations techniques. Cette matrice evite de prioriser
une verticale sans voir les dependances qui la rendent fiable, testable et non deceptive.

## Legende fondations

| Code | Fondation |
|---|---|
| F0 | Autonomie encadree step 1 |
| F1 | Capability Registry |
| F2 | Statuts canon/runtime |
| F3 | Project / Scope / Ownership |
| F4 | RAG permissionne + Resource Truth |
| F5 | Jobs / Queues / Runners |
| F6 | Template / Schema Registry |
| F7 | Observabilite workflow |
| F8 | Acceptance recipes |
| F9 | Validation graduee |

## Matrice priorisee

| Feature / verticale | Valeur produit | Fondations requises | Bloqueurs actuels | Prochaine recette/spec |
|---|---|---|---|---|
| Autonomie step 1 | système qui surveille, prépare, propose | F0, F1, F2, F7, F8, F9 | aucun runtime dédié | `RECETTE_AUTONOMY_STEP1_SHELL.md` |
| Capability Registry | UI fiable, pas de boutons fantômes | F1, F2, F8 | registry actuel limité aux actions | `SPEC_CAPABILITY_REGISTRY.md` |
| MOTH/CDC privé | atelier pédagogique et bot guide | F1, F2, F3, F6, F7, F8, F9 | pas encore de guided runtime | `RECETTE_PR1_GUIDED_RUNTIME.md` |
| Ours d'Or info/inscription | bot event public + qualification | F1, F2, F3, F4, F6, F7, F8, F9 + consentements | public/email/event absents | recette event public à produire |
| Devis guidé | filtre client + estimation | F1, F2, F3, F4, F6, F7, F8, F9 + price/quote engine | price sources et quote workflow absents | recette quote intake à produire |
| DA/assets | production visuelle contrôlée | F1, F2, F3, F5, F6, F7, F8, F9 | asset manifests/jobs/review absents | recette asset manifest/render à produire |
| Correction pédagogique | submissions, feedback, suivi | F1, F2, F3, F5, F6, F7, F8, F9 | projects/submissions/rubrics absents | recette correction à produire |
| Cours / classe | usage pédagogique structuré | F1, F2, F3, F4, F6, F7, F8, F9 | classes/courses/signals absents | recette course/session à produire |
| RAG canon/ressources | retrieval fiable du canon | F1, F2, F3, F4, F5, F7, F8, F9 | scopes, index, context packs absents | `RECETTE_RAG_PERMISSIONNE.md` |
| Jobs/exports | traitements longs sûrs | F1, F2, F3, F5, F7, F8, F9 | jobs/events/runners absents | `SPEC_JOBS_QUEUES_RUNNERS.md` |
| Observabilité workflow | pilotage coût/friction/qualité | F1, F2, F7, F8 | token tracking seulement | `SPEC_WORKFLOW_OBSERVABILITY.md` |
| MasterStory / lore | lecture/narration structurée | F1, F2, F3, F6, F7, F8 | graph narratif absent | recette narrative graph à produire |
| HelpLab / accessibilité | support profils spécifiques | F1, F2, F3, F4, F6, F7, F8, F9 | données sensibles, consentements absents | recette privacy/support à produire |
| Marketplace / communauté | échange de ressources | F1, F2, F3, F4, F7, F8, F9 + moderation | trop tôt, multi-tenant absent | repoussé |
| Tool/Connector Gateway | Comfy, email, Drive, exports | F1, F2, F3, F5, F7, F8, F9 | pas step 1 | phase ultérieure |

## Lecture stratégique

### Verticales pilotes proches

1. Autonomie step 1.
2. Capability Registry.
3. MOTH/CDC privé.
4. RAG permissionné shell.

Ces quatre blocs testent le socle sans exposition publique.

### Verticales à forte valeur mais dépendantes

- Ours d'Or ;
- devis guidé ;
- DA/assets ;
- correction.

Elles doivent attendre au minimum scopes, templates, jobs et recettes.

### Verticales à repousser

- marketplace ;
- connecteurs puissants ;
- public large ;
- emails/notifications marketing ;
- exports automatisés.

## Risques de mauvais ordre

| Mauvais ordre | Risque |
|---|---|
| UI avant Capability Registry | boutons fantômes, interface deceptive |
| Ours d'Or avant scopes/consentements | fuite données, collecte fragile |
| devis avant templates/price sources | estimation opaque ou arbitraire |
| DA/assets avant jobs/manifests | génération non traçable |
| RAG avant permissions | fuite de canon ou ressources privées |
| connecteurs avant autonomy/gates | outils puissants sans contrôle |

## Ordre produit recommandé

```text
1. autonomie step 1
2. capability registry + statuts
3. project/scope/ownership
4. template/schema registry
5. MOTH/CDC privé
6. RAG permissionné shell
7. jobs shell
8. observabilité workflow
9. Ours d'Or privé puis public
10. devis guidé
11. DA/assets
12. correction
```

## Critère d'entrée d'une verticale

Une verticale peut démarrer quand :

```text
capability déclarée
statuts normalisés
owner/scope connu
template ou données source définis
recette backend prête
recette UI prête
validation graduée définie
tests minimum écrits
```

