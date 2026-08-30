# MasterFlow Full-Stack - Plan global de mise sous tension

## Decision directrice

MasterFlow devient le backend et le produit central. Ours d'Or est la premiere verticale complete mise en production. Talents Creatifs, MasterPlan, API Manage et Asset Engine restent dans l'architecture cible, mais ne bloquent pas la premiere preuve serveur. Corrector n'est pas une verticale a migrer : seules ses capacites utiles sont absorbees dans les moteurs communs MasterFlow.

Le chemin critique est unique :

`preuves -> base Git propre -> socle testable -> preview privee -> IA securisee -> parcours Ours d'Or -> stable -> absorption progressive`

## Contrat de deploiement

- **Intention produit :** mettre MasterFlow sous tension sur Malex Graphics avec une premiere experience Ours d'Or utilisable de bout en bout.
- **Partie du canon concernee :** backend commun, preuves sourcees, accompagnement pedagogique, ressources validees, decisions humaines et verticales autonomes.
- **Ce qui doit changer :** fiabiliser le socle, separer les donnees de demonstration et de production, rendre le stockage persistant, deployer une preview privee, puis construire le parcours Ours d'Or.
- **Ce qui ne doit pas changer :** le canon produit, les sources historiques, les donnees privees, les autres verticales et les travaux de Vincent non valides.
- **Critere simple de succes :** Alex peut ouvrir la preview privee, se connecter, creer ou reprendre un projet Ours d'Or, obtenir une aide sourcee, enregistrer une progression et restaurer les donnees apres sauvegarde.
- **Risque de derive :** eleve si une archive, un prototype ou une sortie IA devient du canon sans validation.
- **Validation necessaire :** oui avant commit, push, installation serveur, activation de l'IA reelle, promotion stable ou ouverture publique.

## Architecture cible V1

### Produit

- Un backend MasterFlow commun.
- Une verticale Ours d'Or configuree par registre et contrats partages.
- Un frontend owner minimal pour piloter sources, projets, jalons, alertes et decisions candidates.
- Un frontend etudiant limite au projet, aux ressources autorisees, au depot et au compagnon pedagogique.
- Talents Creatifs conserve son perimetre fonctionnel, mais sera absorbe plus tard comme verticale du meme backend.

### Technique

- Frontend React/Vite existant.
- Backend Node/Express TypeScript existant.
- SQLite en mode WAL avec stockage persistant hors image Docker.
- Conteneurs Docker pilotes par Colima sur Malex Graphics.
- Acces prive par Tailscale pour preview et stable V1.
- Releases `preview` et `stable` separees, avec volumes et sauvegardes distincts.

### Donnees et preuves

- Base preview propre, avec donnees de demonstration explicitement marquees.
- Base production sans projet de demonstration par defaut.
- Sources originales immuables et referencees par hash.
- Evenements, signaux et decisions distingues : une observation ou une sortie IA ne devient jamais automatiquement canonique.
- Registre interne de ressources validees pour le Link Engine.

## Lots d'execution

### Lot 0 - Preserver et figer les preuves

Objectif : disposer d'un point de reprise fiable avant toute modification.

- Archiver les quatre handoffs GPT/OpenCode avec hashes et manifeste.
- Conserver les documents comme preuves historiques, pas comme instructions automatiques.
- Produire ce plan global comme seule feuille de route d'execution.
- Ne modifier ni GitHub, ni serveur, ni canon.

**Gate 0 :** archives lisibles, hashes verifies et aucune perte de fichier.

### Lot 1 - Repartir d'une base Git propre

Objectif : separer le travail serveur des changements non valides de la branche `vincent/masterplan`.

- Recuperer l'etat distant sans ecraser le travail local.
- Creer un worktree propre depuis `origin/main` sur une branche `codex/` dediee.
- Reintegrer uniquement les audits, registres et outils necessaires, fichier par fichier.
- Transformer le Fast Index en artefact regenerable ; ne pas en faire une seconde source de verite.
- Creer ou stabiliser la matrice canon vers GitHub, la queue et le ledger.

**Gate 1 :** base propre, provenance de chaque ajout connue, aucun contenu prive ni secret dans Git.

