# MasterFlow — Action Queue

Dernière mise à jour : 2026-06-18

## 1. À faire maintenant

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
- Statut : spec prête, sans code (`docs/d06/D06_EXPORT_PREVIEW_INBOX_AUDIT_2026-06-18.md`).
- Validation requise : non pour l'audit ; oui avant code.

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

- Tâche : stockage fichiers, export étudiant, génération D08 et findings D12.
- Impact : capacités lourdes et sensibles.
- Risque : élevé.
- Source de vérité concernée : D06, D08, D12.
- Statut : futur/verrouillé.
- Validation requise : oui.
