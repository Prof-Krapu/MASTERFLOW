# Learning / Teaching / Academic Integrity Contract V1

Date : 2026-06-29  
Vague : `LEARNING-TEACHING-INTEGRITY-001`  
Statut : `contract_published_pr_190`

## Décision simple

MasterFlow doit aider l'utilisateur à apprendre, cadrer, corriger et décider, mais ne doit pas
faire le travail à sa place ni produire une autorité pédagogique finale sans validation humaine.

La bonne architecture existe déjà en morceaux : Guided Runtime, Teaching Readiness, Learning
Mirror, Storylets, Safety State, Trust Fabric, Validation Inbox et D05/D06 correction. Cette vague
ne crée donc pas un nouveau moteur. Elle fixe le contrat qui relie ces briques.

## Contrat produit

Intention produit : rendre l'aide pédagogique utile, guidante et actionnable sans basculer dans
l'auto-réalisation du devoir, la note automatique ou la sanction opaque.

Ce qui doit changer ensuite :

- les demandes Teaching/Learn doivent être classées en `guide`, `explain`, `coach`, `review`,
  `candidate_output` ou `blocked_integrity` ;
- les propositions sensibles doivent passer par Validation Inbox ou Action Engine ;
- les storylets pédagogiques doivent proposer la prochaine étape sûre, jamais l'exécuter seules ;
- les alertes d'intégrité doivent être non humiliantes, contextualisées et réversibles.

Ce qui ne doit pas changer :

- pas de note finale automatique ;
- pas d'envoi étudiant automatique ;
- pas de correction publiée sans professeur ;
- pas de ban automatique ;
- pas de surveillance morale globale ;
- pas de nouveau moteur Learning parallèle.

## Matrice Canon → GitHub

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Aider sans faire à la place | partiel | Présent dans Guided Runtime et compagnons, pas encore routé comme politique commune | moyen | Ajouter une couche de décision pédagogique partagée |
| Correction supervisée | implémenté partiel | Pré-correction, feedback draft et export preview sont candidats / needs review | faible | Réutiliser ces états dans Teaching, ne pas créer de queue parallèle |
| Validation professeur | implémenté | `teacher_validation_required`, Validation Inbox et Action Engine existent | faible | Rendre la raison de validation plus lisible côté UI |
| Learning personnalisé | partiel | Learning Mirror stocke préférences et besoins, mais n'impose pas encore de politique d'aide | moyen | Brancher les recommandations de mode sur le contexte réel |
| Ressources vidéo/timecodes | implémenté partiel | Seed riche avec notions, timestamps, difficultés et misconceptions | faible | Construire une queue Learn visible plus tard |
| Storylets pédagogiques | partiel | Storylets existent pour compagnons, précédents, blocages et narration | moyen | Ajouter storylets Teaching/Learn bornées |
| Safety narrative en classe | documenté/runtime partiel | États safety existent, sans surface Teaching dédiée | moyen | Afficher recadrage discret, non humiliant |
| Academic integrity explicite | absent comme contrat commun | Les verrous existent mais sont dispersés | élevé | Ce document devient la source Git de la politique V1 |

## Politique de réponse pédagogique

| Type de demande | Réponse autorisée | À bloquer | Escalade |
|---|---|---|---|
| Comprendre une notion | expliquer, exemple, analogie, ressource timecodée | inventer une source | aucune |
| Avancer un projet | questions guidées, checklist, prochaine action | rédiger la solution finale sans input utilisateur | storylet si blocage |
| Cadrer un sujet | découper brief, critères, ressources, risques | remplacer la décision du professeur | Validation Inbox si canon/sujet |
| Corriger / évaluer | pré-analyse, preuves, feedback candidat | note finale ou publication directe | validation professeur |
| Demande de rendu complet | recadrer, proposer plan et méthode | produire livrable final prêt à rendre | Safety State si contournement répété |
| Tentative de contournement | rappel des règles, alternative d'apprentissage | exécuter malgré le verrou | alerte GodMode si hostile ou répétée |

## Ponts runtime à réutiliser

- `learning_mirror_engine` : préférences d'aide, besoins détectés, mode recommandé.
- `runtime_pack_registry` : guidance progressive, tutoriel, pack disponible, friction.
- `storylet_engine` : prochaine étape sûre, contradiction, blocage, validation humaine.
- `teaching-readiness.tsx` : état Teaching, jobs `needs_review`, validations et sources.
- `pre_correction.ts` : sorties candidates, jamais note finale.
- `feedback_exports.ts` : feedback et export privés, validation professeur obligatoire.
- `validation_inbox.ts` : projection des candidats sensibles.
- `safety_state.ts` et `trust_fabric.ts` : recadrage, confiance et récupération non punitifs.
- `pedagogical_video_resources_seed.json` : vidéos, notions, timestamps, misconceptions et
  ressources pour un futur mode Learn.

## Tranche runtime recommandée

`LEARNING-TEACHING-INTEGRITY-RUNTIME-001`

Ajouter une fonction pure, sans migration :

```txt
classifyPedagogicalAssistance(input)
→ assistance_kind
→ allowed_help
→ forbidden_outputs
→ validation_required
→ safety_state_hint
→ recommended_storylet
```

Entrées minimales :

- rôle utilisateur ;
- mode actif (`learn`, `teaching`, `project`, `story`) ;
- type de demande ;
- présence d'un livrable final demandé ;
- contexte source validé ou non ;
- répétition d'un contournement.

Sortie : une décision explicable que le chat, Teaching, Learn et les compagnons peuvent consommer
sans dupliquer les règles.

## Tests attendus pour la prochaine vague

- expliquer une notion reste autorisé ;
- demander un devoir complet déclenche `blocked_integrity` ;
- demander une correction produit un candidat, pas une note finale ;
- un professeur garde le droit de valider, mais pas de publier sans action explicite ;
- une ressource vidéo peut être proposée avec timestamp sans autoplay imposé ;
- une tentative répétée peut suggérer Safety State, sans ban automatique ;
- le même moteur fonctionne en Learn et Teaching sans changer les permissions.

## Mise en œuvre runtime

La tranche `LEARNING-TEACHING-INTEGRITY-RUNTIME-001` ajoute :

- les schémas partagés `PedagogicalAssistanceInput` et `PedagogicalAssistanceDecision` ;
- la fonction pure `classifyPedagogicalAssistance` ;
- des sorties explicables pour l'aide autorisée, les résultats interdits, la validation humaine,
  le hint Safety et la storylet recommandée ;
- aucune route, migration, publication, note finale, sanction ou modification de permission.

La première surface `UI-PROGRESSIVE-SURFACES-001` ajoute ensuite :

- une route read-only authentifiée dont le rôle est dérivé du token serveur ;
- un panneau Teaching réutilisable qui explique l'aide autorisée avant toute action ;
- un recadrage visible des demandes de livrable final ;
- aucune écriture, exécution, note, sanction ou publication.

La surface `UI-PROGRESSIVE-LEARNING-001` réutilise ce contrat :

- profil d'aide personnel en lecture seule ;
- profil brouillon visible mais jamais appliqué comme vérité ;
- intentions Learn bornées à comprendre, avancer, relire et trouver une ressource ;
- chargement du workspace uniquement à l'ouverture du mode ;
- aucun éditeur étudiant, autoplay ou livrable final automatique.

## Hors périmètre

- LMS lourd, LTI, SCORM, xAPI ;
- tracking intrusif de comportement étudiant ;
- note finale automatique ;
- publication externe ;
- provider LLM live ;
- surveillance morale globale ;
- sanctions ou ban automatique.
