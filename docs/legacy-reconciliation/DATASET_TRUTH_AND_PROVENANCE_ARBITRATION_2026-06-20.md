# Arbitrage des 69 datasets legacy — vérité, provenance et accès — 2026-06-20

## Diagnostic

Les datasets legacy mélangent registres d'autorité, modèles dérivés, états runtime, sources
candidates et fichiers privés. Ils ne peuvent donc pas être importés en bloc comme sources de vérité.

## Contrat de déploiement

- Intention produit : identifier les registres utiles sans contaminer le canon par des snapshots, préférences ou sources privées.
- Partie du canon concernée : Living Truth Spine, D01-D12 et Dataset Access Matrix.
- Ce qui doit changer : décision, owner et rôle de vérité pour 69/69 artefacts.
- Ce qui ne doit pas changer : aucun import, déplacement, indexation, exposition ou mutation de données.
- Critère simple de succès : zéro dataset non arbitré ; sources sensibles explicitement bloquées.
- Risque de dérive : élevé si registry, source, projection et vérité sont confondus.
- Validation nécessaire : non pour audit ; oui avant toute utilisation de source privée ou protégée.

## Résultat

| Décision | Nombre | Sens |
|---|---:|---|
| `absorbed` | 10 | règle de gouvernance déjà reprise dans le canon |
| `canon_ready` | 40 | registre utile à restaurer par schéma/version/provenance |
| `reduced` | 12 | doublon, snapshot ou modèle consolidé sous un registre vivant |
| `restore_candidate` | 3 | source terrain à relire avant promotion |
| `blocked` | 4 | données privées, droits ou consentement à vérifier |

## Rôles de vérité

| Rôle | Nombre | Règle |
|---|---:|---|
| registre d'autorité candidat | 37 | version, owner, provenance et mutation explicites |
| contrat de gouvernance | 11 | règle produit, pas table runtime automatique |
| modèle dérivé | 11 | recalculable, jamais vérité primaire |
| projection d'état runtime | 3 | état daté, jamais canon durable |
| source candidate | 3 | revue et déduplication avant absorption |
| source privée/droits sensibles | 4 | aucune ouverture sans gate humain |

## Sources bloquées

- `MALEX_OWNER_PROFILE_LOCK.md` : préférence/identité privée ; owner consent requis.
- `MASTERFLEX_PRIVATE_MORPH_AUTHORITY_CARD.md` : morphologie/identité sensible ; pas de biométrie implicite.
- `STUDENT_PROFILE_AND_AVATAR_ROSTER_REGISTRY.md` : données étudiantes ; minimisation, finalité et rétention requises.
- `VISUAL_REFERENCES/OURS-D-OR-BIBLE.pdf` : source visuelle binaire ; droits, provenance et scope d'usage à vérifier.

Ces blocages n'arrêtent pas le marathon : les fichiers restent en lecture seule et exclus de toute absorption.

## Répartition owner

| Owner | Nombre |
|---|---:|
| D01 Identity & Permission | 6 |
| D02 Context, Resource & Memory | 16 |
| D03 Room & UI | 3 |
| D04 Persona & Guidance | 3 |
| D05 Pedagogy & Subject | 2 |
| D08 DA & Asset | 23 |
| D09 Narrative | 5 |
| D10 Event, Quote & Export | 1 |
| D11 Factory & Backflow | 2 |
| D12 Runtime Control | 8 |

## Prochaine règle de mise en œuvre

```txt
source brute -> provenance/droits -> candidate -> schema/version -> validation owner
-> registre vivant -> projection runtime dérivée
```

Pas d'import global, pas d'overwrite, pas de vérité construite depuis un nom de fichier.
