# Contrat sujet autonome — Ours d’Or et Talents Créatifs

Date : 2026-09-01
Statut : décision produit validée, implémentation locale non déployée

## Intention produit

Traiter Ours d’Or et Talents Créatifs comme des sujets qui peuvent exister sans cours ni module, tout en conservant leur participation sous forme de projet. Un rattachement ultérieur à un module reste optionnel et déclenche alors une décomposition pédagogique explicite.

## Classification validée

| Pilote | Nature du sujet | Liaison par défaut | Participation | Si un module est lié |
|---|---|---|---|---|
| Ours d’Or | concours | autonome | projet individuel ou collectif | décomposition du concours en séquences du module |
| Talents Créatifs | challenge | autonome | projet d’équipe | décomposition du challenge en séquences du module |

## Invariants

- Un `SubjectTemplate` peut exister sans rattachement à un module.
- Le projet matérialise la participation ; il ne transforme pas le sujet en cours.
- Aucun rattachement sujet → module n’est automatique.
- Toute assignation réelle demande une validation humaine.
- La décomposition est appliquée uniquement quand un module est explicitement lié.
- Ours d’Or et Talents Créatifs conservent deux RuntimePacks distincts.

## Implémentation locale

Les manifests RuntimePack exposent maintenant un `subject_context` :

- `subject_kind` : `contest` ou `challenge` ;
- `default_binding` : `standalone` ;
- `module_binding` : `optional` ;
- `participation_model` : modèle de projet autorisé ;
- `decomposition_policy` : `decompose_when_module_bound` ;
- `assignment_requires_human_validation` : `true`.

## Limite volontaire

La base actuelle sait déjà conserver un sujet sans projet, mais ne porte pas encore de relation explicite sujet → module/offre de cours. Ajouter cette relation demanderait une migration de données : elle reste bloquée jusqu’à validation séparée. Aucun rattachement implicite n’est simulé en attendant.

## Contrat de déploiement

- Intention produit : rendre le statut des deux pilotes non ambigu sans forcer leur inscription dans un cours.
- Partie du canon concernée : sujets, projets, pilotes et modules.
- Ce qui doit changer : classification RuntimePack et libellés d’interface.
- Ce qui ne doit pas changer : permissions, groupes, validation humaine, contenu des briefs et livrables.
- Critère simple de succès : chaque pilote apparaît comme sujet autonome et son rattachement module reste optionnel.
- Risque de dérive : moyen si une future liaison module est automatisée.
- Validation nécessaire : oui pour commit, push, migration et déploiement.
