# Contrat de clôture documentaire — merge du Lot 2

Date : 2026-08-01

Base : `origin/main` au commit `cd9f26ba62f464c4acfb30f061a5ee39bece2796`

## Contrat

- Intention produit : aligner MASTERBUILD sur le merge réel de la gouvernance GitHub.
- Partie du canon concernée : pilotage opérationnel Git uniquement.
- Ce qui doit changer : marquer la PR #217 mergée, inscrire son SHA, clôturer GTC-L2-001 et
  orienter vers GTC-L3-001 Shell/Dock et assets actifs.
- Ce qui ne doit pas changer : code, backend, frontend, assets, protections GitHub, labels,
  permissions, runtime, providers, PR #214 et déploiement.
- Critère simple de succès : `main` annonce le Lot 2 terminé au SHA `cd9f26b` et propose le Lot 3
  sans le reconstruire ni le publier.
- Risque de dérive : inclure des assets candidats/archives dans le Lot 3 ou raccorder l'UI au
  backend pendant une clôture documentaire.
- Validation nécessaire : GO MALEX obtenu pour branche, documentation, commit, push, PR et merge ;
  aucun déploiement, label ou protection GitHub autorisé.

## Gate

- JSON MASTERBUILD valide ;
- tests MASTERBUILD verts ;
- diff documentaire uniquement ;
- `git diff --check` vert ;
- PR #214 inchangée ;
- aucun asset, code, protection, label ou déploiement.
