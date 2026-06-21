# MasterFlow — Action Queue

Dernière mise à jour : 2026-06-21

## 1. À faire maintenant

### D12 R5 — Continuité runtime privée

- Tâche : publier d'abord le release receipt lié au SHA, sans sonder ni modifier le live.
- Impact : distingue enfin une déclaration de release d'une preuve runtime vérifiée.
- Risque : faible à moyen ; aucune action hôte et statut `not_verified` obligatoire.
- Source de vérité concernée : D12 Domain Card + Runtime Continuity Incident & Recovery Contract.
- Statut : R5.1-R5.2 sur `main`; rail release receipt privé clos. Backup/recovery/smoke/live restent gated.
- Validation requise : non pour registre privé ; oui avant smoke live, backup, recovery, migration ou déploiement.

### R5 D10 — Quote Builder privé

- Tâche : publier des brouillons de devis privés et sourcés.
- Impact : structure le chiffrage avant toute validation commerciale.
- Risque : faible tant qu’aucun export ou envoi n’existe.
- Source de vérité concernée : D10 Domain Card + arbitrage legacy Quote Builder.
- Statut : R5.1-R5.4 sur `main`; rail devis privé clos. Export, envoi, facture, paiement et public intake restent gated.
- Validation requise : oui avant export, facture ou envoi.

### R4 D09 — Workbench narratif privé

- Tâche : publier intake, reader state et patches candidats sans muter la source.
- Impact : rend MasterStory exploitable sans spoiler ni canon silencieux.
- Risque : faible tant que tout reste candidat et privé.
- Source de vérité concernée : D09 Domain Card + arbitrage legacy MasterStory.
- Statut : R4.1-R4.6 sur `main`; lot workbench privé clos. Delta canon, import, export et publication restent gated.
- Validation requise : non avant validation auteur/canon/export.

### Gate Legacy → Runtime

- Tâche : rattacher chaque vague à son idée legacy/arbitrée et à sa source canon.
- Impact : aucune capacité utile classée ne disparaît entre archive, canon et GitHub.
- Risque : faible ; contrôle documentaire sans changement runtime.
- Source de vérité concernée : archive legacy + Coverage Ledger + canon Drive.
- Statut : implémenté localement dans le contrat marathon.
- Validation requise : non.

### R3.1 — D08 registre manifest-first

- Tâche : publier le registre privé de références et manifests visuels, sans exécution.
- Impact : rend le cadrage et les blocages D08 vérifiables avant tout provider.
- Risque : faible ; metadata privée uniquement, génération explicitement verrouillée.
- Source de vérité concernée : D08 Visual Manifest Runtime Contract.
- Statut : R3.1-R3.3 sur `main`; R3.4 soumission Inbox manuelle en recette locale, sans génération.
- Validation requise : non pour code/tests privés ; oui avant provider, stockage, asset ou export.

### Clôture legacy et plan runtime

- Tâche : publier la clôture des 692 artefacts et le plan R1→R6.
- Impact : le projet repart d'un backlog logiciel clair plutôt que de l'archive brute.
- Risque : faible pour audit ; moyen dès R1 car données pédagogiques privées.
- Source de vérité concernée : canon Drive + GitHub runtime + ledger legacy.
- Statut : audit local vérifié, aucun artefact fonctionnel non classé.
- Validation requise : non pour publication documentaire ; oui avant migration/live/provider.

### R1 — Correction complète

- Tâche : terminer le lot contextualisé manuel après les prérequis barème/profil.
- Impact : rend le flux de correction réellement utilisable de bout en bout.
- Risque : moyen ; scopes, versions et validation professeur obligatoires.
- Source de vérité concernée : D05/D06 + Living Truth Spine.
- Statut : R1.1 barème/profil privé versionné prêt à publier ; lot manuel reste à faire.
- Validation requise : non pour code/tests isolés ; oui avant utilisation live ou migration réelle.

### R1.5 — Exécution pré-correction

- Tâche : créer le job `correction_prepare` depuis le manifest validé.
- Impact : lance potentiellement le traitement effectif des copies étudiantes.
- Risque : élevé ; runner, provider, consentement et environnement live.
- Source de vérité concernée : D06 + manifest validé + politique provider/runtime.
- Statut : bloqué au gate d'exécution ; aucun bouton, job ou runner lancé.
- Validation requise : oui avant activation provider ou traitement live.

### R2 — Sujet, assignment et fiche de correction

- Tâche : relier sujet privé versionné, assignment de cohorte et fiche de correction brouillon.
- Impact : remplace les références libres par une chaîne D05→D06 traçable et revue par le professeur.
- Risque : faible tant que la fiche reste privée, sans note et sans publication.
- Source de vérité concernée : canon D05 Subject As Mission + D06 Correction Sheet Autosync.
- Statut : R2.1→R2.6 déployées sur GitHub `main` ; clôture R2 publiée. R1.5 reste fermé par le gate provider/consentement/runtime.
- Validation requise : non pour code/tests privés ; oui avant publication ou assignment étudiant.

### Vague factories par Passport