### Lot 2 - Obtenir un socle preview testable

Objectif : rendre le code actuel deployable sans embarquer les donnees historiques par accident.

- Reparer le test de correction en echec en identifiant la vraie source de divergence.
- Garder le lint vert et obtenir la suite de tests entierement verte.
- Introduire `MASTERFLOW_SEED_PROFILE` avec au minimum `development`, `preview` et `production`.
- Autoriser un projet de demonstration uniquement en preview.
- Interdire le chargement automatique du roster historique en production.
- Introduire `MASTERFLOW_STORAGE_ROOT` et monter un volume persistant pour les fichiers.
- Mettre a jour les scripts de smoke test pour ne plus viser l'ancien serveur de Vincent.
- Ajouter un manifeste de release avec commit, images, schema et hashes.

**Gate 2 :** tests verts, seed preview reproductible, seed production vide de donnees de demonstration et stockage persistant verifie.

### Lot 3 - Preparer Malex Graphics

Objectif : installer un runtime reproductible sans ouvrir le serveur au public.

- Revalider au moment de l'action l'identite du serveur et la racine `/Users/alexcoulot/Playground`.
- Installer Homebrew Intel si toujours absent.
- Installer Docker CLI, Compose et Colima.
- Configurer Colima pour environ 6 CPU, 12 Go de RAM et 100 Go de disque, puis ajuster apres mesure.
- Preparer les repertoires `releases`, `shared/database`, `shared/files`, `shared/backups` et `shared/logs`.
- Utiliser le transfert Git via agent forwarding ; ne jamais copier de cle privee.
- Preparer le demarrage automatique, les sauvegardes et un test de restauration.

**Gate 3 :** runtime sain apres redemarrage, volumes persistants, sauvegarde restaurable et acces Tailscale uniquement.

### Lot 4 - Deployer la preview privee full-stack

Objectif : obtenir une preuve serveur observable avant d'elargir le produit.

- Construire les images depuis un commit identifiable.
- Deployer `preview` avec une base propre et le provider IA mock.
- Conserver les comptes godmode Vincent et MALEX tels quels et charger uniquement les donnees
  Ours d'Or minimales autorisees par le profil preview.
- Exposer localement puis par Tailscale Serve.
- Tester authentification, permissions, cockpit, chat mock, fichiers, persistance et restauration.
- Journaliser la release et les resultats de recette.

**Gate 4 :** preview utilisable, privee, restaurable et strictement rattachee a un SHA Git.

### Lot 5 - Activer l'IA et le Link Engine

Objectif : rendre l'assistance utile sans perdre le controle des sources.

- Appliquer d'abord les correctifs de securite IA prioritaires : secrets serveur, timeout, limites, journal d'usage et refus explicites.
- Activer un provider OpenAI-compatible uniquement par variables serveur.
- Cabler un Link Engine minimal deterministe sur le registre interne valide.
- Autoriser une premiere implementation lexicale, sans figer l'architecture sur ce seul mode.
- Classer puis recommander les ressources avec provenance, fraicheur, statut et timecodes quand disponibles.
- Limiter le contexte selon le role et produire `A confirmer` quand la preuve manque.

**Gate 5 :** reponses sourcees, aucune fuite entre roles, aucune invention de deadline ou decision et retour au mock possible.

État au 2026-08-30 :

- `5A Link Engine déterministe` : implémenté et déployé en preview privée au SHA
  `23a81a715ac8312375d5c09efd6ccfebadd3235c` ; ressources,
  notions, exemples, niveaux dynamiques, FTS5/BM25, provenance, timecodes et overrides professeur ;
- `5B IA réelle` : différé, aucune clé ni provider activé ;
- le gate IA reste fermé même si le registre de ressources est opérationnel.

### Lot 6 - Construire le parcours Ours d'Or

Objectif : couvrir le premier usage reel de bout en bout.

- Onboarding et comptes etudiants.
- Creation ou rattachement a un projet et a une equipe.
- Brief, phases, jalons et livrables visibles selon le role.
- Compagnon pedagogique avec modes Projet, Tuto et Debug.
- Depot de fichiers, preuve de depot et nomenclature controlee.
- Progression, evenements, feedbacks et decisions candidates.
- Cockpit owner avec alertes, sources manquantes, projets et validations.
- Extraction finale portable vers MasterFlow, avec preuves et identifiants stables.
- Garder le moteur de concours complet hors du chemin critique tant que son besoin reel n'est pas observe.

