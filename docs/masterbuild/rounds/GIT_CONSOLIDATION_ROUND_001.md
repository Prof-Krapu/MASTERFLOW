# GIT-CONSOLIDATION-001 — Vérité unique et préparation du raccord UI

Date : 2026-07-31
Statut : terminé, étape 8/8 — Clôturer
Owner : MALEX
Revue système : Vincent

## Objectif

Transformer la branche, la draft PR #214, les registres et les assets en une vérité Git lisible,
puis préparer le premier raccord UI sans merger ni déployer.

## Work packages

| ID | Travail | Owner | Statut | Preuve attendue |
|---|---|---|---|---|
| GTC-001 | Inventorier branche, PR, fichiers locaux et assets | Codex | completed | matrice exacte des états |
| GTC-002 | Classer garder, séparer, archiver, rejeter | MALEX + Codex | completed | décision PR et assets |
| GTC-003 | Réconcilier état, registres et suivi | Codex | completed | aucune queue active concurrente |
| GTC-004 | Décider la stratégie de la PR #214 | MALEX + Vincent | completed | décision : découper en quatre lots |
| GTC-005 | Préparer le raccord Shell/Dock | Codex + Vincent | completed | preflight, mapping et première tranche bornée |
| GTC-006 | Publier les preuves et clôturer | Codex | completed | preuves publiées, PR classées et vérité Git unique vérifiée |
| GTC-L1-001 | Publier le Lot 1 MASTERBUILD Core | Codex | completed | PR #215 mergée au SHA `65807a8` |
| GTC-L2-001 | Publier le Lot 2 Gouvernance GitHub | MALEX + Vincent | completed | PR #217 mergée au SHA `cd9f26b` |
| GTC-L2-PM-001 | Réconcilier le merge du Lot 2 | Codex | completed | PR #218 mergée |
| GTC-L3-001 | Publier Shell/Dock et assets actifs | MALEX + Vincent | completed | PR #219 mergée, puis UI réellement utilisée restaurée par #221 |

## Critères de succès

- une seule lecture permet de distinguer local, branche, PR, `main` et live ;
- chaque asset est actif, candidat, archive ou rejeté ;
- les fonctionnalités backend utiles ne sont pas perdues pendant la migration UI ;
- la PR #214 reçoit une décision explicite ;
- le prochain Round d'intégration possède un périmètre et des contrats précis.

## Autorisation

GTC-001 à GTC-004 ont été autorisés séparément par MALEX et exécutés sans modification de la PR.
La stratégie retenue est le découpage en quatre lots.
GTC-005 a été exécuté en préparation contractuelle, sans raccord UI/backend ni modification de
code. Le volet local de GTC-006 est terminé : JSON, tests MASTERBUILD, lint, builds et état Git ont
été vérifiés. Le GO du Lot 1 autorise maintenant une branche propre depuis `origin/main`, sa
reconstruction, les tests, le commit, le push et une draft PR. Merge et déploiement restent fermés.

Le Lot 1 est mergé dans `main` via la PR #215 au SHA `65807a8`. La gate active devient la décision
du Lot 2 Gouvernance GitHub. Les Lots 2 à 4 et la fermeture de #214 restent hors autorisation.
La réconciliation documentaire post-merge est publiée via la PR #216.
Le GO GTC-L2-001 autorise la reconstruction, l'analyse, le commit, le push et une draft PR. Merge,
protection de branche, création de labels et déploiement restent fermés.
Le Lot 2 est mergé dans `main` via la PR #217 au SHA `cd9f26b`. La gate active devient la décision
du Lot 3 Shell/Dock et assets actifs. Aucun code ou asset du Lot 3 n'est encore reconstruit.
La réconciliation documentaire post-merge du Lot 2 est publiée via la PR #218.

Le GO GTC-L3-001 autorise une branche propre depuis `origin/main`, la reconstruction bornée du
Shell/Dock avec assets actifs uniquement, les contrôles, le commit, le push et une draft PR. Le
merge, le déploiement, la suppression des anciens assets et tout nouveau raccord UI/backend restent
fermés. Allowlist :
`docs/masterbuild/contracts/SHELL_DOCK_ACTIVE_LOT_PUBLICATION_CONTRACT_001.md`.
La branche `codex/shell-dock-active-lot` a été mergée via la PR #219. La tranche réduite a ensuite
été remplacée par la PR #221, qui restaure l'UI réellement utilisée sans reprendre les candidats ou
archives de la PR #214. La PR #220 a été fermée sans merge et explicitement remplacée par #221.

La Home et la console GodMode ont été mergées par #223. Le Component Lab partagé MALEX/Vincent a
été mergé par #224. La PR #214 est fermée sans merge et reste une source historique. `main` au SHA
`29f08287db1893b2a535c13dbf684e0185546057` constitue la vérité Git unique ; aucun déploiement
partagé n'est prouvé.

Restent interdits sans nouveau GO : merge, déploiement, migration, provider, dépense, suppression
métier et changement de canon.

## Sources

- `docs/masterbuild/audits/MASTERFLOW_GLOBAL_SYSTEM_UI_AUDIT_2026-07-31.md` ;
- `docs/masterbuild/audits/GIT_CONSOLIDATION_CLASSIFICATION_2026-07-31.md` ;
- `docs/masterbuild/PR_214_SPLIT_STRATEGY_2026-07-31.md` ;
- `docs/masterbuild/preflights/SHELL_DOCK_RUNTIME_PREFLIGHT_001.md` ;
- `docs/masterbuild/contracts/SHELL_DOCK_RUNTIME_MAPPING_001.md` ;
- `docs/masterbuild/contracts/MASTERBUILD_CORE_PUBLICATION_CONTRACT_001.md` ;
- `docs/masterbuild/reports/GIT_CONSOLIDATION_001_LOCAL_VERIFICATION_2026-07-31.md` ;
- `docs/masterbuild/MASTERBUILD_STATE.json` ;
- `docs/masterbuild/MASTERBUILD_FEATURE_REGISTRY.json` ;
- `docs/masterbuild/PERSONA_ASSET_DECISION_SHEET_2026-07-26.md` ;
- PR #214 fermée sans merge — source historique conservée.
- PR #215 mergée — Lot 1 MASTERBUILD Core, SHA `65807a8`.
- PR #216 mergée — clôture documentaire post-merge.
- `docs/masterbuild/reports/GITHUB_GOVERNANCE_IMPACT_REVIEW_001.md` — impact du Lot 2.
- PR #217 mergée — Lot 2 Gouvernance GitHub, SHA `cd9f26b`.
- PR #218 mergée — clôture documentaire post-merge du Lot 2.
- PR #219 mergée — Lot 3 Shell/Dock et assets actifs.
- PR #220 fermée sans merge — remplacée par #221.
- PR #221 mergée — restauration de l'UI réellement utilisée.
- PR #222 mergée — demande de préparation du déploiement privé, sans déploiement.
- PR #223 mergée — Home runtime et console GodMode.
- PR #224 mergée — Component Lab partagé, SHA final de clôture `29f0828`.

## Clôture vérifiée le 2026-08-02

- clone local unique, propre et aligné sur `origin/main` ;
- aucune PR ouverte ;
- anciens worktrees retirés et travaux sales sauvegardés en quarantaine locale ;
- statuts GitHub #214 à #224 réconciliés ;
- Round suivant : `UI-PAGE-AUDIT-001`, Home en première page, audit avant construction.
