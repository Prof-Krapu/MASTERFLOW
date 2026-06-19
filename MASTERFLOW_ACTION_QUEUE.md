# MasterFlow — Action Queue

Dernière mise à jour : 2026-06-19

## 1. À faire maintenant

### Vague 6C — Factory Backflow Intake manuel

- Tâche : recevoir un Factory Passport et un export backflow JSON comme candidat traçable, puis les projeter dans l'Inbox partagée.
- Impact : ouvre une frontière de réabsorption contrôlée sans assimiler une factory portable au runtime MasterFlow.
- Risque : moyen, contenu par JSON strict, admin/godmode, quarantaine obligatoire, privacy/simulation/security gates et absence d'effet externe.
- Source de vérité concernée : D11 Factory Passport Backflow Contract + Domain Card + Shared Validation Inbox.
- Statut : terminé : PR #42 runtime + PR #43 preuve, `main` = `c0a98bb` ; pont Drive vérifié. ZIP, fichiers, URL, import, installation et activation runtime restent futur/verrouillés.
- Validation requise : GO MALEX reçu ; publication autorisée par la consigne continue.

### Vague 6A — Native Usage Harvester D11-D12

- Tâche : extraire automatiquement des apprentissages candidats depuis des événements internes sourcés, puis les router vers les GodModes fonctionnels.
- Impact : MasterFlow apprend des échecs, blocages et rejets sans demander une extraction manuelle.
- Risque : moyen, contenu par métadonnées minimales, confidentialité `do_not_export`, déduplication et revue humaine.
- Source de vérité concernée : Kernel Usage Learning + D11 + D12 + contrat Usage Harvester.
- Statut : mergé sur `main` via PR #38 (`7ec5baa`) : ciblés 43/43, backend 347/347, TypeScript OK.
- Validation requise : GO MALEX reçu ; aucune écriture canon ou action externe autorisée.

### Vague 6B — Sources structurées Teacher Delta + Finding D12 validée

- Tâche : alimenter le Usage Harvester depuis les corrections humaines structurées et les findings explicitement validées.
- Impact : apprend des arbitrages réels sans analyser les conversations ou notes libres.
- Risque : faible à moyen, borné par permission existante, statut validé et références uniquement.
- Source de vérité concernée : D05-D06 Teacher Decision Delta + D12 findings + D11 Usage Harvester.
- Statut : mergé sur `main` via PR #40 (`5b1acae`) : ciblés 37/37, backend 347/347, TypeScript et build frontend OK.
- Validation requise : GO MALEX reçu ; aucune observation D12 non validée ne traverse.

### Vague 5B — Appliquer le hard-stop à une sélection explicite

- Tâche : prévisualiser, cocher puis geler uniquement les actions sensibles choisies.
- Impact : rend le stop réellement actionnable sans invalidation de masse cachée.
- Risque : moyen, contenu par sélection vide par défaut et transaction atomique.
- Source de vérité concernée : `HARD_STOP_ACTION_PRIORITY`, `RESET_GRANULARITY`,
  `ACTION_EXPIRES_AFTER_CONTEXT_CHANGE`.
- Statut : mergé sur `main` via PR #21 (`0844358`), vérifié 336/336.
- Validation requise : acquise par GO global MALEX ; aucune auto-application autorisée.

### Vague 5C — État hard-stop persistant

- Tâche : maintenir un stop owner+Room explicite et une reprise teacher+ sans réactiver les actions stale.
- Impact : empêcher qu'une nouvelle action sensible soit créée juste après le gel de la sélection.
- Risque : élevé si le stop bloque trop large ou devient automatique.
- Source de vérité concernée : `HARD_STOP_ACTION_PRIORITY`, Process Control Strip.
- Statut : mergé sur `main` via PR #25 (`64aa5a0`), vérifié 339/339 et visible dans le cockpit.
- Validation requise : acquise ; aucune activation automatique autorisée.

### Vague 5D — Context hash snapshots

