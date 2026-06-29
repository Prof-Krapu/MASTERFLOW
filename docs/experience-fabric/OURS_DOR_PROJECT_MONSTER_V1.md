# Experience Fabric — Monstre-idée Ours d’Or V1

Statut : V1 locale, évolution candidate sans génération.

## Intention

Faire apparaître le monstre d'un projet lorsque son idée commence à prendre forme, puis proposer
une évolution lisible sans transformer la progression en power-level.

## Sources confrontées

- `MONSTER_EVOLUTION_SYSTEM.md` ;
- `MONSTER_PERSONALITY_SYSTEM.md` ;
- `MONSTER_SILHOUETTE_SYSTEM.md` ;
- `MONSTER_READABILITY_GATES.md` ;
- `PERMISSIONED_LIVING_IDEA_PEDAGOGICAL_COMPANION_CONTRACT.md` ;
- `OURS_DOR_MONSTER_EVOLUTION_COMFY_PIPELINE.md`.

Sources legacy : `MASTERFLOW_LEGACY_14_06_2026`, utilisées comme primitives candidates puis
représentées ici par contrat, code et tests.

## Contrat V1

Le guide doit être :

- rattaché à un projet privé ;
- configuré avec `companion_type: project_monster` ;
- configuré avec `event_context: ours_dor` ;
- alimenté par les champs `creative_gimmick` et `dominant_emotion`.

Le nom et le lore viennent du créateur via le manifest du guide. Le runtime ne les invente pas.

## Trois étapes candidates

1. `seed` : idée fragile, silhouette simple, émotion immédiate, gimmick émergent ;
2. `mutation` : idée en travail, gimmick plus lisible, comportement renforcé ;
3. `stabilized` : cadrage complet, silhouette stable, signature visuelle bornée.

Ce sont des propositions. Chaque évolution exige encore une validation du créateur.

## Continuité obligatoire

- même famille de silhouette ;
- même gimmick central ;
- même lignée émotionnelle ;
- même ton non humiliant ;
- comportement avant transformation de forme.

## Verrous

- monstre = idée de projet, jamais niveau ou valeur d'un étudiant ;
- évolution = clarification, jamais puissance ;
- pas de boss final, kaiju, surcharge FX ou mutation totale ;
- génération et promotion canon désactivées ;
- les gates personnalité, silhouette, évolution, lisibilité et non-humiliation restent explicites ;
- aucune image, galerie, export ou publication dans cette tranche.

## Surface

`GET /api/v1/experience/companions/project-monsters/guided-sessions/:sessionId`

La réponse fournit le compagnon contextuel, l'étape candidate, les raisons, les inputs manquants,
les verrous de continuité et un plan d'asset non exécutable.
