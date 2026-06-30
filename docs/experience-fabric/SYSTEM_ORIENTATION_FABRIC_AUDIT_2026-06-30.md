# System Orientation Fabric — audit transversal sans UI

Date : 2026-06-30
Statut : local, non publié
But : retirer l’UI du rush système et vérifier si MasterFlow sait se repérer dans ses propres registres.

## Verdict

MasterFlow possède déjà beaucoup de briques solides : actions, runtime packs, permissions,
Experience Fabric, Storylets, Trust/Safety, Inventory, DA Registry, Visual Knowledge Fabric et
Factories Backflow. Le manque principal n’est pas un domaine isolé, mais une couche de lecture
transversale.

La brique ajoutée par cette tranche est donc une **Orientation Fabric diagnostic-only** : elle
ne crée aucune permission, n’exécute aucune action, n’importe aucune Factory et ne génère aucun
asset. Elle lit les registres existants et expose une boussole : domaines, capacités, blocages,
risques, gates et prochaines actions candidates.

## Matrice

| Domaine | Registry | Resolver | Compiler | Lint | Explication | Gate | Gap |
|---|---|---|---|---|---|---|---|
| DA / Visual Fabric | implémenté/partiel | partiel | partiel | partiel | partiel | partiel | moteur vide OK, absorption massive interdite |
| MasterStory | partiel | partiel | inconnu | inconnu | partiel | partiel | character knowledge/acting à recroiser |
| Inventory / Resources / Outputs | implémenté | partiel | inconnu | partiel | partiel | partiel | besoin d’un registry explicable comparable à DA |
| Factories | externe/candidat | externe | absent | partiel | partiel | validation humaine | routeur Desktop utile, pas runtime MasterFlow |
| Runtime / Actions | implémenté | implémenté | n/a | partiel | partiel | implémenté | besoin d’une vue unique domaine → action |
| Security / Trust | implémenté/partiel | partiel | n/a | partiel | partiel | implémenté | relier safety state, trust et alertes godmode |
| Personas / Voice / Style | partiel | partiel | partiel | partiel | partiel | consentement | Expressive Canon doit rester Style Mirror |
| Teaching / Learning | implémenté/partiel | partiel | inconnu | partiel | partiel | partiel | progression, integrity et resources à réunifier |

## Sources consultées

- `CLAUDE.md`
- `SUIVI.md`
- `.opencode/INBOX.md`
- `INBOX_MALEX.md`
- `INBOX_VINCENT.md`
- `apps/backend/src/engines/action_registry.ts`
- `apps/backend/src/services/runtime_loadout.ts`
- `apps/backend/src/services/runtime_pack_registry.ts`
- `apps/backend/src/services/visual_knowledge_fabric.ts`
- `/Users/malex/Desktop/FACTORIES/_MASTERFLOW_ROUTER/00_README_ROUTER.md`
- `/Users/malex/Desktop/FACTORIES/MASTERFLOW_FACTORY_COMMON_CDC_V1_CANDIDATE.md`

## Décisions

- UI retirée du rush système.
- Factories Desktop = atelier externe ; seules les primitives candidates remontent.
- DA Registry actuelle = fondation technique utile, pas encyclopédie remplie.
- Visual Knowledge Fabric conserve un registre sans entités propriétaires, mais expose désormais
  des jauges système génériques pour piloter une future DA : morphologie, style, texture, détail,
  couleur, acting, continuité canon et lisibilité output.
- Orientation Fabric = méta-couche de lecture, pas moteur concurrent.
- Big Pickle reste en pause tant qu’aucune tâche mécanique n’est prête.

## Contrat runtime

- Endpoint : `GET /api/v1/experience/orientation`
- Politique : `diagnostic_only`
- Entrées : `project_id`, `active_mode`, `domain_id`, `include_future`
- Sorties : domaines, capacités, blocages, prochaines actions candidates, invariants.
- Interdits : exécution, mutation, génération, canonisation, import Factory, provider live.

## Prochaine vague recommandée

`ORIENTATION-FABRIC-002` : brancher cette boussole aux domaines manquants sans UI :

