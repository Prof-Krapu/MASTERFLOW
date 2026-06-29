# Experience Fabric — Living Companion Robot CDC V1

Statut : V1 locale, guide permissionné sans autonomie silencieuse.

## Intention

Faire du Guided Runtime existant le premier compagnon vivant concret de MasterFlow.

Le Robot CDC IA :

- aide un groupe à comprendre et découper son besoin ;
- affiche la question déclarée dans le guide figé ;
- rend visibles progression, contradictions et prochaines étapes ;
- oriente vers le professeur ou facilitateur lorsqu'une décision est nécessaire ;
- ne rédige pas le CDC à la place du groupe.

## Sources runtime

- session guidée privée et permissionnée ;
- snapshot versionné du guide et du schéma ;
- progression déterministe depuis les champs requis ;
- storylets `companion` calculées depuis l'état réel de la session ;
- références de personas fonctionnelle et lore déclarées par le créateur.

## Surface

`GET /api/v1/experience/companions/guided-sessions/:sessionId`

La réponse fournit :

- identité et rôle du compagnon ;
- mode d'interaction pleine page guidée ;
- bulle contextuelle courte ;
- question courante et progression ;
- intentions disponibles ;
- storylets et blocages ;
- diagnostics de configuration et de références persona.

## Verrous

- scope privé identique à la session guidée ;
- question absente du guide = blocage, jamais invention ;
- contradiction = validation humaine ;
- persona ou lore = aucune permission supplémentaire ;
- politique `guide_only` ;
- aucune génération d'asset, évolution visuelle, publication, export, provider ou écriture canon.

## Suite

Cette verticale valide le contrat partagé. Les prochaines tranches pourront réutiliser la même
projection pour MOTH, puis pour le monstre Ours d'Or, avec leurs propres règles d'identité,
d'évolution et de rendu.
