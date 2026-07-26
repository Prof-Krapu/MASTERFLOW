# ProfKrapu Stage Actor Generation Report — 2026-07-26

Statut : candidat Lab, non canon.

## Résumé

Le pack ProfKrapu Stage Actor est intégré pour rendre le pipeline `actor/stage/assets`
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

Le pack est utilisable dans le Component Lab comme candidat technique.

Avant promotion prototype ou runtime :

1. régénérer les états placeholders un par un ;
2. valider l’acting MALEX + Vincent ;
3. remplacer uniquement les fichiers validés ;
4. relancer build et revue Lab.