- Tâche : conserver le snapshot privé et le comparateur read-only avant toute politique plus automatique.
- Impact : complète l'expiration autrement que par un stop manuel.
- Risque : moyen en audit, élevé si invalidation automatique trop large.
- Source de vérité concernée : `ACTION_EXPIRES_AFTER_CONTEXT_CHANGE`.
- Statut : mergé sur `main` via PR #29 (`54b97cf`), visible via PR #32 ; vérifié 341/341 ; aucune invalidation automatique ouverte.
- Validation requise : acquise pour politique V1 ; aucune mutation runtime supplémentaire.

### Vague 5E — Visibilité owner du comparateur contextuel

- Tâche : afficher `unchanged`, `requires_review` ou `inconclusive` avec la prochaine action sûre.
- Impact : rend le snapshot utilisable sans automatiser le re-preflight.
- Risque : faible, lecture seule.
- Source de vérité concernée : politique V1 context change + Action Context Snapshot.
- Statut : mergé sur `main` via PR #32 (`09140e8`), lecture seule.
- Validation requise : non pour lecture seule.

### Vague 5A — Preview hard-stop

- Tâche : montrer les actions sensibles ouvertes qui seraient rendues stale par un stop.
- Impact : permet de vérifier le périmètre avant une invalidation réelle.
- Risque : faible ; lecture seule, aucune mutation.
- Source de vérité concernée : canon Process Control + Action Expiry + runtime GitHub.
- Statut : mergé sur `main` via PR #19 (`0fa4959`).
- Validation requise : autorisation permanente MALEX reçue pour commit/push/PR/merge.

### Vague 4E — Findings D12 dans la Shared Validation Inbox

- Tâche : projeter les findings D12 non décidées dans l'inbox commune admin/godmode.
- Impact : centralise les décisions owner sans créer une queue D12 parallèle.
- Risque : faible à moyen ; une approbation ne doit jamais devenir fix, déploiement ou canon.
- Source de vérité concernée : canon D12 + Shared Validation Inbox + runtime GitHub.
- Statut : mergé sur `main` via PR #17 (`a72b809`).
- Validation requise : autorisation permanente MALEX reçue pour commit/push/PR/merge.

### Vague 0 — vérité de pilotage

- Tâche : distinguer partout `GitHub main`, `testé`, `déployé live` et `vérifié live`, puis neutraliser les faux blocages Vincent.
- Impact : évite de confondre merge GitHub et instance réellement publiée.
- Risque : faible ; documentation et signalement uniquement.
- Source de vérité concernée : GitHub `main`, pont Drive, inbox et ledger.
- Statut : fait ; cockpit et vérité de publication mergés depuis PR #7, Drive rafraîchi jusqu'à PR #35.
- Validation requise : non ; distinction GitHub/live à conserver.

### Vague 1 — Owner Cockpit D12 runtime

- Tâche : exposer un agrégat admin/godmode en lecture seule pour validations, jobs, capacités, alertes et prochaine action sûre.
- Impact : donne une lecture produit de l'état runtime sans parcourir les logs techniques.
- Risque : faible à moyen ; risque principal = revendiquer une sync GitHub/Drive non prouvée.
- Source de vérité concernée : canon D12 + runtime GitHub.
- Statut : mergé sur `main` via PR #7 ; le runtime affiche toujours `non vérifié` sans SHA de release injecté.
- Validation requise : non pour la lecture ; oui avant tout déploiement live.

### Vague 2 — Teaching D05 actions guidées

- Tâche : démarrer une session privée depuis un guide validé, répondre, avancer et terminer dans Teaching.
- Impact : rend la première verticale D05 réellement utilisable sans ouvrir D06.
- Risque : moyen ; consentement, scope et frontière D05/D06 doivent rester visibles.
- Source de vérité concernée : canon D05 + Guided Runtime GitHub.
- Statut : mergé sur `main` via PR #8 ; recette isolée publiée via PR #34-35.
- Validation requise : autorisation permanente MALEX reçue pour commit/push/PR/merge.

### Queue safe post-Vincent

