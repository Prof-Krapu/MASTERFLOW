# Contrat de clôture documentaire — merge du Lot 1

Date : 2026-07-31

Base : `origin/main` au commit `65807a8b7ad1aba2efbd8f8deee9db884e99796e`

## Contrat

- Intention produit : faire refléter dans MASTERBUILD la vérité Git après le merge du Lot 1.
- Partie du canon concernée : pilotage opérationnel Git uniquement.
- Ce qui doit changer : marquer la PR #215 mergée, inscrire son SHA, clôturer la publication du
  Lot 1 et orienter vers le Lot 2 Gouvernance GitHub.
- Ce qui ne doit pas changer : code MASTERBUILD, backend, frontend, assets, permissions, runtime,
  providers, PR #214 et déploiement.
- Critère simple de succès : `main` reprend un état partagé qui annonce le Lot 1 mergé au SHA
  `65807a8` et propose le Lot 2 sans l'exécuter.
- Risque de dérive : déclarer le Round global clôturé alors que les Lots 2 à 4 restent ouverts.
- Validation nécessaire : GO MALEX obtenu pour branche, documentation, commit, push, PR et merge ;
  aucun déploiement autorisé.

## Allowlist

- `docs/masterbuild/MASTERBUILD_STATE.json` ;
- `docs/masterbuild/MASTERBUILD_WORKBOARD.json` ;
- `docs/masterbuild/MASTERBUILD_SOURCE_REGISTRY.json` ;
- Round, handoff, stratégie et rapport GIT-CONSOLIDATION-001 ;
- `SUIVI.md` ;
- `MASTERFLOW_DEPLOYMENT_LEDGER.md`.

## Gate

- JSON MASTERBUILD valide ;
- tests MASTERBUILD verts ;
- diff documentaire uniquement ;
- `git diff --check` vert ;
- PR #214 inchangée ;
- aucun déploiement.
