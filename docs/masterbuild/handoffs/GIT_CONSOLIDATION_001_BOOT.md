# Handoff partagé — GIT-CONSOLIDATION-001

Ce fichier est le point de reprise collaboratif. Le SHA exact doit être lu avec
`git rev-parse HEAD` ou `npm run masterbuild:doctor`.

## À lire

1. `MASTERBUILD.md`
2. `docs/masterbuild/MASTERBUILD_STATE.json`
3. `docs/masterbuild/rounds/GIT_CONSOLIDATION_ROUND_001.md`
4. `docs/masterbuild/audits/MASTERFLOW_GLOBAL_SYSTEM_UI_AUDIT_2026-07-31.md`
5. `docs/masterbuild/PERSONA_ASSET_DECISION_SHEET_2026-07-26.md`

## Situation

- le backend MasterFlow est riche et doit être raccordé, pas reconstruit ;
- le prototype est la référence d'expérience, pas une preuve de raccord complet ;
- la PR #214 reste draft et non mergée ;
- le canon ProfKrapu V4 est actif ;
- les essais Stage Actor ProfKrapu sont archivés ou rejetés ;
- le prochain travail est la consolidation Git avant l'intégration UI.

## Prompt

```text
Reprends MASTERBUILD dans /Users/malex/Documents/Playground/MASTERFLOW_MASTERBUILD_V2.

Lis MASTERBUILD.md et docs/masterbuild/MASTERBUILD_STATE.json, puis lance :
npm run masterbuild:doctor
npm run masterbuild:resume

Le Round attendu est GIT-CONSOLIDATION-001, étape 1/8 — Orienter.

Présente-moi simplement :
1. la situation Git et la PR #214 ;
2. ce qui est actif, candidat, archivé ou rejeté ;
3. ce que le Round va consolider ;
4. la première action recommandée et le GO exact nécessaire.

Ne branche pas encore l'UI au backend. Ne valide aucun nouvel asset, ne supprime rien, ne merge et
ne déploie rien pendant la reprise.
```
