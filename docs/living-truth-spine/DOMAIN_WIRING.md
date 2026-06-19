# Living Truth Spine — Raccordement des domaines

Statut : `CANON_WIRING_DOCUMENTED_RUNTIME_NOT_YET_CHANGED`

Ce document rend explicite l'application du Living Truth Spine aux domaines
actifs. Il ne crée ni migration, ni synchronisation externe, ni promesse de
runtime déjà déployé.

| Domaine | Objets de vérité requis | Effet produit | Tranche Git à préparer | Statut |
|---|---|---|---|---|
| D02 Sources & Context | source, version, profil de contexte, identité si nécessaire | répondre avec contexte autorisé et traçable | références de version dans Context Pack / audit | future |
| D05 Teaching | classe, cohorte, roster, identité, versions | ne plus deviner les participants ou scopes | modèle classe/cohorte/roster sans import | future |
| D06 Correction | roster, identité, source orale, sujet, barème, profil | correction contextualisée et rejouable | références immuables dans run/feedback | future |
| D08 DA | référence, droits, review, continuité, manifest | génération guidée par des références validées | registre + resolver avant provider | future |
| D12 Continuité | release, backup, incident, recovery, smoke | état de déploiement compréhensible et prouvé | receipt/recovery read model | future |

## Règles de livraison

1. Schéma et permissions avant interface ou automatisation.
2. Écritures candidates et review avant toute promotion canonique.
3. Migration seulement après contrat, sauvegarde prouvée, plan de rollback et
   tests ciblés.
4. Chaque release rattache son SHA, son smoke et son état de recovery.
5. Les imports de roster, les providers DA et les actions externes restent
   explicitement gated.

## Prochaine verticale à implémenter

`classe/cohorte -> roster versionné -> transcription orale -> Context Pack
correction -> feedback candidat -> validation prof -> dossier privé`.

Elle restaure le besoin le plus immédiat du legacy sans activer une collecte
automatique, une migration de données existantes ou une décision pédagogique
automatique.
