# MasterFlow Git Single Truth Recovery Plan — 2026-07-26

Statut : consolidation non destructive
Base cible : `MASTERFLOW_MASTERBUILD_V2`
Branche cible : `codex/masterbuild-v2`
Source auditée : ancien clone local `MASTERFLOW`

## Diagnostic Simple

La branche `codex/masterbuild-v2` est la meilleure base de travail partagée :

- elle est propre ;
- elle est poussée sur GitHub ;
- elle contient MASTERBUILD V2, le Lab partagé, le review cockpit et le pack Stage Actor MasterFlex ;
- elle ne mélange pas les retouches locales non stabilisées de l'ancien clone.

L'ancien clone `MASTERFLOW` contient encore de la matière utile, mais elle est mélangée avec :

- des modifications locales non publiées ;
- des assets candidats ;
- des dossiers de build locaux ;
- des branches plus anciennes ;
- des fichiers qui seraient destructeurs si on les appliquait tels quels sur V2.

Conclusion : on récupère par petites vagues, jamais par copie globale.

## Récupéré Dans Cette Vague

| Élément | Source | Destination | Statut | Raison |
|---|---|---|---|---|
| Pipeline ID assets | `docs/theme-studio/MASTERFLOW_ID_ASSET_PIPELINE_V1.md` | même chemin dans V2 | récupéré | Formalise source grande, sortie UI stable, gabarits portraits/canon |
| Runbook assets personas | `docs/theme-studio/MASTERFLOW_PERSONA_ASSET_RUNBOOK_V1.md` | même chemin dans V2 | récupéré | Procédure utile pour MasterFlex, ProfKrapu et futurs profils |
| Identity Forge tunnel | `docs/theme-studio/MASTERFLOW_IDENTITY_FORGE_TUNNEL_CONTRACT_V1.md` | même chemin dans V2 | récupéré | Contrat futur pour enquête utilisateur + canon perso |
| Builder pack états | `scripts/build-identity-state-pack.py` | même chemin dans V2 | récupéré | Normalisation stricte des portraits expressifs |
| Normalizer canon | `scripts/normalize-canon-asset.py` | même chemin dans V2 | récupéré | Gabarit canon vertical |
| Chroma connected remover | `scripts/remove-connected-chroma.py` | même chemin dans V2 | récupéré | Détourage chroma par bords, évite les lunettes/fonds contaminés |

## À Récupérer Après Revue

| Élément | Source | Statut | Action recommandée |
|---|---|---|---|
| Candidats portraits MasterFlex | `apps/frontend/src/assets/masterflex-portraits/candidates/` | candidat local | Revue visuelle MALEX puis archive ou promotion |
| Sources/candidats ProfKrapu | `apps/frontend/src/assets/profkrapu-*/candidates/` | candidat local | Revue visuelle Vincent/MALEX puis promotion |
| `profkrapu-canon-v2.png` | ancien clone | probablement dépassé par V3 | Garder seulement comme archive si utile |
| `_masterflex-canon-full.png` et PSD | ancien clone | source locale | Décider si source canon doit être versionnée ou stockée hors Git |
| Docs UI déjà présents dans V2 | ancien clone | probablement déjà absorbés | Comparer avant toute copie |
| Modifs MASTERBUILD locales de l'ancien clone | ancien clone | risque de régression | Ne pas appliquer globalement ; extraire uniquement une intention si manquante |

## À Ne Pas Importer Brutalement

| Élément | Pourquoi |
|---|---|
| `apps/masterbuild/dist/` | build local généré |
| `apps/masterbuild/node_modules/.vite/` | cache local |
| `tmp/` | artefacts temporaires |
| `.DS_Store` | bruit macOS |
| Ancien diff complet `MASTERFLOW -> codex/masterbuild-v2` | supprimerait des fichiers V2 récents si appliqué tel quel |

## Règle De Consolidation

Pour chaque élément récupéré depuis l'ancien clone :

1. vérifier s'il est absent de V2 ;
2. vérifier s'il est source, candidat, canon ou build généré ;
3. copier seulement les fichiers utiles ;
4. documenter la récupération ici ;
5. lancer un contrôle proportionné ;
6. commit/push uniquement après GO explicite.

## Prochaine Vague Recommandée

Vague `assets-candidates-review` :

1. lister les assets candidats MasterFlex et ProfKrapu encore absents de V2 ;
2. produire une table avec chemin, rôle, taille, alpha, actif/candidat/archive ;
3. demander à MALEX ce qui doit être versionné dans Git ;
4. copier uniquement les candidats validés ou les archives utiles ;
5. éviter de pousser des doublons lourds si un asset est déjà actif ou rejeté.

## Décision Recommandée

Continuer sur `MASTERFLOW_MASTERBUILD_V2`.

Ne pas reclone tant que :

- les docs/process récupérés ne sont pas commit/push ;
- les assets candidats ne sont pas classés ;
- l'ancien clone n'a pas été archivé ou marqué comme source historique.
