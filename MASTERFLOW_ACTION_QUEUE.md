# MasterFlow — Action Queue

Dernière mise à jour : 2026-06-19

## 1. À faire maintenant

### Vague 5B — Appliquer le hard-stop à une sélection explicite

- Tâche : prévisualiser, cocher puis geler uniquement les actions sensibles choisies.
- Impact : rend le stop réellement actionnable sans invalidation de masse cachée.
- Risque : moyen, contenu par sélection vide par défaut et transaction atomique.
- Source de vérité concernée : `HARD_STOP_ACTION_PRIORITY`, `RESET_GRANULARITY`,
  `ACTION_EXPIRES_AFTER_CONTEXT_CHANGE`.
- Statut : mergé sur `main` via PR #21 (`0844358`), vérifié 336/336.
- Validation requise : acquise par GO global MALEX ; aucune auto-application autorisée.

### Vague 5C — État hard-stop persistant — AUDIT SEULEMENT

- Tâche : définir comment un stop reste actif et comment l'owner le lève explicitement.
- Impact : empêcher qu'une nouvelle action sensible soit créée juste après le gel de la sélection.
- Risque : élevé si le stop bloque trop large ou devient automatique.
- Source de vérité concernée : `HARD_STOP_ACTION_PRIORITY`, Process Control Strip.
- Statut : mergé sur `main` via PR #25 (`64aa5a0`), vérifié 339/339.
- Validation requise : acquise ; prêt à publication.

### Vague 5D — Context hash snapshots — À mettre en queue

- Tâche : auditer les snapshots de contexte qui imposent re-preflight après changement de source.
- Impact : complète l'expiration autrement que par un stop manuel.
- Risque : moyen en audit, élevé si invalidation automatique trop large.
- Source de vérité concernée : `ACTION_EXPIRES_AFTER_CONTEXT_CHANGE`.
- Statut : audit mergé via PR #27 (`593ffba`) ; snapshot + comparateur read-only recommandés, code bloqué avant décision produit.
- Validation requise : non pour l'audit ; oui avant migration/runtime.

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
- Statut : réalisé localement sur `codex/d12-owner-cockpit-runtime` ; Drive à rafraîchir après publication.
- Validation requise : oui avant commit/push.

### Vague 1 — Owner Cockpit D12 runtime

- Tâche : exposer un agrégat admin/godmode en lecture seule pour validations, jobs, capacités, alertes et prochaine action sûre.
- Impact : donne une lecture produit de l'état runtime sans parcourir les logs techniques.
- Risque : faible à moyen ; risque principal = revendiquer une sync GitHub/Drive non prouvée.
- Source de vérité concernée : canon D12 + runtime GitHub.
- Statut : implémenté localement ; le runtime affiche `non vérifié` sans SHA de release injecté.
- Validation requise : oui avant commit/push.

### Vague 2 — Teaching D05 actions guidées

- Tâche : démarrer une session privée depuis un guide validé, répondre, avancer et terminer dans Teaching.
- Impact : rend la première verticale D05 réellement utilisable sans ouvrir D06.
- Risque : moyen ; consentement, scope et frontière D05/D06 doivent rester visibles.
- Source de vérité concernée : canon D05 + Guided Runtime GitHub.
- Statut : implémenté et vérifié localement sur `codex/d05-teaching-guided-actions` ; prêt à publier.
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
- Statut : implémenté et vérifié localement (`docs/d06/D06_EXPORT_PREVIEW_INBOX_AUDIT_2026-06-18.md`).
- Validation requise : autorisation permanente MALEX reçue ; publication automatique prête.

## 2. À mettre en queue

### Auditer le runtime Usage Harvester → GodModes

- Tâche : comparer le nouveau contrat canon D11/D12 au runtime GitHub avant toute implémentation.
- Impact : vérifier que MasterFlow sait extraire, qualifier, dédupliquer et router automatiquement les apprentissages d'usage.
- Risque : faible en audit ; élevé seulement si une extraction native est confondue avec une écriture automatique du canon ou expose des données privées.
- Source de vérité concernée : Kernel + D11 + D12 + contrat Usage Harvester.
- Statut : à auditer.
- Validation requise : non pour l'audit ; oui avant code.

### Classer les deux factories Claude Project

- Tâche : garder les packs rédaction/SEO et gestion de projet comme pilotes terrain, sans les absorber dans le canon.
- Impact : évite que des retours/outils externes deviennent canon automatiquement.
- Risque : faible en classement ; moyen si installation/export réel.
- Source de vérité concernée : D11 Factories Backflow.
- Statut : à garder en queue terrain.
- Validation requise : oui avant absorption canon ou installation risquée.

## 3. À faire quand j'ai des tokens

- Tâche : recette D05-D06 avec une vraie session guidée puis un feedback candidat.
- Impact : vérifie le flux réel de bout en bout avec données autorisées.
- Risque : faible.
- Source de vérité concernée : canon D05-D06 + runtime GitHub.
- Statut : à faire.
- Validation requise : non pour l'audit.

## 4. À vérifier contre canon / GitHub

- Tâche : vérifier que les anciennes demandes Vincent déjà `done` ne cachent plus de dépendance active.
- Impact : nettoie le pilotage et évite d'attendre une personne qui a clôturé sa partie.
- Risque : faible.
- Source de vérité concernée : `INBOX_MALEX.md`, `INBOX_VINCENT.md`, GitHub `main`.
- Statut : fait ; handoff clôturé, anciennes entrées `open` neutralisées comme historique.
- Validation requise : non.

- Tâche : vérifier que la matrice canon ↔ GitHub reflète bien `4e0cfbb`.
- Impact : évite une alerte de sync fausse après merge D06.
- Risque : faible.
- Source de vérité concernée : GitHub `main`, Drive bridge, fichiers de pilotage.
- Statut : fait, Drive bridge rafraîchi post-PR #6.
- Validation requise : non.

## 5. À décider plus tard

- Tâche : stockage fichiers, export étudiant, génération D08 et détecteur D12 automatique.
- Impact : capacités lourdes et sensibles.
- Risque : élevé.
- Source de vérité concernée : D06, D08, D12.
- Statut : futur/verrouillé.
- Validation requise : oui.
