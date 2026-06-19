# Vague 6 — Readiness runtime : mémoire et continuité

Statut : `AUDITED_FOUNDATION_EXISTS_EXTENSION_GATED`

## Fondations réellement présentes

- `memory_cards` privés et scopés ;
- `room_checkpoints` limités, avec rollback léger ;
- `rag_context_packs` cités, stale/expired ;
- snapshots contextuels pour actions sensibles ;
- observabilité/jobs/audit existants.

## Manques à ne pas masquer

- timeline append-only et relations de mémoire explicites ;
- Version Change Ledger et compatibilité lisible ;
- rétention/versioning métier ;
- receipts de release, sauvegarde, incident et recovery ;
- preuve fraîche que le live historique est sain.

## Livraison sûre proposée

1. Read models de provenance sur les fondations existantes.
2. Tables additives de timeline/changement/relations, sans migration de contenu.
3. Registre de receipts D12 en lecture/écriture owner avec audit.
4. Tests stale/revoked, scope, non-réécriture, rollback et séparation
   observé/hypothèse.
5. Aucun redéploiement, migration live ou restart avant preflight hôte et
   sauvegarde confirmée.
