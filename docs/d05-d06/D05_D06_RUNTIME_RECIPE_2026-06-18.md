# D05-D06 runtime recipe — 2026-06-18

Status: `SAFE_RECIPE_REPLAYED_ISOLATED_2026_06_19`

## Résultat de la recette isolée — 2026-06-19

La recette a été rejouée dans l'environnement de tests isolé du backend, sur la base GitHub
`bec7e370` alors alignée avec `main`.

- D05 Guided Runtime : 12/12 tests (`service` 8/8, `router` 4/4) ;
- D06 feedback + Shared Validation Inbox : 26/26 tests (`feedback` 6/6, `inbox` 20/20) ;
- backend complet : 341/341 tests ;
- aucun provider, export, fichier, job, publication, envoi étudiant ni note finale créé.

Le résultat atteste le comportement déjà implémenté ; il ne constitue pas une nouvelle promesse
produit et n'ouvre aucune capacité externe. La preuve détaillée est dans
`D05_D06_ISOLATED_RECIPE_RESULT_2026-06-19.md`.

## But

Décrire la recette de vérification D05-D06 maintenant que GitHub `main` contient :

- Teaching readiness en lecture seule ;
- lecture des guides/sessions dans Teaching ;
- Shared Validation Inbox ;
- projection D06 `feedback_draft` owner-only dans la Validation Inbox.

Cette recette ne crée pas de données réelles, ne lance pas de provider, ne publie rien et ne promet
pas de stockage fichier.

## Baseline

```yaml
github_main_at_replay: bec7e370
teaching_readiness: merged_read_only_slice
guided_subject_runtime: merged_bounded_actions
validation_inbox: action_d06_feedback_and_private_preview_slices
d06_export_preview: merged_private_inbox_review_only
storage: absent_or_unconfirmed
student_send: locked_absent
```

## Recette de vérification sûre

| Étape | Ce qu'on vérifie | Source GitHub | Succès attendu |
|---:|---|---|---|
| 1 | Teaching est visible uniquement pour teacher/godmode. | `mode-runtime.ts`, tests mode runtime | student/admin ne voient pas Teaching. |
| 2 | Teaching affiche Room/projet/sources/jobs/validations. | `teaching-readiness.tsx` | état clair prêt/partiel/bloqué. |
| 3 | Teaching lit guides + sessions existantes. | `GET /guided-sessions`, frontend API | session active/récente affichée ou empty state explicite. |
| 4 | Validation Inbox liste les actions pending. | `validation_inbox.ts` | action sensible visible sans exécution automatique. |
| 5 | Validation Inbox liste les `feedback_draft` D06 owner-only. | PR #5 | feedback en attente visible une seule fois pour l'owner. |
| 6 | Approbation feedback appelle l'autorité D06. | `reviewFeedbackDraft` | status `approved`, audit, aucun export créé. |
| 7 | Rejet feedback appelle l'autorité D06. | `reviewFeedbackDraft` | status `rejected`, audit, seconde décision refusée. |
| 8 | Export preview reste séparé. | `D06_EXPORT_PREVIEW_INBOX_AUDIT_2026-06-18.md` | pas de projection code tant que non validée. |
| 9 | Student send reste verrouillé. | schémas D06 + tests | aucun envoi, aucune publication, aucune note finale. |

## Commandes sûres

```bash
npm test
npm run lint
npm run lint:frontend
npm run build:frontend
```

## Ce qu'il ne faut pas faire dans cette recette

- Ne pas lancer de provider LLM réel.
- Ne pas créer de clé OpenRouter.
- Ne pas démarrer ComfyUI.
- Ne pas créer d'export réel.
- Ne pas simuler un envoi étudiant comme s'il existait.
- Ne pas traiter `approved_for_export` comme publication.
- Ne pas modifier le canon Drive depuis Git.

## Lecture produit simple

MasterFlow sait maintenant montrer un espace Teaching lisible et une validation D06 minimale :
le professeur peut approuver/rejeter un feedback candidat dans l'inbox commune.

Ce n'est pas encore une chaîne complète de correction publiée. Le prochain pont possible est la
preview privée d'export, mais elle doit rester une étape séparée et verrouillée.

## Prochaine action safe

La recette est terminée. Conserver D05 participation élève, stockage réel, export publié et
envoi étudiant hors scope tant qu'un contrat produit distinct, un gate humain et une validation
explicite ne les ouvrent pas.
