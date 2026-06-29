# MasterFlow — plan global d'absorption et reprise anti-coupure

Statut : `control_plan_active`.
Source de vérité logicielle : `/Users/malex/Documents/Playground/MASTERFLOW` aligné sur GitHub `main`.

## Objectif

Reprendre les chantiers MasterFlow par vagues atomiques sans dérive produit et sans perte de
contexte quand une session Codex s'interrompt par manque de crédits.

Chaque vague doit laisser assez de traces pour qu'un autre compte Codex puisse reprendre sans
deviner : état, prochaine action, preuve de publication ou blocage.

## Règle de reprise

Au démarrage d'une session :

1. `git fetch --all --prune` ;
2. lire `CLAUDE.md`, `SUIVI.md`, `.opencode/INBOX.md`, `INBOX_MALEX.md`, `INBOX_VINCENT.md` et
   `SYNC_THREAD_MALEX_VINCENT.md` ;
3. vérifier `HEAD == origin/main` ou expliquer le delta ;
4. reprendre toute vague active indiquée dans `SUIVI.md` ;
5. ne jamais prétendre qu'un état local est publié sans preuve GitHub.

## Queue globale des vagues

| Ordre | Vague | Intention | Statut initial | Règle de sortie |
|---:|---|---|---|---|
| 0 | État zéro / réalignement suivi | Corriger les statuts ambigus et rendre la reprise lisible | active | `SUIVI.md` contient un checkpoint clair et les PRs déjà mergées sont reflétées |
| 1 | Plan d'absorption canonique | Classer audits BP, legacy, factories, OpenMontage/design, voix, sécurité et DA narrative | queued | matrice déjà représenté / candidat / à intégrer / futur / rejeté / bloqué |
| 2 | Security Fabric | Formaliser injection, RAG poisoning, permissions, sources non fiables et actions sensibles | queued | contrat + tests candidats, sans provider/live |
| 3 | Trust Fabric | Séparer confiance utilisateur, source, lien/fichier et charge système/provider | queued | gauges définies comme opérationnelles, contextuelles et réversibles |
| 4 | Safety State Machine narrative | Créer états de recadrage, suspicion, fermeture, hard stop et rétablissement | queued | états reliés à alertes godmode et réactions persona sans ban automatique |
| 5 | Voice / Persona Voice | Auditer TTS existant et raccorder aux personas sans moteur concurrent | queued | P1 TTS contrôlé, whitelist, limites et permissions ; STT reste futur |
| 6 | Experience Fabric consolidation | Relier Event Spine, précédents, canon narratif, storylets et grammaire visuelle | queued | ponts documentés entre DA, Theme Studio, D08, MasterStory et compagnons |
| 7 | Theme Studio / DA / Assets | Piloter thèmes, typos, palettes, assets, lore et versions événementielles | queued | continuité visuelle, justification et provenance définies |
| 8 | Learning / Teaching / Academic Integrity | Guider sans faire le travail à la place ; préparer tutos/timecodes | queued | règles pédagogiques et alertes exploitables |
| 9 | UI progressive | Home légère puis surfaces Teaching, Learn, GodMode, Theme Studio, MasterStory | queued | chaque surface consomme seulement des endpoints réels |
| 10 | Observabilité / GodMode | Timeline, alertes groupées, incidents, confiance, coûts et providers | queued | cockpit lisible, pas de spam |
| 11 | Red Team / Tests | Couvrir prompt injection, permissions, révocation, poisoning, UI safety states | queued | tests backend/front proportionnés avant publication |

## Big Pickle

Big Pickle reste en pause sauf tâche active dans `.opencode/INBOX.md` avec
`status: ready_for_big_pickle`.

Il ne reçoit que des tâches mécaniques, longues à lire, faciles à vérifier et sans arbitrage produit.
`done_unverified` signifie seulement : à relire par Codex.

## Verrous

- GitHub `main` = vérité logiciel.
- Drive, legacy, factories, OpenMontage/design = sources candidates.
- Aucune suppression, migration, provider live, déploiement ou ban automatique sans validation.
- Chaque vague doit être courte, publiable et reprenable.
