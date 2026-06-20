# Déduplication des déploiements et audits historiques — 2026-06-20

## Diagnostic

Les 1 278 artefacts `11_DEPLOYMENT` et 413 fichiers `10_AUDITS` sont intégralement présents,
mais ils ne constituent pas une preuve de déploiement actuel. Ils mélangent messages de sync,
packs de ressources, extractions narratives, payloads Comfy, handoffs, médias et rapports datés.

## Contrat de déploiement

- Intention produit : transformer l'historique en preuves consultables sans le confondre avec GitHub `main` ou le live.
- Partie du canon concernée : D12 Runtime Continuity, D11 backflow et ledgers de réconciliation.
- Ce qui doit changer : index exact par hash, catégories et règles de preuve.
- Ce qui ne doit pas changer : aucun fichier legacy supprimé/déplacé, aucun script exécuté, aucun hôte touché.
- Critère simple de succès : 1 691/1 691 fichiers lus, doublons exacts identifiés, live toujours déclaré inconnu.
- Risque de dérive : critique si un handoff, ZIP, payload ou ancien audit est traité comme runtime actif.
- Validation nécessaire : non pour audit ; oui avant suppression, migration, recovery ou déploiement.

## Résultat exhaustif

| Mesure | Résultat |
|---|---:|
| Artefacts de déploiement | 1 278 |
| Fichiers d'audit | 413 |
| Fichiers lus | 1 691 |
| Fichiers manquants | 0 |
| Groupes de doublons exacts SHA-256 | 110 |
| Fichiers présents dans ces groupes | 253 |
| Copies exactes redondantes théoriques | 143 |
| Suppressions réalisées | 0 |

L'index machine-readable complet est
`DEPLOYMENT_AUDIT_EXACT_DEDUP_INDEX_2026-06-20.json`.

## Répartition utile

| Catégorie | Fichiers | Statut |
|---|---:|---|
| imports de ressources candidats | 479 | candidate-only, déduplication et validation avant registre |
| extractions narratives | 287 | sources D09, jamais canon automatique |
| packs média présents sous Audits | 277 | matériel de production, pas rapports d'audit |
| packs visuels/rendu | 251 | adapters D08 historiques, pas runtime actif |
| messages de synchronisation | 142 | historique de coordination, jamais autorité actuelle |
| rapports d'audit réels | 136 | preuves datées à confronter au Git actuel |
| protocoles/autres déploiements | 65 | candidats D12, pas preuve live |
| handoffs/blueprints | 54 | intentions et snapshots obsolescibles |

## Doublons significatifs

- 18 prompts DA identiques dans la Subject Library : probable template partagé, pas 18 vérités indépendantes.
- 8 `.gitkeep` identiques : structure vide attendue, aucune donnée.
- 6 `.DS_Store` identiques : bruit système, conservé car aucune suppression autorisée.
- 5 payloads provider Comfy identiques : adapter partagé, pas cinq providers actifs.
- plusieurs fichiers BDD/UI et messages inbox/outbox sont des copies exactes entre handoffs.
- des sources Batrasia existent à la fois en `CURRENT`, `OLD` et audit : la position du fichier ne prouve pas sa fraîcheur.

## Règles de preuve

```txt
handoff != implémentation
zip != runtime
payload != job exécuté
audit daté != état actuel
message sync != décision actuelle
backup/copie != restauration testée
GitHub main != live
```

## État live

Le live reste `inconnu/non vérifié`. La demande de récupération historique exige toujours :

- chemin et checksum de la base ;
- sauvegarde vérifiable ;
- SHA réellement lancé ;
- cause du 502 ;
- smoke après action et preuve de préservation des données.

Aucun de ces éléments n'est remplacé par cet audit documentaire.