- Tâche : publier l'inventaire des 2 062 fichiers et 13 groupes candidats.
- Impact : conserve les factories sans les confondre avec le runtime MasterFlow.
- Risque : faible pour audit ; critique avant affectation, installation ou import.
- Source de vérité concernée : D11 Passport/Backflow + archive lecture seule + GitHub V1 borné.
- Statut : audit local vérifié ; zéro Passport validé, installation ou activation.
- Validation requise : non pour audit ; oui avant affectation utilisateur ou installation.

### Vague déploiements et audits historiques

- Tâche : publier l'index exact et les règles de preuve de 1 691 fichiers historiques.
- Impact : empêche les anciens handoffs/payloads/audits d'être pris pour le live.
- Risque : faible pour audit ; critique avant suppression, recovery ou déploiement.
- Source de vérité concernée : archive lecture seule + D12 Runtime Continuity + GitHub actuel.
- Statut : audit local vérifié ; zéro fichier manquant, zéro suppression, live non vérifié.
- Validation requise : non pour audit ; oui avant action hôte ou suppression.

### Vague personas et événements

- Tâche : publier l'arbitrage de 24 personas et 12 événements.
- Impact : conserve voix/méthodes/signaux sans permission ni action implicite.
- Risque : faible pour audit ; élevé avant affectation ou effet automatisé.
- Source de vérité concernée : D04/D12 + archive lecture seule + runtime GitHub.
- Statut : audit local vérifié, aucune activation.
- Validation requise : non pour audit ; oui avant affectation réelle ou effet sensible.

### Vague datasets legacy

- Tâche : publier l'arbitrage des 69 datasets par vérité, provenance et accès.
- Impact : empêche qu'un snapshot ou fichier privé devienne source de vérité.
- Risque : faible pour audit ; élevé pour données étudiantes, morphologie et droits visuels.
- Source de vérité concernée : Living Truth Spine + Dataset Access Matrix + archive lecture seule.
- Statut : audit local vérifié ; 4 sources bloquées et exclues de l'absorption.
- Validation requise : non pour audit ; oui avant usage d'une source bloquée.

### Vague engines legacy

- Tâche : publier la consolidation des 148 engines sous 12 owners.
- Impact : conserve les responsabilités sans recréer 148 services.
- Risque : faible pour audit ; élevé si un nom legacy devient une promesse runtime.
- Source de vérité concernée : Domain Map canon + runtime GitHub + archive lecture seule.
- Statut : audit local vérifié, publication en cours.
- Validation requise : non pour audit ; oui avant toute nouvelle autorité runtime.

### Vague contrats D11-D12

- Tâche : publier l'arbitrage de 12 contrats factories, backflow et observabilité.
- Impact : ferme la passe contrats sans activer de factory ou d'action autonome.
- Risque : faible pour audit ; élevé pour import/recovery/live.
- Source de vérité concernée : canon D11/D12 + legacy lecture seule + GitHub.
- Statut : audit local vérifié, publication en cours.
- Validation requise : non pour audit ; oui avant installation, import, recovery ou live.

### Vague contrats D09-D10

- Tâche : publier l'arbitrage des 20 contrats récit, devis, export et event/public.
- Impact : protège sources, spoilers, consentement et engagements commerciaux.
- Risque : faible pour l'audit ; élevé avant import/publication/envoi.
- Source de vérité concernée : canon D09/D10 + legacy lecture seule + GitHub.
- Statut : audit local vérifié, publication en cours.
- Validation requise : non pour audit ; oui avant import, envoi, publication ou facture.

### Vague contrats D08

- Tâche : publier l'arbitrage exhaustif des 48 contrats DA/assets.
- Impact : protège la DA complète tout en empêchant Comfy, factories ou exports de devenir l'autorité.
- Risque : faible pour l'audit ; critique seulement lors d'une future génération/provider.
- Source de vérité concernée : canon D08 manifest-first + legacy lecture seule + GitHub.
- Statut : audit local vérifié, publication en cours.
- Validation requise : non pour audit ; oui avant rendu, stockage, export ou live.

### Vague contrats D05-D07

- Tâche : publier l'arbitrage de 12 contrats et le reroutage morphologique D07→D08.
- Impact : transforme des artefacts legacy en décisions traçables sans promettre un runtime absent.
- Risque : faible ; aucun code, OCR, migration ou live.
- Source de vérité concernée : legacy lecture seule + canon D02/D05/D06/D07/D08 + GitHub `main`.
- Statut : audit local vérifié, publication en cours.
- Validation requise : non pour audit/queue ; oui avant activation des capacités gated.

### Réconciliation legacy — arbitrage exhaustif

- Tâche : attribuer à chaque app, engine, contrat et dataset legacy un domaine, un owner et un statut `absorbed/reduced/canon_ready/restore_candidate/deprecated`.
- Impact : empêche de confondre inventaire complet et absorption complète.
- Risque : faible pour l'audit ; élevé si le développement reprend avant classement.
- Source de vérité concernée : archive legacy en lecture seule + canon Drive + GitHub `main`.
- Statut : audit global en cours ; 4 714 fichiers indexés, arbitrage détaillé incomplet.
- Validation requise : non pour audit/queue ; oui avant promotion canon d'une nouvelle capacité.

