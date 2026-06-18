# MasterFlow — User Feedback Intake

Les retours utilisateurs restent des observations terrain jusqu'à validation explicite. Ils ne
modifient ni le canon, ni GitHub automatiquement.

## Registre actif

| Retour brut résumé | Classement | Hypothèse produit | Recommandation | Décision | Tâche créée |
|---|---|---|---|---|---|
| Besoin MALEX : enchaîner les tâches sans risque sans attendre Vincent. | observation terrain | Le pilotage doit distinguer tâches safe, tâches verrouillées et décisions MALEX. | Intégrer dans la queue opérationnelle, pas dans le canon produit. | appliqué en queue | `LOW_RISK_EXECUTION_QUEUE_2026-06-18.md` |
| Retours conversations audit déjà classés. | observation terrain | Plusieurs signaux utiles concernent process control, feedback families, D12 findings et D08 locks. | Garder comme candidats pré-canon ; router par specs/audits. | maintenu pré-canon | `docs/user-feedback/USER_FEEDBACK_INTAKE_2026-06-18.md` |

## Règle de passage

`observation terrain → hypothèse produit → modification canon proposée → canon validé`

Un passage d'étape exige une décision explicite de MALEX.

## Décision opérationnelle 2026-06-18

Les retours utilisateurs peuvent alimenter :

- une queue ;
- une spec ;
- une recette ;
- un audit ;
- une hypothèse produit.

Ils ne peuvent pas alimenter directement :

- le canon ;
- une migration ;
- une publication ;
- un export ;
- une génération ;
- un envoi externe.
