# MasterFlow — Action Queue

Dernière mise à jour : 2026-06-18

## 1. À faire maintenant

### Publier la tranche D06 → Validation Inbox

- Tâche : valider commit/push/PR de la projection `feedback_draft only`.
- Impact : raccorde le premier objet D06 à l'inbox commune sans ouvrir l'envoi étudiant.
- Risque : moyen ; migration SQLite et autorité de décision.
- Source de vérité concernée : canon D06 + Shared Validation Inbox + GitHub.
- Statut : implémenté localement, non publié.
- Validation requise : oui.

## 2. À mettre en queue

### Auditer le runtime Usage Harvester → GodModes

- Tâche : comparer le nouveau contrat canon D11/D12 au runtime GitHub avant toute implémentation.
- Impact : vérifier que MasterFlow sait extraire, qualifier, dédupliquer et router automatiquement les apprentissages d'usage.
- Risque : élevé si une extraction native est confondue avec une écriture automatique du canon ou expose des données privées.
- Source de vérité concernée : Kernel + D11 + D12 + contrat Usage Harvester.
- Statut : canon validé, implémentation inconnue.
- Validation requise : oui avant code.

### Piloter les deux factories Claude Project

- Tâche : installer les packs rédaction/SEO et gestion de projet, puis récupérer leurs premiers exports anonymisés.
- Impact : produit les premières preuves terrain structurées avant spécialisation avancée des bots.
- Risque : faible avec anonymisation et validation d'export.
- Source de vérité concernée : D11 Factories Backflow.
- Statut : kits prêts pour pilote.
- Validation requise : non pour le pilote ; oui avant toute absorption canon.

### Projection D06 suivante : export preview

- Tâche : auditer `correction_export_preview` comme deuxième source possible après feedback approuvé.
- Impact : prépare la suite D06 sans confondre approbation feedback et publication.
- Risque : élevé si l'export est assimilé à un envoi étudiant.
- Source de vérité concernée : canon D06 + bridge Validation Inbox.
- Statut : futur, à spécifier après publication feedback.
- Validation requise : oui avant code.

## 3. À faire quand j'ai des tokens

- Tâche : recette D05-D06 avec une vraie session guidée puis un feedback candidat.
- Impact : vérifie le flux réel de bout en bout avec données autorisées.
- Risque : faible.
- Source de vérité concernée : canon D05-D06 + runtime GitHub.
- Statut : à faire.
- Validation requise : non pour l'audit.

## 4. À demander à Vincent

- Tâche : relire la PR `feedback_draft only`, notamment la migration SQLite et la délégation à `reviewFeedbackDraft`.
- Impact : sécurise l'intégration backend sans ouvrir l'envoi étudiant.
- Risque : moyen.
- Source de vérité concernée : GitHub backend + canon D06.
- Statut : prêt après publication PR.
- Validation requise : oui avant transmission.

## 5. À décider plus tard

- Tâche : stockage fichiers, export étudiant, génération D08 et findings D12.
- Impact : capacités lourdes et sensibles.
- Risque : élevé.
- Source de vérité concernée : D06, D08, D12.
- Statut : futur/verrouillé.
- Validation requise : oui.
