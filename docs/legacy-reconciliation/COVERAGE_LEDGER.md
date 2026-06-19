# Legacy Coverage Ledger

| Legacy evidence | Domaine / owner | Canon actuel | GitHub | Statut | Action suivante |
|---|---|---|---|---|---|
| `CORRECTOR_APP_RUNTIME` + student monitoring | D05/D06 | contrat classe/cohorte/roster/context ajouté au Living Truth Spine | liaison explicite sur main ; candidates ambiguës localement vérifiées | implemented_partial | merger candidates puis UI professeur |
| DA reference resolver + generated asset runtime | D08 | resolver/registre de références cadré, manifest-first conservé | aucun lifecycle asset confirmé | canon_ready | persistance manifest/références puis read model, provider verrouillé |
| Memory app + context injection | D02 | contrat mémoire/relation/timeline/version ajouté | context packs cités/stale, relations absentes | canon_ready | extension additive et read model de provenance |
| Versioning app + dataset append-only | transverse | Version Change Ledger défini | absent comme runtime métier | canon_ready | timeline/changement append-only après gate migration |
| Incident response + state recovery | D12 / release | contrat continuity/incident/recovery défini | observabilité sans receipts/recovery, release non prouvée | canon_ready | receipts D12 + preflight live conservateur |
| Organization + multi-tenant | D01/D05/D06 | cohorte/roster cadrés, organisation différée | projets/membres + cohorte privée locale vérifiée | restore_candidate | rester sur cohorte/projet ; pas de multi-tenant prématuré |
| Active Contract Index / app registry | Kernel | Active Contract & Process Registry restauré | action registry partiel, projection canon documentée | canon_ready | read model versionné sans contourner permissions/actions |
| Student monitoring / pédagogical signals | D06 | signaux prudents sans dossier étudiant | feedback/signaux partiels | reduced | créer Student Longitudinal Record teacher-scoped |
| Comfy canonical reference resolver | D08 | manifest-first sans resolver | références/assets absents | reduced | créer Canonical Asset & Reference Registry |
| Generated asset runtime | D08/D07 | candidate/review prévu | persistence asset absente | canon_ready | implémenter lifecycle asset après registre de références |
| Multi-tenant architecture | D01 | scope organisation seulement | aucun tenant | deprecated | garder hors V1 jusqu’au besoin multi-structure réel |

Le ledger est enrichi par vague. Une ligne ne devient `absorbed` qu’avec références canon et preuve Git,
ou `deprecated` avec décision explicite.