**Gate 6 :** un etudiant peut terminer un parcours pilote et Alex peut verifier, corriger et exporter sans acces aux donnees d'autres groupes.

### Lot 7 - Promouvoir stable et absorber la suite

Objectif : promouvoir exactement ce qui a ete recette, puis etendre sans refaire le socle.

- Promouvoir le meme commit et les memes images vers `stable` avec volumes distincts.
- Conserver preview comme environnement de validation.
- Absorber ensuite Talents Creatifs et MasterPlan par verticales ; finaliser les capacites de correction, les exports, API Manage et Asset Engine comme briques transversales.
- Pour chaque absorption : audit canon, contrat, bridge, tests, preview, puis validation.

**Gate 7 :** stable restaurable, versionnee et sans donnees de demonstration ; aucune verticale absorbee sans contrat propre.

## Contrats de configuration a stabiliser

- `MASTERFLOW_SEED_PROFILE=development|preview|production`
- `MASTERFLOW_STORAGE_ROOT=/data/storage`
- `MASTERFLOW_RELEASE_CHANNEL=preview|stable`
- `MASTERFLOW_AI_PROVIDER=mock|openai_compatible`
- `MASTERFLOW_LINK_ENGINE_MODE=deterministic`
- Projets Compose et volumes distincts pour preview et stable.
- Manifestes de release et de sauvegarde hashes.

## Matrice canon vers implementation initiale

| Element canon | Etat actuel | Ecart principal | Risque | Action |
|---|---|---|---|---|
| Backend MasterFlow unique | Partiel | Verticales encore dispersees | Moyen | Stabiliser le socle avant absorption |
| Preuves sourcees | Partiel | Recherche et affichage a cabler | Eleve | Link Engine deterministe et citations |
| Decisions humaines | Partiel | Seeds et sorties IA peuvent etre ambigus | Eleve | Statuts candidats et validation owner |
| Donnees privees par role | Partiel | Recette serveur absente | Eleve | Tests de permissions en preview |
| Persistance fichiers | Incomplet | Racine de stockage non montee | Eleve | Volume `MASTERFLOW_STORAGE_ROOT` |
| Seed production propre | Incomplet | Roster historique charge automatiquement | Eleve | Profils de seed separes |
| Ours d'Or full-stack | Partiel | Pas encore de parcours serveur complet | Moyen | Lot 6 apres preuve preview |
| Talents Creatifs | Futur | Hors premier deploiement | Faible | Absorption apres stable |
| MasterPlan | Futur | Bridge seulement | Faible | Absorption progressive |
| Capacites Corrector | Absorbees pour l'essentiel | Corrector reste une source historique, jamais un produit ni persona runtime | Faible | Finaliser seulement les ecarts prouves dans le moteur commun |
| API Manage/Asset Engine | Differe | Non bloquant pour preview | Faible | Conserver dans la queue, sans rejet |

## Validations obligatoires

Arret et validation explicite avant :

1. creation d'une branche partagee, commit ou push ;
2. installation de Homebrew, Docker, Compose ou Colima sur le serveur ;
3. copie de code ou de donnees privees vers le serveur ;
4. activation d'une cle et d'une IA reelle ;
5. promotion vers stable ;
6. ouverture publique, migration ou suppression.

## Definition de termine

La premiere vague est terminee quand :

- le repo est propre et les tests sont verts ;
- preview tourne sur Malex Graphics en acces prive ;
- les donnees et fichiers survivent a un redeploiement ;
- une sauvegarde a ete restauree ;
- Alex peut piloter un projet Ours d'Or ;
- un etudiant pilote ne voit que son contexte ;
- le chat cite ses sources et sait dire `A confirmer` ;
- la release est rattachee a un commit et un manifeste ;
- aucune capacite differee n'a ete supprimee ou declaree obsolete.

## Prochaine action

Terminer le lot 0, puis preparer le lot 1 dans un worktree propre sans commit ni push.
