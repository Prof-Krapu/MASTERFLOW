# Roadtrip Moto Factory — Reçu de patch V1.4

Date : 2026-06-27  
Mode : patch Factory active hors Git, avec archive avant remplacement  
Statut : appliqué localement, ZIP vérifié, non publié GitHub/canon Drive

## Intention produit

Transformer la Factory Roadtrip Moto en pilote robuste pour :

- préparation et accompagnement voyage ;
- véracité et sécurité terrain depuis GPX ;
- extraction Dataviz candidate ;
- extraction de primitives `MasterHelp / Situation Companion` réutilisables.

La Factory ne canonise pas MasterFlow. Elle produit des candidats d'inbox.

## Sources touchées

Factory active :

- `/Users/malex/Desktop/FACTORIES/ROADTRIP_MOTO/CURRENT/ROADTRIP_MOTO_COPILOT_V1`

ZIP actif :

- `/Users/malex/Desktop/FACTORIES/ROADTRIP_MOTO/CURRENT/ROADTRIP_MOTO_COPILOT_V1.zip`

Archive créée avant remplacement :

- `/Users/malex/Desktop/FACTORIES/ROADTRIP_MOTO/ARCHIVE/2026-06-27_v1_3_pre_masterhelp_dataviz`

## Version active

- Version : `2026.06.27-v1.4`
- Statut manifest : `READY_WITH_LIMITS — STATIC_TESTED, MASTERHELP_DATAVIZ_PATCHED, PLATFORM_PILOT_PENDING`
- Nombre de fichiers actifs : 13
- SHA-256 ZIP : `997bfb4f84c11161c20d3b02ec13d59bfbe7baa6eb7b3a9265d3a04b11da7f03`

## Fichiers Factory modifiés ou ajoutés

- `MANIFEST.md`
- `01_PROJECT_INSTRUCTIONS.md`
- `KNOWLEDGE/DATAVIZ_EXTRACTION_AND_REUSE_PLAN.md`
- `KNOWLEDGE/MASTERHELP_SITUATION_COMPANION.md` ajouté
- `README_ENVOI.md`

## Capacités ajoutées

- Boot plus explicite : détection contexte, niveau de guidage, situation voyage.
- Séparation stricte :
  - `ROADTRIP_ONLY`
  - `MASTERHELP_PORTABLE`
  - `DATAVIZ_PORTABLE`
  - `LOCAL_ONLY`
  - `REJECTED_RISK`
- Commandes :
  - `EXTRACTION MASTERHELP`
  - `PRÉPARER CANDIDAT MASTERFLOW`
  - `AUDIT DATAVIZ`
- Exports candidats :
  - `masterhelp_primitive_candidate`
  - `dataviz_backflow_candidate`
  - `masterflow_backflow_candidate`

## Vérifications

- ZIP : `unzip -t` OK, aucune erreur de compression.
- Outil GPX : compilation syntaxique Python OK via `compile(...)`.
- Repo docs : `git diff --check` OK.

## Limites conservées

- Aucun GPS continu.
- Aucun moteur de routage natif garanti.
- Aucun provider externe garanti.
- Aucun export GPX dérivé ne peut être déclaré fiable sans comparaison géométrique.
- Toute information critique terrain reste soumise à vérification, niveau de confiance et fallback.
- Aucune absorption canon automatique.

## Prochaine action recommandée

Tester la Factory dans un projet ChatGPT pilote avec un GPX réel, puis produire :

1. un `CHECKPOINT` ;
2. une `EXTRACTION DATAVIZ` ;
3. une `EXTRACTION MASTERHELP` ;
4. un `PRÉPARER CANDIDAT MASTERFLOW`.

Ces sorties pourront ensuite alimenter D11 Factory Backflow ou la future spec MasterHelp.