1. renforcer les cartes domaine depuis les services réels ;
2. ajouter les gaps Story / Inventory / Security sous forme de capabilities explicites ;
3. préparer le backflow Factory natif sans importer les packs ;
4. garder les actions sensibles derrière Validation Inbox.

## Ajout Factory Backflow natif

La tranche `FACTORY-BACKFLOW-NATIVE-001` ajoute une carte de capacités D11 :

- endpoint : `GET /api/v1/backflow/capability-map` ;
- accès : admin ;
- politique : `diagnostic_only` ;
- autorise : lecture des routes primitives et des interdits ;
- interdit : import ZIP, fetch externe, import complet, runtime activation, auto-canon.

Cette carte ne remplace pas le routeur Desktop. Elle transforme son principe en surface runtime
lisible : une Factory reste externe, seule une primitive candidate peut être routée.

## Ajout Inventory Capability Map

La tranche `INVENTORY-CAPABILITY-MAP-001` ajoute une carte scoped :

- endpoint : `GET /api/v1/inventory/capability-map` ;
- accès : utilisateur authentifié, avec comptage limité à ce qu’il peut lire ;
- politique : `diagnostic_only` ;
- primitives : items, collections, besoins projet, candidats OCR/photo, outputs futurs ;
- invariants : candidate ≠ canon, disponibilité jamais garantie, match consultatif, OCR relu humainement.

Cette carte ne remplace pas Inventory. Elle rend lisible son état produit et prépare l’Output
Registry transversal.

## Ajout Security / Trust Capability Map

La tranche `SECURITY-TRUST-FABRIC-001` ajoute une carte diagnostic :

- endpoint : `GET /api/v1/diagnostics/security-trust/capability-map` ;
- accès : admin/godmode via diagnostics ;
- relie : Security Guard, Trust Fabric, Safety State ;
- expose : primitives, état narratif, signaux de confiance, policy de réponse ;
- interdit : score moral composite, sanction automatique, mutation de permissions, exposition de payload brut.

Le système peut recadrer, refuser, fermer ou alerter, mais ne bannit jamais seul.

## Ajout Expressive Canon / Voice Capability Map

La tranche `EXPRESSIVE-CANON-VOICE-001` ajoute une carte diagnostic :

- endpoint : `GET /api/v1/diagnostics/expressive-canon/capability-map` ;
- accès : admin/godmode via diagnostics ;
- relie : Style Mirror, injection WebSocket bornée, métadonnée « Voix stylisée » et TTS contrôlé ;
- expose : nombre de profils, profils injectables, consentements pending/revoked, primitives et gaps ;
- confirme : Style Mirror est la base Expressive Canon, pas une table `behavior_profiles` concurrente ;
- interdit : activation forcée admin, activation professeur d’un profil étudiant, texte privé brut dans le prompt,
  modification des permissions/faits/sources/méthode par le style, appel provider voix depuis la carte.

Le TTS reste partiel : route existante, quota, timeout, taille audio et persona attendu, mais provider live,
multi-voix, coûts et consentement voix explicite restent hors de cette tranche.

## Ajout Resources / Outputs Capability Map

La tranche `INVENTORY-RESOURCES-OUTPUTS-001` ajoute une carte diagnostic :

- endpoint : `GET /api/v1/diagnostics/resource-output/capability-map` ;
- accès : admin/godmode via diagnostics ;
- relie : Resource Truth, RAG projection, Visual Manifests, Generated Assets et futur Output Registry ;
- expose : compteurs resources par statut, manifests, assets, primitives et gaps ;
- confirme : une ressource candidate n’est pas contexte fiable, un manifest n’est pas une génération,
  un asset candidat exige review, un export/live exige gate humain ;
- interdit : indexer une ressource non validée comme vérité, traiter un manifest comme asset,
  promouvoir un asset candidat en canon, appeler un provider depuis la carte.

L’Output Registry transversal reste futur : les familles existent dans plusieurs domaines, mais le
registre unique print/export/asset/video/factory doit rester une vague séparée.