- Tâche : retirer Vincent comme dépendance bloquante et classer les prochains chantiers par risque.
- Impact : permet d'enchaîner les audits/specs/queues sans attendre une relecture externe.
- Risque : faible ; documentation et pilotage uniquement.
- Source de vérité concernée : canon MasterFlow + GitHub `main` + fichiers de suivi.
- Statut : fait, mergé dans `main` via PR #6.
- Validation requise : non, GO MALEX reçu pour les actions sans risque avec commit/push progressif.

### Audit D06 export preview → Validation Inbox

- Tâche : produire une spec d'audit pour `correction_export_preview` comme deuxième projection D06 possible.
- Impact : prépare la suite logique après `feedback_draft`, sans confondre preview privée et envoi étudiant.
- Risque : faible en audit/spec ; élevé seulement si implémenté sans garde-fous.
- Source de vérité concernée : canon D06 + Shared Validation Inbox + GitHub.
- Statut : mergé sur `main` via PR #9 ; recette D06 + inbox 26/26 publiée via PR #34-35.
- Validation requise : acquise pour la preview privée ; export réel et envoi restent verrouillés.

## 2. À mettre en queue

### Auditer le runtime Usage Harvester → GodModes

- Tâche : comparer le nouveau contrat canon D11/D12 au runtime GitHub avant toute implémentation.
- Impact : vérifier que MasterFlow sait extraire, qualifier, dédupliquer et router automatiquement les apprentissages d'usage.
- Risque : faible en audit ; élevé seulement si une extraction native est confondue avec une écriture automatique du canon ou expose des données privées.
- Source de vérité concernée : Kernel + D11 + D12 + contrat Usage Harvester.
- Statut : audit terminé ; V1 native implémentée sur événements workflow nettoyés. Les sources conversationnelles et imports portables restent hors scope.
- Validation requise : GO MALEX reçu pour la V1 ; oui avant toute source privée supplémentaire.

### Classer les deux factories Claude Project

- Tâche : garder les packs rédaction/SEO et gestion de projet comme pilotes terrain, sans les absorber dans le canon.
- Impact : évite que des retours/outils externes deviennent canon automatiquement.
- Risque : faible en classement ; moyen si installation/export réel.
- Source de vérité concernée : D11 Factories Backflow.
- Statut : à garder en queue terrain ; une réception JSON V6C ne vaut ni installation ni absorption canon.
- Validation requise : oui avant absorption canon ou installation risquée.

## 3. À faire quand j'ai des tokens

- Tâche : recette D05-D06 avec une vraie session guidée puis un feedback candidat.
- Impact : vérifie le flux réel de bout en bout avec données autorisées.
- Risque : faible.
- Source de vérité concernée : canon D05-D06 + runtime GitHub.
- Statut : fait et publié via PR #34 : D05 12/12, D06 + inbox 26/26, backend 341/341 ; aucun effet externe.
- Validation requise : non pour l'audit.

## 4. À vérifier contre canon / GitHub

- Tâche : vérifier que les anciennes demandes Vincent déjà `done` ne cachent plus de dépendance active.
- Impact : nettoie le pilotage et évite d'attendre une personne qui a clôturé sa partie.
- Risque : faible.
- Source de vérité concernée : `INBOX_MALEX.md`, `INBOX_VINCENT.md`, GitHub `main`.
- Statut : fait ; handoff clôturé, anciennes entrées `open` neutralisées comme historique.
- Validation requise : non.

- Tâche : vérifier que la matrice canon ↔ GitHub reflète le `main` courant.
- Impact : évite une alerte de sync fausse après merge D06.
- Risque : faible.
- Source de vérité concernée : GitHub `main`, Drive bridge, fichiers de pilotage.
- Statut : fait ; GitHub et pont Drive réalignés après la dernière PR de preuve, SHA exact dans le snapshot Drive.
- Validation requise : non.

## 5. À décider plus tard

- Tâche : stockage fichiers, export étudiant, génération D08 et détecteur D12 automatique.
- Impact : capacités lourdes et sensibles.
- Risque : élevé.
- Source de vérité concernée : D06, D08, D12.
- Statut : futur/verrouillé.
- Validation requise : oui.
