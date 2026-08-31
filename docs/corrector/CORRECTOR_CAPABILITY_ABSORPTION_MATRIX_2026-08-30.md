# Corrector vers MasterFlow - Matrice d'absorption des capacites

## Decision produit

Corrector est le projet historique de Vincent. Il n'est ni migre comme application, ni conserve
comme verticale, ni reactive comme persona autonome. MasterFlow absorbe uniquement ses capacites
utiles dans ses moteurs communs, avec les permissions, preuves et validations MasterFlow.

`corrector-001` reste lisible pour l'historique mais demeure deprecie et non selectionnable.

## Matrice

| Capacite Corrector | Etat MasterFlow | Decision |
|---|---|---|
| Scan et identification des copies | absorbee | Conserver le pipeline submission/intake source. |
| OCR PDF et image | remplacee par mieux | Garder l'OCR multimodal conservateur en `needs_review`. |
| Roster et rapprochement d'identite | absorbee | Garder les candidats d'identite et la validation humaine. |
| Fiche YAML plate | remplacee par mieux | Utiliser rubriques, versions et brouillons SQLite. |
| Phases P1 a P4 et watchers | remplacees par mieux | Utiliser jobs, leases, heartbeats et reprise bornee. |
| Scoring brouillon | absorbee | Conserver scores candidats, preuves et confiance. |
| Calibration institutionnelle | absorbee | Diagnostic seulement, validation professeur obligatoire. |
| Feedback court | absorbee | Validation Inbox et statut candidat. |
| Unicite des formulations | completee localement | Signaler une collision exacte ou une attaque repetee ; ne jamais reecrire automatiquement. |
| Exports CSV/XLSX | completee localement | Copier octet pour octet la preview approuvee vers un fichier final prive et hashe. |
| Validation professeur | absorbee | Aucun score final, envoi ou publication automatique. |
| Suivi des couts | absorbe | Conserver le routage et le preflight de cout MasterFlow. |

## Regles de non-regression

- Une sortie IA reste candidate.
- La calibration ne modifie jamais silencieusement une note.
- Le professeur valide le feedback et la preview avant export.
- Le runner d'export ne reformate pas le document valide.
- Les exports restent prives et sans URL publique.
- Les anciennes bases Python Corrector restent des preuves historiques, jamais un runtime MasterFlow.

## Sources auditees

- `MASTERFLOW_CORRECTOR_PIPELINE` : pipeline Python local historique.
- `CORRECTION_SYSTEM` : machine a etats et watchers historiques.
- `CORRECTION_SYSTEM_APP_LOCAL` : sous-ensemble applicatif historique.
- Audit OpenCode du 2026-08-27 : `SOURCE_CAPABILITIES.md`, `ABSORBED_PARTIAL_MISSING.md` et
  `CORRECTOR_TO_MASTERFLOW_GAP_MATRIX.csv`.

## Etat de publication

Les deux complements sont candidats locaux sur `codex/corrector-capability-absorption`. Aucun
commit, push, merge ou deploiement n'est autorise par ce document.
