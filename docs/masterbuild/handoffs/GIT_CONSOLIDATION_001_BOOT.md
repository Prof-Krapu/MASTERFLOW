# Handoff partagé — GIT-CONSOLIDATION-001

Ce fichier est le point de reprise collaboratif. Le SHA exact doit être lu avec
`git rev-parse HEAD` ou `npm run masterbuild:doctor`.

## À lire

1. `MASTERBUILD.md`
2. `docs/masterbuild/MASTERBUILD_STATE.json`
3. `docs/masterbuild/rounds/GIT_CONSOLIDATION_ROUND_001.md`
4. `docs/masterbuild/audits/MASTERFLOW_GLOBAL_SYSTEM_UI_AUDIT_2026-07-31.md`
5. `docs/masterbuild/PERSONA_ASSET_DECISION_SHEET_2026-07-26.md`
6. `docs/masterbuild/PR_214_SPLIT_STRATEGY_2026-07-31.md`
7. `docs/masterbuild/preflights/SHELL_DOCK_RUNTIME_PREFLIGHT_001.md`
8. `docs/masterbuild/contracts/SHELL_DOCK_RUNTIME_MAPPING_001.md`
9. `docs/masterbuild/reports/GIT_CONSOLIDATION_001_LOCAL_VERIFICATION_2026-07-31.md`

## Situation

- le backend MasterFlow est riche et doit être raccordé, pas reconstruit ;
- le prototype est la référence d'expérience, pas une preuve de raccord complet ;
- la PR #214 reste draft et non mergée ;
- le canon ProfKrapu V4 est actif ;
- les essais Stage Actor ProfKrapu sont archivés ou rejetés ;
- GTC-001 à GTC-005 ont inventorié, classé, réconcilié, décidé puis préparé les contrats ;
- la vérification locale de GTC-006 est terminée : JSON, tests, lint et builds sont verts ;
- le diff complet de la PR conserve des écarts de whitespace historiques dans quatre documents ;
- le build frontend embarque des assets candidats ou archivés via le Component Lab ;
- la décision est de découper la PR #214 en quatre lots ;
- le Lot 1 MASTERBUILD Core est mergé dans `main` via la PR #215 au SHA `65807a8` ;
- la réconciliation documentaire post-merge passe par la PR #216 ;
- le mapping Shell/Dock est documenté, sans raccord UI/backend exécuté ;
- le Round est en étape `7/8 — Publier` ;
- GTC-L2-001 reconstruit sept fichiers de gouvernance avec des labels existants uniquement ;
- aucun ruleset ni protection `main` n'est actif, donc CODEOWNERS reste consultatif ;
- le Lot 2 est mergé dans `main` via la PR #217 au SHA `cd9f26b` ;
- la réconciliation documentaire post-merge du Lot 2 passe par la PR #218 ;
- le prochain travail recommandé est la décision GTC-L3-001 Shell/Dock et assets actifs ;
- le Lot 3 doit exclure candidats, archives, rejets et tout nouveau raccord UI/backend.

## Prompt

```text
Reprends MASTERBUILD dans un clone aligné sur `origin/main`.

Lis MASTERBUILD.md et docs/masterbuild/MASTERBUILD_STATE.json, puis lance :
npm run masterbuild:doctor
npm run masterbuild:resume

Le Round attendu est GIT-CONSOLIDATION-001, étape 7/8 — Publier.

Présente-moi simplement :
1. les preuves GTC-001 à GTC-006 ;
2. les alertes de publication encore ouvertes ;
3. ce qui est local, draft PR, main ou live ;
4. le GO exact nécessaire pour préparer le Lot 3 Shell/Dock et assets actifs.

Ne branche pas l'UI au backend, ne valide aucun nouvel asset, ne ferme pas la PR #214, ne merge
aucun nouveau lot et ne déploie rien sans nouveau GO.
```
