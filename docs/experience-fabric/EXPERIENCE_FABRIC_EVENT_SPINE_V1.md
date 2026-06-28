# Experience Fabric — Event Spine V1

## Intention

Donner une chronologie explicable des événements MasterFlow sans remplacer les journaux métier
existants ni ouvrir une exécution automatique.

## Contrat

- `DomainEventEnvelope` projette audit, workflow, narration, jobs et progression.
- La projection expose provenance, cause, résultat et scope, jamais les payloads bruts.
- `GET /api/v1/experience/events` retourne une timeline permissionnée.
- `GET /api/v1/experience/snapshot` reconstruit un état synthétique et un fingerprint déterministe.
- Un godmode extérieur ne traverse pas un projet privé par son seul rang global.

## Limites V1

- aucun nouvel event store ;
- aucun replay qui réexécute une action ;
- aucune mutation, canonisation ou correction automatique ;
- aucune donnée secrète ou payload métier brut dans l’enveloppe.

## Suite

Le Precedent Engine pourra référencer les événements, checkpoints, décisions et cartes mémoire sans
dupliquer leur contenu.