### Livré — UI professeur de revue d'identité

- Tâche : écran Teaching des `identity_match_candidate` et gestes confirmer/rejeter.
- Impact : rend les ambiguïtés compréhensibles et actionnables sans décision automatique.
- Risque : moyen ; données pédagogiques privées et compatibilité historique.
- Source de vérité concernée : Living Truth Spine + contrat classe/cohorte/roster.
- Statut : mergé sur `main` via PR #67 (`4ccda9a`) ; preuves Drive synchronisées.
- Validation requise : non pour code/tests isolés ; oui avant migration d'une base réelle.

### Livré — gestion cohortes/rosters

- Tâche : permettre au professeur de créer une cohorte et une nouvelle version de roster depuis Teaching.
- Impact : rend le contexte de correction administrable sans intervention technique.
- Risque : moyen ; données privées, version append-only et périmètre projet à conserver.
- Source de vérité concernée : Living Truth Spine + contrat classe/cohorte/roster.
- Statut : mergé sur `main` via PR #69 (`0168a70`) ; preuves Drive synchronisées.
- Validation requise : non pour code/tests isolés ; oui avant import ou migration d'une base réelle.

### Verticale correction contextualisée — barème et profil de notation

- Tâche : créer et valider manuellement un barème versionné et un profil de notation privé.
- Impact : fournit les deux références obligatoires avant tout lot de correction.
- Risque : moyen ; total de points, bandes, seuils protégés et statut validé doivent rester cohérents.
- Source de vérité concernée : D06 Evaluation Engine + Living Truth Spine.
- Statut : implémenté localement et vérifié ; publication GitHub à faire. Création brouillon, validation explicite et historique versionné, sans correction.
- Validation requise : non pour code/tests isolés ; oui avant utilisation live.

### Verticale correction contextualisée — lancer un lot manuel

- Tâche : créer depuis Teaching un lot de correction relié au projet, au roster actif, au sujet et au barème.
- Impact : relie enfin le contexte de classe au pipeline de pré-correction déjà présent.
- Risque : moyen ; aucune correction automatique, aucun feedback final ni provider live.
- Source de vérité concernée : D05/D06 + Living Truth Spine.
- Statut : lot, intake et manifest d'échantillon Teaching prêts à publier ; préparation contrôlée du job reste à raccorder, sans exécution automatique.
- Validation requise : non pour code/tests isolés ; oui avant toute exécution live réelle.

### Phase 1 — Première release privée vérifiable

- Tâche : démarrer le package Docker sur un serveur choisi, avec volume persistant,
  secrets hors Git et `MASTERFLOW_RELEASE_SHA` égal au commit livré.
- Impact : transforme GitHub en instance MasterFlow accessible et vérifiable.
- Risque : moyen ; exposition réseau, secrets et sauvegarde de base doivent être décidés
  avec le serveur cible.
- Source de vérité concernée : GitHub runtime + D12 deployment bridge.
- Statut : package prêt à vérifier sur hôte Docker ; live non déployé.
- Validation requise : oui — choix du serveur et autorisation d'accès/de déploiement.

## 2. Livré — historique à ne pas relancer

Les vagues D11 Factory Backflow V6C à V6F sont closes sur `main` à `ca3d3b7`.
Elles restent ci-dessous comme preuve de périmètre ; elles ne constituent plus
une tâche active. La recette opérateur unique est
`docs/d11-d12/FACTORY_BACKFLOW_OPERATOR_RECIPE_V1_2026-06-19.md`.

### Vague 6F — Routage manuel factory

- Tâche : confirmer un domaine uniquement parmi les recommandations V6E.
- Impact : route une candidate sans la promouvoir en canon ou runtime.
- Risque : moyen, contenu par admin/godmode et whitelist de recommandations.
- Statut : mergé sur `main` via PR #47 (`2c39511`) ; pont Drive synchronisé.
- Validation requise : GO MALEX reçu.

### Vague 6E — Recommandation de routage factory

- Tâche : proposer un domaine quand le canon le permet, sans l'appliquer.
- Impact : rend les candidate updates lisibles sans inventer de règle de routage.
- Risque : faible ; lecture seule, domaine cible toujours vide.
- Source de vérité concernée : D11 Factory Passport Backflow Contract.
- Statut : mergé sur `main` via PR #46 (`c23c33d`) ; pont Drive synchronisé.
- Validation requise : GO MALEX reçu.

### Vague 6D — Candidate updates factory après revue

- Tâche : matérialiser une fiche candidate non routée seulement après approbation d'un backflow D11 complet.
- Impact : rend la sortie d'une revue exploitable sans choisir ou modifier automatiquement un domaine MasterFlow.
- Risque : faible à moyen, contenu par `candidate_only`, l'absence de domaine cible et la lecture admin/godmode.
- Source de vérité concernée : D11 Factory Passport Backflow Contract + Shared Validation Inbox.
- Statut : mergé sur `main` via PR #45 (`17e57f8`) ; pont Drive synchronisé. Routage métier reste candidate-only.
- Validation requise : GO MALEX reçu ; publication autorisée par la consigne continue.

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
