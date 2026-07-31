# ProfKrapu Stage Actor Generation Report — 2026-07-26

Statut : `archive_process`, non canon.

Mise a jour 2026-07-27 :

Le pack reste conserve comme preuve technique, mais il est superseded par le reboot canon
ProfKrapu canon V4.

Il ne doit plus servir de direction DA ni de pack affiché prioritaire dans le Lab.

Les quatre essais issus du canon V4 sont rangés dans
`apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/`.
L'essai directionnel isolé du 30 juillet est rangé dans
`apps/frontend/src/assets/profkrapu-stage-actor/rejected/reboot-20260730-directional/`.

## Résumé

Le pack ProfKrapu Stage Actor a été intégré pour rendre le pipeline `actor/stage/assets`
testable dans `/ui-lab` et `/ui-lab/vincent`.

Le pack contient 20 fichiers normalisés `960x1728`, RGBA alpha :

- `neutral`, `listening`, `thinking`, `positive`, `negative`, `doubt`, `warning`, `fear`,
  `explaining`, `troll` ;
- directions `left` et `right`.

## Sources Réelles Générées

| Fichier | Source | Statut |
|---|---|---|
| `raw/neutral-left.png` | génération image depuis canon V3 + portrait neutre | generated candidate |
| `raw/listening-left.png` | génération image depuis `neutral-left` + portrait neutre | generated candidate |

## Slots De Layout

Les autres états sont des placeholders de layout dérivés des deux sources générées.

Ils servent à tester :

- imports ;
- directions gauche/droite ;
- tailles compact/normal/tunnel ;
- collisions avec dock ;
- asset registry ;
- build frontend.

Ils ne doivent pas être validés comme acting final.

## Prompts Résumés

Invariants :

- ProfKrapu stylisé franco-belge science-pulp ;
- lunettes noires épaisses ;
- barbe courte ;
- blouse blanche propre ouverte ;
- t-shirt sombre molécule ;
- bermuda sobre ;
- sneakers simples ;
- fond `#ff00ff` pour détourage ;
- pas de texte, pas de bulle, pas de décor ;
- pas de photoréalisme, Doc Brown, savant fou, boss final ou cosplay combat.

États générés :

- `neutral-left` : observation calme, posture professeur disponible ;
- `listening-left` : écoute analytique, stylo prêt, attention orientée user.

## Contrôle Technique

- raw : `apps/frontend/src/assets/profkrapu-stage-actor/candidates/raw/`
- alpha : `apps/frontend/src/assets/profkrapu-stage-actor/candidates/alpha/`
- normalized : `apps/frontend/src/assets/profkrapu-stage-actor/candidates/normalized/`
- rejected : `apps/frontend/src/assets/profkrapu-stage-actor/candidates/rejected/`

Contrôle attendu :

- `20/20` fichiers normalisés ;
- dimensions `960x1728` ;
- mode `RGBA` ;
- alpha réel ;
- bbox cohérente par famille de source.

## Décision

Le pack est utilisable comme preuve technique uniquement.

Avant promotion prototype ou runtime :

1. repartir du canon reboot ProfKrapu V4 ;
2. régénérer les états Stage Actor un par un ;
3. valider l’acting MALEX + Vincent ;
4. remplacer uniquement les fichiers validés ;
5. relancer build et revue Lab.
