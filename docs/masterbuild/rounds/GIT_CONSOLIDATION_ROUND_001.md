# GIT-CONSOLIDATION-001 — Vérité unique et préparation du raccord UI

Date : 2026-07-31
Statut : prêt, en attente du GO de reprise
Owner : MALEX
Revue système : Vincent

## Objectif

Transformer la branche, la draft PR #214, les registres et les assets en une vérité Git lisible,
puis préparer le premier raccord UI sans merger ni déployer.

## Work packages

| ID | Travail | Owner | Statut | Preuve attendue |
|---|---|---|---|---|
| GTC-001 | Inventorier branche, PR, fichiers locaux et assets | Codex | pending | matrice exacte des états |
| GTC-002 | Classer garder, séparer, archiver, rejeter | MALEX + Codex | pending | décision PR et assets |
| GTC-003 | Réconcilier état, registres et suivi | Codex | pending | aucune queue active concurrente |
| GTC-004 | Décider la stratégie de la PR #214 | MALEX + Vincent | pending | PR conservée, découpée ou remplacée |
| GTC-005 | Préparer le raccord Shell/Dock | Codex + Vincent | pending | contrats et première tranche |
| GTC-006 | Publier les preuves et clôturer | Codex | pending | tests, Git, handoff et Round suivant |

## Critères de succès

- une seule lecture permet de distinguer local, branche, PR, `main` et live ;
- chaque asset est actif, candidat, archive ou rejeté ;
- les fonctionnalités backend utiles ne sont pas perdues pendant la migration UI ;
- la PR #214 reçoit une décision explicite ;
- le prochain Round d'intégration possède un périmètre et des contrats précis.

## Autorisation

Ce document prépare le Round mais ne l'autorise pas silencieusement. La reprise doit orienter MALEX,
recommander `GTC-001`, puis attendre son GO.

Restent interdits sans nouveau GO : merge, déploiement, migration, provider, dépense, suppression
métier et changement de canon.

## Sources

- `docs/masterbuild/audits/MASTERFLOW_GLOBAL_SYSTEM_UI_AUDIT_2026-07-31.md` ;
- `docs/masterbuild/MASTERBUILD_STATE.json` ;
- `docs/masterbuild/MASTERBUILD_FEATURE_REGISTRY.json` ;
- `docs/masterbuild/PERSONA_ASSET_DECISION_SHEET_2026-07-26.md` ;
- draft PR #214.
