# Arbitrage contrats D05-D07 — 2026-06-20

## Contrat de déploiement

- Intention produit : préserver les capacités pédagogie, correction et inventaire du legacy sans les présenter comme déjà livrées.
- Partie du canon concernée : D02 Resource Truth, D05 Pédagogie, D06 Correction, D07 Inventory et un reroutage D08.
- Ce qui doit changer : donner à chaque contrat legacy une décision, une preuve canon/Git et une prochaine action.
- Ce qui ne doit pas changer : aucun runtime, aucune donnée, permission, migration, génération, OCR réel ou déploiement live.
- Critère simple de succès : les 12 contrats ne sont plus en attente sémantique et aucun écart runtime n'est masqué.
- Risque de dérive : faible, contenu par la séparation canon / implémentation / live.
- Validation nécessaire : non pour l'audit et la queue ; oui avant promotion canon nouvelle ou activation live.

## Matrice Legacy → Canon → GitHub

| Contrat legacy | Domaine | Décision | Canon propre | GitHub vérifié | Écart / prochaine action |
|---|---|---|---|---|---|
| Assigned Subject → Student Project | D05 | `canon_ready` | D05 distingue sujet, assignation et projet d'apprentissage | guided subject et projets existent séparément ; dérivation d'assignment absente | spécifier une assignation scoped créant un projet élève/groupe sans rendre le sujet modifiable |
| Collaborative Subject Graph & Shared Resource Deck | D02/D05 | `canon_ready` | graphes et decks permissionnés sont cohérents avec D02/D05 | ressources et scopes projet partiels ; graphes collaboratifs absents | restaurer d'abord deck partagé avec ownership, puis graphe ; consulter ≠ copier ≠ exporter |
| MasterFlow Subject Compiler Fullstack | D05 | `reduced` | subject graph/compiler et chaîne D05→D06 sont explicites | verticale guidée utilisable ; graph, Gamma pack et déploiement complet absents | conserver le compilateur comme cible modulaire, pas comme promesse monolithique |
| Pedagogical Delivery, Evidence & Student Safe | D06 | `absorbed` | D06 contient les familles de feedback, l'evidence et le student-safe | garde-fous de correction présents ; feedback final complet encore partiel | en faire un critère de recette obligatoire de toute sortie étudiante |
| Personal Pedagogical Graph Sync & Autosave | D02/D05 | `restore_candidate` | contexte, mémoire et progression prudente existent | memory cards/checkpoints existent ; graphe personnel et autosave candidat absents | restaurer par candidats traçables ; signal ≠ compétence validée, autosave ≠ vérité |
| Subject Correction Sheet Autosync | D05/D06 | `absorbed` | D06 exige la fiche brouillon synchronisée et la revue professeur | objets barème/correction existent mais surface barème/profil et autosync complet manquent | livrer barème/profil puis diff sujet→fiche ; ne jamais écraser un champ verrouillé |
| Reference Inventory OCR Collection Graph | D07 | `absorbed` | D07 porte exactement candidate→validation→inventory graph | inventaire, collections, validation et UI existent ; ingestion photo/OCR réelle absente | conserver l'intake manuel/importé ; OCR réel reste gated par stockage, consentement et provider |
| Personal & Project Inventory Collection Reminder | D07 | `reduced` | scopes personnel/projet, collections et besoins sont canoniques | runtime inventory substantiel ; reminders/notifications persistants absents | séparer rappel privé et notification externe ; mettre les reminders en tranche ultérieure |
| Morphological Reference OCR & Canon Hints | D08 | `canon_ready` | relève de la référence visuelle consentie, pas de l'inventaire général | aucun runtime morphologique/biométrique à activer | rerouter D07→D08 ; photos fournies par l'utilisateur, hints prudents, jamais identité/biométrie |
| Resource Level Resolution & Progressive Routing | D02/D05 | `canon_ready` | Resource Truth et charge progressive sont canoniques | recherche validée présente ; niveaux N1–N5 et routage adaptatif incomplets | ajouter le niveau comme métadonnée explicable ; ne jamais rabattre tout utilisateur sur débutant |
| Resource Truth Lock & Canonical Routing | D02 | `absorbed` | candidat ≠ ressource validée et provenance sont des invariants centraux | `resource_truth` filtre les ressources validées ; cycle complet de maintenance partiel | conserver comme invariant transversal et compléter provenance/invalidation par tranches |
| Subject Library Backend Storage & Deployment | D05 | `canon_ready` | bibliothèque et version de sujet sont prévues | guided subjects existent ; bibliothèque versionnée/assignable dédiée absente | restaurer stockage versionné avant assignation et avant tout import massif |

## Décisions de câblage

1. La priorité D05/D06 reste `sujet versionné → barème/profil → fiche brouillon → assignment → submissions → revue professeur`.
2. D07 est déjà une verticale substantielle ; les rappels sont futurs et l'OCR réel reste verrouillé.
3. Le contrat morphologique quitte D07 et rejoint la vague D08 afin d'éviter toute confusion inventaire/identité/biométrie.
4. Aucun des contrats `canon_ready` ne devient automatiquement une feature GitHub ou une promesse live.

## Queue produite

- Maintenant : poursuivre l'arbitrage des contrats D08, sans provider ni génération.
- En queue runtime : barème/profil D06, bibliothèque de sujets versionnée, assignment scoped.
- Quand les fondations sont prouvées : deck partagé, graphe pédagogique personnel, autosync sujet→fiche.
- Plus tard : reminders Inventory et routage N1–N5.
- Bloqué par gate explicite : OCR/photo réel, morphologie visuelle, migration de données et déploiement live.
