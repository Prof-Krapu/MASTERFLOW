# Handoff MasterPlan -> MasterBuild - Sujets et affectations

Date : 2026-08-24
Identifiant : `MASTERPLAN-SUBJECT-ASSIGNMENT-BRIDGE-001`
Statut : `candidate_external_finding`
Décision produit : non prise
Exécution autorisée : non

## Diagnostic

L'audit MasterPlan de 20 packs pédagogiques et du planning ISCOM 2026-2027 ne révèle pas un défaut urgent de MasterFlow.

MasterFlow possède déjà les fondations correctes :

- `SubjectManifest` pour la mission pédagogique ;
- `SubjectVersion` pour le versionnement et la validation ;
- `SubjectAssignment` pour l'affectation d'une version validée à une cohorte ;
- `EvidenceEvent`, `PedagogicalSignal` et `TeacherDecisionDelta` pour les preuves, signaux candidats et décisions professeur ;
- une fiche de correction dérivée distincte de la note officielle.

## Finding candidat

Les données opérationnelles MasterPlan distinguent plusieurs objets actuellement rangés dans une même bibliothèque de packs :

- sujet principal ;
- sujet au choix ;
- parcours de semestre ;
- évaluation ;
- ressource ou exercice technique ;
- événement transversal ;
- outil d'orchestration ;
- matrice historique à faire évoluer.

Le contrat runtime actuel sépare correctement `template`, `version` et `assignment`, mais ne porte pas directement :

- le rôle pédagogique du pack ;
- le cours ou module concerné ;
- le semestre ou la période d'effet ;
- un groupe de choix entre sujets équivalents ;
- l'état `proposé par MasterPlan` distinct d'une affectation professeur active.

Ce constat est une opportunité de bridge, pas la preuve qu'une migration backend est nécessaire.

## Exemple terrain

- `Pop Twist` ou `Spin Off Record` : choix B2 PAO S1 avec socle d'évaluation commun ;
- `Affiche-toi !` : projet annuel B2 transversal ; les créneaux dédiés ne représentent qu'une partie de son calendrier ;
- `Fold` : sujet B2 PAO S2 à refondre avant activation ;
- `Agence 3P` : parcours B1, pas partiel ;
- `Amener l'art à l'école` : ancien Design Sprint B4, pas sujet du cours PAO 4IC ;
- `B4 PAO 4IC` : cours confirmé de 14 heures, sujet encore à décider ;
- `Le COMEX ne prévient jamais` : évaluation à adapter pour l'EIT commune ;
- `Techniques de production - Stickers` : ressource technique, pas sujet EIT complet ;
- `Ours d'Or` : événement transversal, pas affectation automatique ;
- `Rattrapages MasterFlow Gamma` : outil d'orchestration, pas sujet étudiant.

## Demande à MasterBuild

Auditer, dans un futur Round dédié, le meilleur emplacement de ces informations :

1. métadonnées du bridge file-first uniquement ;
2. extension non destructive des contrats `SubjectTemplate` / `SubjectAssignment` ;
3. objet de liaison séparé entre cours, période, cohorte et version de sujet.

Recommandation initiale : commencer par le bridge et un adaptateur de lecture. Ne pas modifier les tables ou contrats partagés tant que l'import réel MasterPlan n'est pas cadré et testé.

## Garde-fous

- aucune donnée Drive ne devient canon automatiquement ;
- une proposition MasterPlan ne devient jamais une affectation active sans décision professeur ;
- une ressource, un événement ou un outil ne doit pas apparaître comme sujet étudiant assignable ;
- un choix entre plusieurs sujets conserve un barème commun et une preuve de la décision ;
- le Round UI Teaching actif ne doit pas être interrompu par ce finding ;
- aucun backend, schéma, migration, seed ou runtime ne change dans ce handoff.

## Source externe candidate

`ISCOM_2026_2027/02_COURS_SUJETS/01_AFFECTATIONS_CANDIDATES/MASTERPLAN_PROPOSITION_AFFECTATION_SUJETS_2026_2027.md`

Source pédagogique supplémentaire : syllabus historique `Affiche-toi !`, B2, semestres 3 et 4, désormais classé dans `02_COURS_SUJETS/00_SYLLABI_CANON/B2/AFFICHE_TOI/`.

Le fichier reste sur le Drive privé. Ce handoff ne copie aucune donnée étudiante ni média lourd dans Git.

## Prochaine décision attendue

Après le Round UI actif, décider si `MASTERPLAN-SUBJECT-ASSIGNMENT-BRIDGE-001` entre dans un Round de cadrage du bridge pédagogique. Jusque-là : conserver comme source candidate, sans exécution.
