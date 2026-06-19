# D05-D06 — résultat de recette isolée — 2026-06-19

## Décision

La recette D05-D06 est validée dans le runtime de tests isolé. Elle confirme les limites déjà
promises par MasterFlow ; elle ne déclenche aucune nouvelle capacité.

## Périmètre vérifié

| Domaine | Preuve | Résultat |
|---|---|---:|
| D05 Guided Runtime service | `guided_runtime_service.test.ts` | 8/8 |
| D05 Guided Runtime router | `guided_runtime_router.test.ts` | 4/4 |
| D06 feedback | `feedback_exports_service.test.ts` | 6/6 |
| Shared Validation Inbox | `validation_inbox.test.ts` | 20/20 |
| Backend complet | `npm test` depuis `apps/backend` | 341/341 |

Base vérifiée : GitHub `main` `bec7e370b3012e1ae35ec6fa4e7e51f8cfa33077`, avant la rédaction de
cette preuve.

## Ce que cela confirme

- D05 garde les actions de session guidée bornées au runtime Teaching.
- D06 garde le feedback et la preview privée dans la validation owner-only.
- Une validation D06 ne crée ni export, ni fichier, ni publication, ni envoi étudiant.
- Aucun provider externe, job, note finale ou écriture canon n'est ouvert par cette recette.

## Garde de reproductibilité

Les tests D06 doivent être lancés depuis `apps/backend`, qui porte la configuration et la base de
tests isolée. Un lancement depuis la racine du dépôt peut réutiliser une fixture persistante et
produire un faux écart ; ce n'est pas un échec du runtime D06.

## Hors périmètre

- participation élève D05 ;
- stockage de fichiers ;
- export réel ou publication ;
- envoi à un étudiant ;
- note finale ;
- changement du canon Drive.
