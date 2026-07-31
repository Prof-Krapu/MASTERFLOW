# Contrat de publication — Lot 2 Gouvernance GitHub

Date : 2026-08-01

Branche : `codex/github-governance`

Base : `origin/main` au commit `36207626223160153494aa31c4246393cdbfa188`

## Contrat

- Intention produit : rendre les contributions MALEX/Vincent plus lisibles sans changer le produit.
- Partie du canon concernée : gouvernance GitHub opérable uniquement.
- Ce qui doit changer : ajouter `CODEOWNERS`, quatre formulaires d'issue, leur configuration et un
  template de pull request commun.
- Ce qui ne doit pas changer : code, backend, frontend, assets, permissions applicatives, runtime,
  providers, migrations, protection de branche, PR #214 et déploiement.
- Critère simple de succès : une draft PR isolée permet à MALEX et Vincent de relire ownership,
  catégories et charge opérationnelle.
- Risque de dérive : rendre chaque contribution bloquante ou dépendante de labels inexistants.
- Validation nécessaire : GO MALEX obtenu pour branche, analyse, commit, push et draft PR ; nouveau
  GO requis avant merge, création de labels, protection de branche ou déploiement.

## Allowlist

- `.github/CODEOWNERS` ;
- `.github/ISSUE_TEMPLATE/backend-constraint.yml` ;
- `.github/ISSUE_TEMPLATE/bug.yml` ;
- `.github/ISSUE_TEMPLATE/config.yml` ;
- `.github/ISSUE_TEMPLATE/observation.yml` ;
- `.github/ISSUE_TEMPLATE/product-proposal.yml` ;
- `.github/pull_request_template.md` ;
- rapport d'impact et registres MASTERBUILD associés.

## Gate

- YAML des formulaires valide ;
- labels référencés existants ;
- ownership GitHub explicite ;
- diff documentaire et `.github` uniquement ;
- `git diff --check` vert ;
- aucun merge ni déploiement.
