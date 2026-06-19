# Vague 5 — Préparation runtime : resolver de références D08

Statut : `AUDITED_SPEC_READY_PROVIDER_LOCKED`

## Réel dans Git

Le dépôt possède le vocabulaire de manifest (`schema_templates`), un job générique
`asset_prepare`, un runner image scaffoldé et des profils de tâches. Il ne possède
pas encore de persistance d'asset généré, de snapshot de génération, de stockage
privé, de review D08 ou de rapport DA post-génération.

## Première tranche runtime sûre

1. Persister un manifest D08 et le Reference Status Board en lecture/écriture
   privée, sans provider.
2. Ajouter le resolver lecture seule qui sélectionne uniquement les références
   qualifiées et accessibles.
3. Écrire un snapshot immuable pour l'Action Ready preview.
4. Exposer un read model owner/admin expliquant sélection, manques, refus et
   gates.
5. Tester les scopes, références privées, références rejetées, conflits DA et
   absence de provider.

## Garde de déploiement

La première tranche ajoute des tables et constitue donc une migration additive.
Elle est techniquement isolable, mais doit passer par la même gate que le roster
: sauvegarde vérifiable, plan de rollback, tests de compatibilité sur base
existante et GO explicite juste avant activation réelle.

Le provider reste verrouillé après cette tranche. Les conditions minimales pour
le déverrouiller restent : stockage privé, lifecycle candidat, Validation Inbox
D08, rapport post-génération et preuve de déploiement.
