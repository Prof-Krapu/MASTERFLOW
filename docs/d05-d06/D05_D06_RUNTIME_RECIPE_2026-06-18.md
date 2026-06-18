# D05-D06 runtime recipe — 2026-06-18

Status: `SAFE_RECIPE_NO_RUNTIME_MUTATION`

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
github_main: bb61e4f
teaching_readiness: merged_read_only_slice
guided_subject_read: merged_scoped_read_slice
validation_inbox: action_and_d06_feedback_draft_slice
d06_export_preview: spec_ready_no_code
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

Faire l'audit D12 owner cockpit pour que MALEX voie :

- ce qui est dans `main` ;
- ce qui est seulement en spec ;
- ce qui est verrouillé ;
- ce qui attend validation ;
- ce qui n'existe pas encore.
