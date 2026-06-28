# MasterFlow — CDC interface actif

Statut : en remplissage guidé
Owner : MALEX
Mode : clean slate design, runtime existant comme contrainte fonctionnelle
Source opérable : repo Git `MASTERFLOW`

## Principe de départ

On repart de zéro côté expérience et organisation visuelle.

L'interface actuelle sert uniquement à prouver que les briques existent : login, contexte, modes,
Teaching, Inventory, Pilotage, Admin, Ops, D08, D09, D10, D12, chat et source truth. Elle ne sert
pas de modèle graphique final.

Ce CDC doit décider ce qu'il faut afficher, quand, pourquoi, pour qui et sous quelle forme.

## Invariants

- Boot léger : profil, contexte actif, alertes et prochains gestes seulement.
- Chargement progressif : les grosses fonctions se chargent à la demande.
- Une vue n'est jamais une vérité : chaque donnée importante garde source, confiance et limite.
- Une validation UI ne vaut pas publication, export, déploiement ou action externe.
- Les panels admin/debug/ops ne deviennent pas l'expérience normale.
- Les personas aident l'utilisateur, mais ne donnent jamais de droits supplémentaires.
- Chaque widget doit aider maintenant ; aucun widget permanent par habitude.
- Mobile, web et desktop partagent la même logique produit.

## Ce qu'on doit concevoir

## Décisions MALEX — Bloc A

### Vision générale

MasterFlow doit s'ouvrir comme un tableau de bord léger, avec une sensation de bureau magique /
salle de contrôle RPG, sans devenir un dashboard technique.

L'utilisateur doit sentir :

- qu'il est dans son espace personnel ;
- que son persona et son contexte sont chargés ;
- que les actions utiles sont proches ;
- que les fonctions lourdes restent cachées tant qu'elles ne sont pas appelées.

La Home n'est pas un catalogue de fonctionnalités. C'est un point de reprise.

### Première connexion

Deux états d'entrée existent :

1. utilisateur déjà connu ;
2. première utilisation.

Un utilisateur doit toujours avoir un compte et des permissions avant d'entrer. Si MasterFlow
détecte une première utilisation, il lance un tunnel d'intro :

- discussion guidée ;
- création/remplissage du personnage ;
- création ou choix de l'avatar ;
- validation du profil ;
- création du canon personnel ;
- choix d'ambiance, couleurs et préférences d'interface ;
- définition de l'univers et du lore associés au personnage ;
- préparation des futurs assets du personnage.

Ce tunnel influence ensuite les visuels, assiettes/assets, animations de persona et préférences
de l'interface.

### Home principale

Après l'intro, la Home doit afficher peu de choses :

- état actuel ;
- contexte actif ;
- actions principales ;
- dernière reprise utile ;
- prochains gestes ;
- raccourcis vers les modes autorisés.

Pour un profil prof, la Home doit aider à comprendre l'état pédagogique général : classes, cours,
sujets, tâches à faire et prochaine action logique.

Les fonctionnalités internes, états techniques, jobs, logs, providers, debug et indicateurs
système ne doivent pas apparaître sur la Home normale.

### Navigation et profondeur

Une barre de navigation doit donner accès rapidement aux modes :

- Learning ;
- Project ;
- Teaching ;
- Inventory ;
- Story ;
- DA ;
- MasterHelp ;
- Pilotage / Godmode ;
- Admin/Ops selon permissions.

Changer de mode change l'interface. Chaque mode peut ensuite descendre en profondeur :

```txt
Teaching
-> classe
-> sujets assignés
-> progression
-> membres
-> détail étudiant / sujet / correction
```

L'interface doit rester légère au niveau supérieur et charger les panneaux seulement quand une
fonction ou un objet est appelé.

### Persona et conversation

Le persona est visible, plutôt sur la gauche, comme compagnon actif de conversation.

Le persona doit pouvoir avoir plusieurs états visuels :

- neutre ;
- écoute ;
- réponse ;
- succès ;
- échec ;
- alerte ;
- réflexion ;
- intervention spéciale.

Ces états peuvent créer une fausse micro-animation en alternant plusieurs assets/assiettes du
personnage.

Quand plusieurs personas sont invoqués, l'interface passe en mode dialogue :

- l'utilisateur parle ;
- le persona principal orchestre ;
- un ou plusieurs personas invités peuvent répondre ;
- chaque réponse doit rester clairement attribuée ;
- 2 ou 3 personas simultanés semblent acceptables comme première limite.

Les personas enrichissent la réponse et l'expérience, mais ne donnent jamais de droits ou de
permissions supplémentaires.

### Ce qui doit rester caché

Par défaut, rester cachés :

- fonctionnalités non utilisées ;
- panneaux techniques ;
- jobs ;
- logs ;
- providers ;
- debug ;
- états internes ;
- outils D08/D09/D10/D12 ;
- admin/ops hors besoin ;
- indicateurs de fonctionnement système non utiles à la décision utilisateur.

Ils peuvent être accessibles par raccourci, mode, panneau ou commande, mais jamais polluer la
Home légère.

## Décisions MALEX — Bloc B

### Principe général de l'accueil

Chaque mode large doit afficher une action logique suivante pour ses parties importantes.

Principe produit :

```txt
Mode large
-> sections essentielles
-> état clair
-> prochaine action logique
```

La Home ne doit pas montrer toutes les fonctions. Elle doit montrer ce qu'il est logique de faire
maintenant dans chaque zone importante.

### Home godmode / MALEX

La Home godmode doit agréger les grands états sans devenir technique :

- dernière action ou reprise logique ;
- chantiers actifs ;
- décisions ou validations attendues ;
- alertes importantes ;
- modes/raccourcis principaux ;
- action logique suivante par grande zone.

Les états internes bruts restent cachés dans Pilotage/Admin/Ops.

### Home prof

Blocs d'accueil confirmés :

- classes ;
- cours ;
- sujets ;
- corrections ;
- alertes ;
- prochaine action logique.

La Home prof doit aider à reprendre une classe ou un sujet sans chercher.

### Home étudiant

Blocs d'accueil confirmés :

- projet actif ;
- sujets assignés ;
- prochain rendu ou prochaine tâche ;
- feedbacks ;
- ressources utiles ;
- personas liés au sujet/projet ;
- recherche de personas ou d'aides disponibles.

Si un étudiant a plusieurs sujets assignés, l'interface doit permettre de choisir ou reprendre le
bon sujet sans confusion.

### Chat / personas

Le chat doit rester familier : zone de saisie en bas, comme un agent conversationnel classique.

Comportement souhaité :

- chat compact quand il n'est pas utilisé ;
- chat qui se développe quand l'utilisateur parle ou consulte un échange ;
- persona principal visible à gauche ;
- personas consultés ou invités visibles à droite ;
- bulles différenciées par persona ;
- couleur dominante ou fond de bulle lié au persona ;
- curseur/état proche du persona pour signaler écoute, réflexion ou réponse.

Le persona principal répond par défaut. Si une réponse concerne un persona consulté, ce persona
peut intervenir avec attribution claire. Le mode dialogue doit rester lisible et limité.

### Navigation modes

Préférence MALEX : barre latérale fixe à gauche.

Décision recommandée provisoire :

- barre latérale gauche comme standard par défaut desktop ;
- mode compact responsive sur mobile ;
- possibilité future de variantes, mais ne pas complexifier le premier build ;
- les choix doivent suivre des principes de clarification, hiérarchie de l'information et lisibilité.

Le design doit privilégier la structure et la lisibilité plutôt qu'un effet spectaculaire.

## Décisions MALEX — Bloc C/D

### Notifications, alertes, inbox

Principe : tout événement important finit dans une inbox ou un historique consultable, mais la
Home n'affiche qu'un signal léger quand quelque chose demande attention.

Notifications courtes possibles :

- nouveau feedback professeur ;
- nouvelle demande utilisateur ;
- nouvelle opportunité/fonction détectée pour godmode ;
- persona pertinent disponible pour un sujet/projet ;
- mise à jour utile sur un sujet, une classe ou un projet ;
- nouvelle entrée dans une inbox.

Alertes bloquantes :

- problème utilisateur réel ;
- tentative de contournement du système ;
- bug sérieux ;
- incohérence qui empêche une action ;
- source critique absente ou faible ;
- action sensible sans validation ;
- événement à remonter en godmode.

Règle de calme : ne jamais transformer toutes les nouveautés en grosses alertes. L'interface doit
montrer un indicateur discret, puis laisser l'utilisateur ouvrir l'inbox ou le détail.

### Pages complètes adaptatives

Quand l'utilisateur ouvre une classe, un projet, un sujet ou un objet important, l'interface ouvre
une page complète adaptative, pas une petite modale.

Structure standard recommandée :

```txt
Header contexte
-> résumé clair
-> prochaine action logique
-> statut / alerte principale

Zone centrale
-> widgets principaux de travail
-> contenus métier
-> progression / ressources / rendus / feedbacks

Colonne latérale contextuelle
-> personas/personnes liés
-> sources importantes
-> inbox/alertes liées
-> raccourcis utiles
```

La page complète reste composée de widgets. Elle peut donc s'adapter au mode, au rôle, au device
et à l'état du projet.

### Réorganisation par l'utilisateur

Objectif : donner de la souplesse sans créer une usine à gaz.

Décision recommandée :

- V1 : layouts prédéfinis par mode et rôle ;
- V1 : l'utilisateur peut masquer/épingler certains widgets simples ;
- V1 : ordre logique stable décidé par MasterFlow ;
- V2 : réorganisation plus libre par panneaux déplaçables si le besoin est confirmé ;
- éviter le drag & drop complet au premier build, car cela peut compliquer mobile, accessibilité,
  sauvegarde d'état et clarté.

Le système peut déjà utiliser `room_instance.widget_state` et les checkpoints pour mémoriser des
préférences simples de layout.

### Prochaines actions logiques

Les prochaines actions sont un mix selon contexte :

- bouton principal si l'action est évidente ;
- carte si l'action demande explication ;
- checklist si plusieurs prérequis existent ;
- inbox card si validation humaine requise ;
- alerte bloquante si l'action est impossible sans correction.

Le texte doit toujours répondre à : “qu'est-ce que je fais maintenant ?”

## Décisions MALEX — Bloc E

### Direction visuelle globale

La version MALEX de MasterFlow assume un mélange :

- bureau magique ;
- salle de contrôle ;
- RPG / interface de jeu ;
- énergie or / canon MasterFlow ;
- hiérarchie claire d'un bon système graphique.

Objectif : sortir d'une interface trop plate sans tomber dans le gadget illisible.

À terme, le même fonctionnement doit pouvoir être décliné en marque blanche plus sobre premium
ou institutionnelle. Le design system doit donc séparer :

- logique produit commune ;
- thème visuel ;
- assets/personas ;
- intensité RPG.

### DA MasterFlow comme autorité

Les avatars, assiettes/assets, états de persona, badges, références visuelles et styles ne doivent
pas être inventés depuis ce CDC seul.

Ils doivent être reliés à la DA MasterFlow existante :

- D08 DA / visual assets ;
- visual references ;
- manifest-first ;
- DA root ;
- références canon ;
- assets candidats/validés ;
- règles de validation visuelle.

Point d'attention : avant de figer la production d'assets UI, il faut auditer/relier explicitement
les contrats DA déjà présents dans Git et les sources DA historiques utiles.

### Système d'assiettes / assets personnalisés

Fantasme produit assumé :

```txt
un seul fonctionnement MasterFlow
-> interface personnalisée par utilisateur/persona
-> assets générés depuis visuels canon + specs techniques + thème
```

Chaque personnage doit pouvoir produire un univers visuel cohérent :

- avatar canon ;
- assiettes/assets d'état ;
- couleurs dominantes ;
- ambiance ;
- variantes de réponse ;
- états conversationnels.

Les utilisateurs peuvent personnaliser leur personnage, mais dans un tunnel guidé par la DA
MasterFlow. La liberté existe, mais elle est cadrée.

### Tunnel d'intro et génération visuelle

Tous les utilisateurs doivent avoir un avatar canon défini au tunnel d'intro.

Le tunnel doit permettre :

- création ou choix du personnage ;
- description guidée ;
- choix du thème/interface ;
- choix d'ambiance ;
- création du canon personnel ;
- préparation de la génération des premiers assets.

Le système peut démarrer avec des assets par défaut, puis remplacer automatiquement par les assets
personnalisés quand ils sont prêts et validés.

L'utilisateur n'a pas besoin de voir un bouton “préparer un asset” partout. La génération des
premiers assets doit être orchestrée par le système, avec validation/review quand nécessaire.

### États visuels persona V1

États à garder en V1 :

- neutre ;
- écoute ;
- réflexion ;
- réponse ;
- succès ;
- alerte ;
- erreur/échec ;
- humour/personnalité ;
- intervention spéciale.

Ces états seront testés d'abord sur le compte MALEX, puis stabilisés en process.

### Icônes de modes

Direction : mix MasterFlow entre icône simple type app et symbole RPG.

Règle :

- lisible immédiatement ;
- cohérent avec la DA ;
- pas trop enfantin ;
- suffisamment distinct pour chaque mode ;
- compatible sobre marque blanche plus tard.

### Couleurs et thèmes

Le thème utilisateur est choisi au tunnel d'intro.

Le système doit pouvoir générer une gamme cohérente :

- couleur principale ;
- couleur secondaire ;
- couleur d'action ;
- couleur d'alerte ;
- couleur de succès ;
- fond clair/sombre ;
- contraste accessible.

Le moteur de thème doit utiliser des règles de palette :

- complémentaires ;
- analogues ;
- triades ;
- contrastes ;
- accessibilité ;
- mode nuit.

Un mode nuit automatique doit réduire l'intensité lumineuse sans casser les couleurs canon.

Accessibilité obligatoire :

- contraste suffisant ;
- états lisibles sans dépendre uniquement de la couleur ;
- mode sombre propre ;
- lisibilité malvoyance ;
- éviter les couleurs d'alerte ambiguës.

### Génération image / D08

En V1 UI, l'interface doit prévoir le parcours mais rester prudente :

- afficher les avatars/assets existants ;
- utiliser les assets de base si les assets personnalisés ne sont pas prêts ;
- préparer automatiquement les manifests nécessaires ;
- garder validation/review avant canonisation ;
- ne pas multiplier les boutons de génération manuelle ;
- ne jamais présenter une génération comme canon sans validation.

### Boucle output -> DA globale

Chaque génération utile doit pouvoir revenir dans le moteur DA global.

Principe :

```txt
demande utilisateur
-> manifest DA
-> génération / output
-> review humaine ou assistée
-> classement précis de l'output
-> absorption éventuelle dans la DA globale
-> mise à jour des règles, références, assets ou anti-patterns
```

Un output généré n'est jamais automatiquement canon. Il peut devenir :

- asset candidat ;
- asset validé ;
- référence de style ;
- référence de pose/expression ;
- exemple de palette ;
- output template ;
- anti-pattern ;
- preuve de dérive ;
- matériau d'amélioration du prompt/process.

L'interface doit donc prévoir après génération :

- visualisation de l'output ;
- comparaison avec le manifest initial ;
- note de conformité DA ;
- tags de rôle visuel ;
- décision : garder, rejeter, retoucher, canoniser, transformer en référence, transformer en anti-pattern ;
- conservation de la source, du prompt, du manifest, des réglages et du statut.

Objectif : plus MasterFlow génère, plus la DA devient précise. On évite de refaire les mêmes
erreurs et on transforme les bons outputs en matière exploitable par tout le système.

### Génération autonome encadrée

MasterFlow doit pouvoir préparer et générer certains assets automatiquement, sans demander à
l'utilisateur de piloter chaque image.

Principe V1 :

- le système part des specs minimales disponibles ;
- il utilise les capacités natives de génération d'images déjà présentes dans l'écosystème ;
- il produit des assets candidats ;
- il ne les canonise pas tout seul ;
- il les affiche avec statut clair ;
- l'utilisateur ou la DA peut ensuite affiner, rejeter, valider ou transformer en référence.

Specs minimales nécessaires avant génération :

- persona ou entité concernée ;
- rôle de l'asset : avatar, état, icône, badge, décor, template, référence ;
- usage prévu : UI, conversation, projection, badge, export, DA ;
- contraintes DA connues ;
- privacy/scope ;
- source ou manifest associé ;
- niveau de liberté autorisé.

Comportement attendu :

```txt
si specs suffisantes
-> préparer manifest
-> générer candidat
-> stocker output + prompt + paramètres + source
-> afficher comme candidat
-> proposer review/affinage

si specs insuffisantes
-> utiliser asset par défaut
-> créer tâche d'affinage
-> ne pas bloquer l'expérience
```

Ce fonctionnement doit éviter deux pièges :

- demander trop de micro-validations avant de créer quoi que ce soit ;
- laisser croire qu'un output automatique est déjà une vérité canon.

### Niveau RPG

Pour la version MALEX : RPG assumé.

Références d'esprit :

- interface de jeu ;
- Starcraft / interfaces fortes ;
- flash old school ;
- salle de contrôle ;
- progression, badges, personnages, états.

Garde-fou : RPG assumé ne veut pas dire illisible ou caricatural. Les principes de clarté,
hiérarchie, rythme visuel et lisibilité restent prioritaires.

Les versions marque blanche pourront réduire l'intensité RPG tout en gardant :

- personas ;
- progression ;
- états ;
- widgets ;
- source truth ;
- logique de modes.

## Décisions MALEX — Bloc F

### Mobile

Objectif idéal : pouvoir tout faire sur mobile.

Principe pragmatique : ce qui est trop lourd pour une interface mobile doit pouvoir passer par
micro, transcription et conversation.

La version mobile doit donc être plus `voice-oriented` :

- bouton micro très accessible ;
- interface minimale ;
- conversation guidée ;
- actions proposées après compréhension ;
- widgets condensés ;
- validation claire ;
- possibilité de piloter en classe rapidement.

Le mobile ne doit pas devenir une version amputée. Il doit devenir une interface plus
conversationnelle, avec moins de panneaux visibles.

Point à auditer : les briques MasterFlow existantes pour transcription, détection d'intention,
routing et compréhension des routes doivent être reliées à ce parcours mobile.

### Desktop

Le desktop est la version full power.

Usages principaux :

- cockpit complet ;
- création de sujets ;
- pilotage classe ;
- corrections/feedbacks ;
- DA/assets ;
- gestion projets ;
- admin/godmode ;
- utilisation du micro pour feedback live ;
- accès à toutes les fonctionnalités selon permissions.

Le desktop doit rester rapide, puissant et compatible raccourcis clavier.

### Usage en classe

L'interface doit avoir un mode projection / écran prof simplifié.

Objectif : agilité pédagogique maximale.

Cas clés :

- afficher un subpersona en pleine page ;
- activer le micro ;
- lancer une conversation de classe ;
- utiliser MOTH, Incubator ou équivalent comme garde-fou/provocateur/guide ;
- relier le subpersona au projet de la classe ;
- montrer un indicateur poétique de l'avancée du projet ;
- faire évoluer le subpersona selon le projet, la classe ou les choix pédagogiques.

Le subpersona n'est pas forcément un persona officiel MasterFlow. Il peut être un personnage de
classe, un gardien de cadre, un moteur poétique ou un accompagnateur de projet.

Point à auditer : relier cela aux briques existantes de personas contextuels, MOTH, Incubator,
gamification/progression et moteur évolutif.

### Raccourcis clavier / logique app

Les raccourcis doivent être pensés comme une vraie logique d'application.

Objectifs :

- permettre aux power users de piloter vite ;
- rester optionnels pour les utilisateurs non experts ;
- ne jamais cacher une action importante uniquement derrière un raccourci ;
- être cohérents entre web, desktop et futur shell app.

Pistes à cadrer :

- `Cmd/Ctrl+K` : palette de commande / recherche globale ;
- `/` : recherche ou commande conversationnelle ;
- `Tab` ou raccourci dédié : changer de zone/mode ;
- raccourcis de validation/inbox ;
- raccourcis micro ;
- raccourcis projection classe ;
- raccourcis godmode.

Le design final doit prévoir une aide raccourcis visible et progressive.

### 1. Accueil contextuel

Objectif : en 10 secondes, l'utilisateur comprend où il est, ce qui compte et quoi faire ensuite.

À décider :

- sensation générale ;
- contexte actif affiché ;
- persona visible ou discret ;
- alertes prioritaires ;
- prochains gestes ;
- widgets de départ ;
- raccourcis de modes ;
- niveau de densité par défaut.

### 2. Modes / rooms

À cadrer :

| Mode | Rôle produit | Public | Charge au boot ? | Questions restantes |
|---|---|---|---|---|
| Home | cockpit contextuel | tous | oui, léger | à remplir |
| Teaching | classe, sujets, corrections | prof/admin | non | action logique par classe/sujet/correction |
| Learning | projet étudiant | étudiant/prof | non | sujets assignés, feedbacks, ressources, personas liés |
| Project | pilotage projet | membres projet | non | à remplir |
| Inventory | ressources/objets | selon projet | non | à remplir |
| Story | narration/BD/dialogue | créatif/prof | non | à remplir |
| DA | références/assets | prof/godmode | non | à remplir |
| MasterHelp | situation réelle/voyage/aide | selon pack | non | à remplir |
| Projection classe | subpersona/micro/activité | prof | non | à cadrer |
| Pilotage | contrôle owner | admin/godmode | non | à remplir |
| Admin/Ops | supervision | admin/godmode | non | à remplir |

### 3. Catalogue widgets

À arbitrer :

| Widget | Usage | Format probable | Source truth requise | Statut |
|---|---|---|---|---|
| carte contexte actif | savoir où on est | carte | oui | à décider |
| carte persona | savoir qui accompagne | carte/avatar | oui | à décider |
| prochaine action | agir sans chercher | bouton/carte | oui | à décider |
| alerte | danger ou blocage | notification | oui | à décider |
| source truth strip | provenance/confiance | bandeau | oui | à décider |
| validation card | décision humaine | carte/inbox | oui | à décider |
| jauge readiness | prêt/partiel/bloqué | jauge | oui | à décider |
| timeline | ordre/événements | timeline | oui | à décider |
| checklist | préparation | liste | oui | à décider |
| asset card | visuel/référence | carte image | oui | à décider |
| dataviz | comprendre/comparer | selon besoin | oui | à décider |
| recherche persona | trouver une aide/persona lié | champ/recherche | oui | à décider |
| thème utilisateur | appliquer ambiance/palette | système global | oui | à décider |
| état persona | micro-animation/réponse | asset state | oui | à décider |

### 4. Catalogue panneaux

À décider :

- panneau principal ;
- panneau latéral ;
- drawer contextuel ;
- modale de confirmation ;
- inbox ;
- cockpit ;
- fiche détail objet ;
- panneau conversationnel ;
- panneau mobile condensé.
- pages complètes adaptatives composées de widgets.
- mode projection / plein écran prof.

### 5. Assets / personas / identité

À décider :

- avatars personas ;
- badges ;
- icônes de modes ;
- boutons d'action ;
- états visuels : privé, candidat, validé, bloqué, futur, live ;
- cartes RPG ;
- assets D08 ;
- règles d'utilisation des références visuelles ;
- place de la génération image.

### 6. États obligatoires

Chaque surface doit prévoir :

- vide ;
- chargement ;
- prêt ;
- partiel ;
- bloqué ;
- candidat ;
- à valider ;
- privé ;
- futur ;
- erreur ;
- source faible ;
- action sensible.

## Audit repo ciblé — implications UI

### DA / assets / personas visuels

État Git : fondation présente.

MasterFlow sait déjà gérer :

- références visuelles privées ;
- manifests visuels ;
- assets générés ou importés ;
- upload fichier/base64 ;
- revue et validation d'assets ;
- pont Story -> DA avec blocage d'action avant génération.

Implication UI : ne pas inventer un bouton magique "générer une image" partout. L'interface doit
afficher le bon état : asset par défaut, manifest en préparation, asset candidat, asset validé,
asset rejeté, action sensible bloquée.

Gap UI : il manque le parcours utilisateur clair pour avatar canon, assiettes/persona states,
thèmes, remplacement automatique des assets par défaut et review simple.

### Transcription / micro / mobile voice-first

État Git : contrats et adapters présents, runtime non live.

Le repo contient des références transcript/import, evidence, correction context, source refs et
adapters. Mais le registre d'adapters indique que `transcript-import-v1` reste en état `shell` et
non actionnable.

Implication UI : le CDC peut prévoir le bouton micro, le feedback live et le mobile
conversationnel, mais la première version doit afficher un état clair si la transcription est
simulée, importée manuellement ou non disponible.

Gap UI/runtime : il faut décider plus tard le vrai chemin micro -> transcription -> routing ->
action, sans le prétendre live maintenant.

### Subpersonas / MOTH / Incubator / compagnons

État Git : primitives présentes.

Le skill-tree connaît déjà des nœuds `companion` et des familles comme MOTH, MOLEKID,
INCUBATOR_CREATURE, MASTERFLEX_HELPER, STUDENT_DISCOVERY et PROJECT_MONSTER.

Implication UI : les subpersonas ne doivent pas être traités comme de simples personnages décoratifs.
Ils sont des objets de progression, de projet, de classe ou d'aide contextuelle.

Gap UI : il manque la surface projection classe, l'affichage plein écran, l'état évolutif du
subpersona, et son lien lisible avec projet/classe/progression.

### Compétences / progression / météo pédagogique

État Git : fondation solide.

MasterFlow sait déjà représenter :

- référentiels de compétences ;
- signaux de compétence ;
- progression utilisateur ;
- badges ;
- skill-tree ;
- graphes pédagogiques ;
- météo pédagogique.

Implication UI : l'interface doit transformer ces données en panneaux compréhensibles : météo,
arbre de compétences, prochains gestes, alertes pédagogiques, progression par classe/projet/étudiant.

Gap UI : il manque les widgets finaux, la hiérarchie d'affichage et le lien narratif/visuel entre
progression, badges, compagnons et feedbacks.

### Règle de reconstruction

On ne repart pas de zéro côté moteur. On repart de zéro côté expérience.

Le build UI doit donc partir de cette logique :

```txt
primitive Git existante
-> contrat produit clair
-> surface UI minimale
-> état utilisateur lisible
-> action suivante
```

## Surfaces V1 à concevoir

### 1. App shell

Rôle : cadre permanent de l'application.

Doit contenir :

- barre latérale gauche ;
- accès modes autorisés ;
- profil/persona actif ;
- indicateur inbox discret ;
- accès recherche / palette de commande ;
- état de connexion/contexte, sans jargon technique.

Ne doit pas contenir :

- logs ;
- jobs ;
- providers ;
- debug ;
- métriques internes permanentes.

### 2. Home / point de reprise

Rôle : comprendre en dix secondes où on en est et quoi faire.

Widgets V1 :

- contexte actif ;
- dernière reprise utile ;
- prochaine action principale ;
- raccourcis modes ;
- mini-inbox / notifications importantes ;
- pour prof : classes, sujets, corrections, alertes ;
- pour étudiant : projet actif, sujets assignés, prochaine tâche, feedbacks, ressources ;
- pour MALEX/godmode : chantiers actifs, décisions attendues, alertes, action logique.

### 3. Persona rail

Rôle : rendre l'assistant/persona présent sans envahir l'écran.

Composants V1 :

- avatar/persona principal à gauche ;
- état visuel courant ;
- raccourcis de dialogue ;
- attribution claire des réponses ;
- placeholder asset par défaut si asset personnalisé absent ;
- état "asset candidat / validé / à revoir" si pertinent.

### 4. Chat extensible

Rôle : conversation familière, compacte au repos, puissante à l'usage.

Composants V1 :

- input bas d'écran ;
- expansion conversation ;
- bulles par persona ;
- mode dialogue limité à quelques intervenants ;
- indication source/confiance quand la réponse dépend de données importantes ;
- action suivante après réponse.

### 5. Page complète adaptative

Rôle : ouvrir un objet important sans modal étriquée.

Objets concernés :

- classe ;
- projet ;
- sujet ;
- étudiant ;
- correction ;
- ressource ;
- asset/persona ;
- companion/subpersona.

Structure V1 :

- header contexte ;
- statut clair ;
- prochaine action logique ;
- zone centrale de travail ;
- colonne contextuelle : sources, personas, inbox, ressources, raccourcis.

### 6. Teaching cockpit

Rôle : piloter classes, sujets, corrections et progression.

Widgets V1 :

- liste classes/cours ;
- sujets assignés ;
- progression simple ;
- corrections/feedbacks ;
- météo pédagogique ;
- alertes de classe ;
- accès roster/context pack quand utile ;
- recherche personas/aides.

### 7. Student project cockpit

Rôle : aider l'étudiant à savoir quoi faire maintenant.

Widgets V1 :

- projet actif ;
- sujet(s) assigné(s) ;
- prochaine tâche/rendu ;
- feedbacks prof ;
- ressources recommandées ;
- personnes/personas liés ;
- progression personnelle.

### 8. Projection classe

Rôle : usage prof en classe, écran simple, micro et subpersona.

V1 doit prévoir :

- plein écran lisible ;
- subpersona / MOTH / Incubator affiché clairement ;
- état du projet ou activité ;
- bouton micro / transcription si disponible ;
- fallback manuel si micro non live ;
- conversation de classe guidée ;
- sortie calme vers Teaching cockpit.

### 9. Asset/persona studio léger

Rôle : gérer avatar canon, états visuels et assets sans ouvrir une usine DA.

V1 doit prévoir :

- asset actuel ;
- états disponibles ;
- assets manquants ;
- manifest associé ;
- statut candidat/validé/rejeté ;
- demande de review ;
- retour vers DA avancée uniquement si nécessaire.

### 10. Command palette / raccourcis

Rôle : permettre une utilisation rapide sans rendre l'interface dépendante des raccourcis.

V1 doit prévoir :

- recherche globale ;
- navigation modes ;
- ouvrir inbox ;
- lancer/reprendre une action ;
- ouvrir un projet/classe/sujet ;
- raccourci micro ;
- raccourci projection ;
- aide raccourcis visible.

## Ordre de build recommandé

1. App shell + Home légère.
2. Persona rail + chat extensible.
3. Page complète adaptative générique.
4. Teaching cockpit.
5. Student project cockpit.
6. Asset/persona studio léger.
7. Projection classe.
8. Command palette / raccourcis.
9. Mobile voice-first.
10. Thèmes/personnalisation avancée.

Critère de succès V1 : l'utilisateur comprend où il est, ce qui est chargé, ce qu'il peut faire
maintenant, et pourquoi une action est disponible, bloquée, future ou à valider.

## Tranche de build UI-001 — Home + App Shell

### Intention

Remplacer progressivement la Home actuelle par une vraie entrée produit MasterFlow, sans casser les
contrats runtime déjà disponibles.

### État actuel du frontend

Le frontend possède déjà :

- `App.tsx` comme orchestrateur principal ;
- `app-shell.tsx` pour le shell, la situation et les modes ;
- `mode-runtime.ts` pour la projection des modes ;
- lazy-load des panneaux lourds ;
- contexte actif, personas, actions, ressources, projets, inbox, chat et panels privés.

Ces éléments sont utiles comme base technique, mais ne définissent pas l'expérience finale.

### Ce qu'on garde

- login / récupération contexte ;
- chargement progressif des panels ;
- contrats API existants ;
- modes déjà exposés ;
- `room_instance.widget_state` pour préférences simples ;
- sécurité rôle/permission ;
- panneaux privés existants hors Home normale.

### Ce qu'on change

- passer d'un dashboard technique à un point de reprise ;
- rendre la Home moins dense ;
- séparer navigation, persona, chat, contexte et prochaine action ;
- afficher les états en langage utilisateur ;
- cacher les outils internes tant qu'ils ne sont pas appelés ;
- préparer les emplacements asset/persona sans générer ni canoniser.

### App shell V1

Doit afficher :

- identité MasterFlow ;
- barre latérale modes ;
- persona actif ;
- indicateur inbox discret ;
- recherche/palette future ;
- statut de contexte compréhensible.

Ne doit pas afficher par défaut :

- nombre brut de jobs ;
- providers ;
- logs ;
- outils D08/D09/D10/D12 ;
- états backend internes.

### Home V1

Doit afficher :

- `Tu es ici` : contexte actif ;
- `À reprendre` : dernier checkpoint ou dernière action utile ;
- `Prochaine action` : un geste principal ;
- `Modes utiles` : accès rapide selon rôle ;
- `À surveiller` : inbox/alertes importantes ;
- `Ressources utiles` : maximum quelques sources contextualisées ;
- `Persona actif` : présence, état, fallback asset si besoin.

### États à représenter dès UI-001

- contexte chargé ;
- contexte incomplet ;
- action disponible ;
- action bloquée ;
- validation requise ;
- source faible ;
- asset par défaut ;
- asset candidat ;
- fonction future ;
- erreur backend.

### Hors scope UI-001

- génération réelle d'assets ;
- drag & drop complet ;
- projection classe ;
- mobile voice-first complet ;
- refonte de tous les panels métiers ;
- canonisation automatique d'un output ;
- changement backend sensible.

### Critère de validation UI-001

En ouvrant MasterFlow, un utilisateur doit comprendre en dix secondes :

- qui il est dans le système ;
- quel contexte est actif ;
- ce qu'il peut faire maintenant ;
- ce qui est bloqué ou à valider ;
- où aller sans voir les entrailles techniques.

## Tranche de build UI-002 — Persona rail + chat extensible

### Intention

Faire du persona le compagnon visible de l'expérience, sans transformer l'interface en théâtre
illisbile ni confondre persona, permission et vérité.

### Ce qu'on garde

- chat WebSocket existant ;
- personas chargés dans le contexte ;
- active blend / persona actif ;
- historique conversationnel ;
- messages système séparés ;
- sécurité rôle/permission déjà appliquée par le backend.

### Persona rail V1

Doit afficher :

- persona actif ;
- nom / rôle simple ;
- état visuel courant ;
- asset par défaut ou asset validé ;
- indication si asset candidat ou manquant ;
- action rapide : parler, demander aide, ouvrir détails.

États visuels V1 :

- neutre ;
- écoute ;
- réflexion ;
- réponse ;
- succès ;
- alerte ;
- erreur/échec ;
- humour/personnalité ;
- intervention spéciale.

### Chat extensible V1

Doit fonctionner ainsi :

- compact au repos ;
- s'ouvre quand l'utilisateur écrit ou consulte ;
- garde l'input en bas ;
- montre clairement qui parle ;
- affiche les réponses persona principal par défaut ;
- autorise quelques personas invités ;
- garde les messages système hors conversation principale ;
- propose une action suivante quand c'est utile.

### Mode dialogue V1

Limite recommandée :

- persona principal + 2 ou 3 invités maximum ;
- attribution visuelle claire ;
- couleur ou signature par persona ;
- intervention des invités seulement quand utile ;
- aucun persona invité ne donne de droits supplémentaires.

### Source truth conversationnelle

Quand une réponse dépend d'une source, d'une action sensible ou d'une génération, le chat doit
indiquer l'état sans noyer l'utilisateur :

- source fiable ;
- source faible ;
- hypothèse ;
- action bloquée ;
- validation requise ;
- génération candidate ;
- canon validé.

### Hors scope UI-002

- dialogue multi-agent complexe ;
- génération automatique massive d'assets persona ;
- animation temps réel coûteuse ;
- voix live complète ;
- modification des droits par persona ;
- canonisation automatique des réponses.

### Critère de validation UI-002

L'utilisateur doit sentir qu'il parle à son assistant/persona, comprendre qui intervient, et ne
jamais confondre une réponse conversationnelle avec une action validée ou un canon produit.

## Tranche de build UI-003 — Page complète adaptative

### Intention

Créer le modèle commun des grandes pages MasterFlow pour éviter que chaque mode réinvente sa mise
en scène.

### Objets concernés

- classe ;
- projet ;
- sujet ;
- étudiant ;
- correction ;
- ressource ;
- asset/persona ;
- companion/subpersona ;
- workbench Story ;
- objet Inventory.

### Structure V1

```txt
Header contexte
-> résumé
-> statut
-> prochaine action
-> alerte principale si nécessaire

Zone centrale
-> widgets métier
-> contenu principal
-> progression
-> rendus / feedbacks / ressources

Colonne contextuelle
-> personas/personnes liés
-> sources
-> inbox/alertes
-> raccourcis
-> état de confiance
```

### Règles de comportement

- une page s'ouvre pour un objet important, pas une petite modale ;
- les widgets dépendent du rôle, du mode et du contexte ;
- la page garde une prochaine action claire ;
- les sources et limites restent accessibles ;
- les panneaux techniques restent cachés sauf besoin ;
- l'utilisateur peut masquer/épingler certains widgets simples.

### Critère de validation UI-003

Une classe, un projet ou un sujet doit devenir un espace de travail clair, avec contexte,
progression, sources, personnes/personas liés et prochaine action.

## Tranche de build UI-004 — Teaching cockpit

### Intention

Faire du mode Teaching un cockpit prof clair : classes, sujets, corrections, progression,
feedbacks, météo pédagogique et prochaines actions, sans exposer la mécanique interne.

### Fondations Git à réutiliser

Le repo contient déjà des briques utiles :

- cohortes et rosters versionnés ;
- subject assignments ;
- correction batches ;
- correction context snapshot/payload ;
- identity review ;
- pre-correction manifests ;
- correction sheets ;
- validation inbox ;
- compétences, signaux, progression ;
- météo pédagogique ;
- action registry pour progression/weather.

### Vue Teaching V1

Doit afficher :

- classes/cours accessibles ;
- sujets assignés ou à assigner ;
- corrections/feedbacks à reprendre ;
- progression synthétique ;
- météo pédagogique ;
- alertes importantes ;
- prochaine action par classe/sujet/correction ;
- accès roster/context pack seulement quand utile.

### Page classe V1

Doit afficher :

- nom classe/cohorte ;
- période ;
- roster actif/version ;
- sujets liés ;
- progression globale ;
- météo de classe ;
- alertes ou blocages ;
- étudiants/membres ;
- ressources et preuves principales ;
- subpersona/compagnon associé si présent.

La page classe doit éviter de montrer le roster brut partout. Elle affiche seulement ce qui aide le
prof à piloter, avec accès au détail si nécessaire.

### Page sujet V1

Doit afficher :

- brief/sujet actif ;
- niveau/promo visée ;
- ressources ;
- compétences visées ;
- groupes ou étudiants concernés ;
- rendus attendus ;
- prochaine action prof ;
- état correction/feedback si le sujet est lancé.

### Page étudiant V1 côté prof

Doit afficher :

- contexte classe/sujet ;
- progression utile ;
- feedbacks récents ;
- alertes pédagogiques ;
- compétences ou signaux ;
- ressources recommandées ;
- prochaine action prof.

Elle ne doit pas devenir un dossier administratif lourd.

### États Teaching obligatoires

- classe prête ;
- classe partielle ;
- roster absent/faible ;
- sujet non assigné ;
- correction prête ;
- correction à valider ;
- feedback disponible ;
- identité à confirmer ;
- contexte source incomplet ;
- météo stable / vigilance / urgence.

### Hors scope UI-004

- correction automatique complète ;
- migration de données étudiants ;
- import massif non validé ;
- modification de notes sans validation ;
- exposition de données privées hors rôle ;
- dataviz complexe avant modèle simple lisible.

### Critère de validation UI-004

Un prof doit pouvoir ouvrir Teaching et savoir immédiatement :

- quelle classe ou sujet reprendre ;
- quoi corriger ou valider ;
- quels signaux pédagogiques surveiller ;
- quelle action faire maintenant.

## Tranche de build UI-005 — Projection classe + subpersona

### Intention

Créer une surface prof pleine page pour l'agilité pédagogique : afficher un subpersona, piloter une
activité de classe, utiliser le micro si disponible, et garder un lien clair avec projet/classe.

### Rôle du subpersona

Le subpersona peut être :

- MOTH ;
- Incubator ;
- Project Monster ;
- compagnon de situation ;
- gardien de cadre ;
- provocateur pédagogique ;
- indicateur poétique d'avancement.

Il n'est pas forcément un persona officiel global. Il peut être lié à une classe, un projet, un
sujet ou une activité.

### Projection V1

Doit afficher :

- subpersona en grand ;
- nom/rôle du subpersona ;
- classe/projet/sujet actif ;
- consigne ou activité en cours ;
- état pédagogique simple ;
- bouton micro si disponible ;
- fallback saisie texte si micro non live ;
- sortie rapide vers Teaching cockpit ;
- rappel discret des limites/source/contexte.

### Comportement en classe

La projection doit permettre :

- lancer une discussion guidée ;
- recentrer le groupe quand il dérive ;
- poser une question au subpersona ;
- afficher une consigne ;
- faire apparaître un signal d'avancement ;
- préparer une synthèse courte après activité.

### Micro / transcription

Le micro est un objectif produit, mais pas une promesse implicite de runtime live.

États à afficher :

- micro disponible ;
- transcription disponible ;
- import manuel disponible ;
- mode texte seulement ;
- fonctionnalité future ;
- source faible ou non vérifiée.

Si la transcription live n'est pas prête, la projection doit rester utilisable via saisie texte ou
import manuel.

### Évolution du subpersona

Le subpersona doit pouvoir évoluer en fonction :

- du projet ;
- de la classe ;
- des jalons ;
- des signaux pédagogiques ;
- des validations prof ;
- des assets générés/validés.

Cette évolution doit passer par des états candidats et validés. Elle ne doit pas modifier le canon
global sans décision.

### Hors scope UI-005

- temps réel vocal complet si adapter non live ;
- animation 3D ou motion coûteuse ;
- génération non review d'assets classe ;
- persona autonome qui prend des décisions prof ;
- exposition d'informations privées en projection.

### Critère de validation UI-005

En classe, le prof doit pouvoir projeter un compagnon utile, lancer une interaction simple, garder
le cadre pédagogique et revenir au cockpit sans friction.

## Tranche de build UI-006 — Student project cockpit

### Intention

Donner à l'étudiant une vue simple de son travail : projet actif, sujet(s), prochaines tâches,
ressources, feedbacks, progression et aides/personas disponibles.

### Vue étudiant V1

Doit afficher :

- projet actif ;
- sujet(s) assigné(s) ;
- prochaine tâche ;
- prochain rendu ;
- feedbacks prof ;
- ressources utiles ;
- personas ou aides liés ;
- progression compréhensible ;
- alertes importantes.

### Plusieurs briefs / sujets

Un étudiant peut répondre à plusieurs briefs.

L'interface doit donc :

- lister les sujets actifs ;
- montrer le statut de chacun ;
- permettre de reprendre le bon sujet ;
- éviter de mélanger feedbacks, ressources et deadlines ;
- afficher clairement le contexte actif dans le chat.

### Aide sans faire à la place

Le cockpit étudiant doit aider et orienter, mais ne pas faire le travail à la place du groupe.

Exemples d'actions acceptables :

- clarifier le brief ;
- préparer une checklist ;
- pointer une ressource ;
- proposer une méthode ;
- demander validation prof ;
- aider à synthétiser une prochaine séance.

Actions sensibles :

- produire un rendu final à la place ;
- inventer une source ;
- contourner une consigne ;
- masquer une faiblesse du projet ;
- générer un livrable canon sans validation.

### États étudiant obligatoires

- sujet prêt ;
- sujet à clarifier ;
- ressource manquante ;
- feedback reçu ;
- prochaine tâche claire ;
- validation prof recommandée ;
- alerte deadline ;
- aide disponible ;
- source faible.

### Critère de validation UI-006

Un étudiant doit comprendre quoi faire maintenant, avec quelles ressources, dans quel sujet, et
quand demander aide ou validation.

## Tranche de build UI-007 — Asset/persona studio léger

### Intention

Permettre de gérer avatar canon, assets de persona, états visuels, icônes et outputs générés sans
ouvrir une usine DA à chaque fois.

### Vue V1

Doit afficher :

- persona ou entité concernée ;
- avatar actuel ;
- assets disponibles ;
- états manquants ;
- manifest associé ;
- statut : défaut, candidat, validé, rejeté, à revoir ;
- prompt/source/paramètres si output généré ;
- prochaine action : garder, retoucher, rejeter, valider, transformer en référence.

### Génération autonome encadrée dans l'UI

Le studio ne doit pas demander à l'utilisateur de tout piloter.

Comportement :

- si les specs minimales existent, MasterFlow peut préparer un manifest et lancer un candidat ;
- si les specs sont insuffisantes, MasterFlow garde l'asset par défaut et crée une tâche d'affinage ;
- les outputs restent candidats ;
- la review classe l'output dans la DA : asset, référence, template, anti-pattern ou preuve de dérive.

### Rôles d'assets à prévoir

- avatar ;
- état de persona ;
- icône de mode ;
- badge ;
- companion/subpersona ;
- décor/projection ;
- template de sortie ;
- référence DA ;
- anti-pattern.

### Relation avec D08

Le studio léger est une surface d'usage. D08 reste la surface avancée pour :

- registres visuels ;
- manifests détaillés ;
- classification de références ;
- review approfondie ;
- audit DA ;
- canonisation plus sensible.

### Critère de validation UI-007

Un utilisateur doit pouvoir voir ce qui existe, ce qui manque, ce qui est candidat, et améliorer ses
assets sans croire qu'une génération automatique est déjà canon.

## Tranche de build UI-008 — Command palette + raccourcis

### Intention

Permettre une utilisation rapide de MasterFlow sans forcer tout le monde à retenir des raccourcis.
Les raccourcis accélèrent l'usage, mais aucune action importante ne doit exister uniquement au
clavier.

### Command palette V1

Déclencheur recommandé :

- `Cmd/Ctrl+K` sur desktop ;
- bouton recherche/action visible dans l'app shell ;
- accès mobile via bouton ou champ de recherche.

Doit permettre :

- chercher un mode ;
- ouvrir une classe ;
- ouvrir un projet ;
- ouvrir un sujet ;
- reprendre une action ;
- ouvrir l'inbox ;
- chercher une ressource ;
- chercher un persona/aide ;
- lancer projection classe ;
- activer micro si disponible ;
- ouvrir aide raccourcis.

### Raccourcis V1

Raccourcis candidats :

- navigation modes ;
- ouvrir/fermer chat ;
- ouvrir inbox ;
- reprendre prochaine action ;
- lancer micro ;
- basculer projection ;
- ouvrir recherche ;
- retour Home ;
- valider/refuser une décision quand le focus est explicitement dans une carte de validation.

### Règles de sécurité

- jamais d'action destructive par raccourci seul ;
- jamais de commit/push/export/publication/devis/envoi sans confirmation visible ;
- aucun changement de permission par raccourci ;
- toutes les actions sensibles doivent afficher intention, effet et validation.

### Critère de validation UI-008

Un utilisateur avancé doit pouvoir piloter vite. Un utilisateur débutant doit pouvoir ignorer les
raccourcis sans perdre de fonctionnalité.

## Tranche de build UI-009 — Mobile voice-first

### Intention

Faire du mobile une interface conversationnelle efficace, pas une version miniaturisée et pénible
du desktop.

### Principe

Sur mobile, MasterFlow doit montrer moins de panneaux et privilégier :

- contexte actif ;
- prochaine action ;
- chat ;
- micro si disponible ;
- validation claire ;
- cartes condensées ;
- reprise rapide.

### Navigation mobile V1

Doit prévoir :

- Home compacte ;
- modes accessibles mais non envahissants ;
- chat facilement ouvrable ;
- bouton micro très visible ;
- inbox discrète ;
- action principale ;
- cartes verticales ;
- retour simple au contexte actif.

### Voice-first sans mensonge runtime

Le mobile peut être pensé voice-first, mais l'UI doit rester honnête :

- si micro live disponible : bouton micro actif ;
- si transcription disponible : état clair ;
- si seulement import manuel : proposer import/coller transcription ;
- si non disponible : mode texte sans bloquer l'expérience.

### Actions mobiles prioritaires

- poser une question ;
- dicter un feedback ;
- reprendre une classe/projet ;
- consulter une prochaine action ;
- valider/refuser une petite décision ;
- capturer une note ;
- consulter une ressource ;
- lancer projection depuis le prof si pertinent.

### Hors scope UI-009

- parité complète de tous les panneaux desktop ;
- édition lourde de CDC/sujets ;
- admin/godmode complet ;
- drag & drop ;
- génération d'assets avancée ;
- debug runtime.

### Critère de validation UI-009

Sur mobile, l'utilisateur doit pouvoir agir vite par conversation, micro ou carte simple, sans être
forcé de naviguer dans toute l'architecture MasterFlow.

## Tranche de build UI-010 — Thèmes, DA visuelle et accessibilité

### Intention

Créer une interface personnalisable et forte visuellement, tout en gardant lisibilité,
accessibilité et compatibilité marque blanche.

### Design system V1

Doit séparer :

- structure produit ;
- thème visuel ;
- intensité RPG ;
- assets persona ;
- palettes ;
- états UI ;
- variante MALEX ;
- variante sobre/institutionnelle future.

### Thème utilisateur

Le tunnel d'intro doit pouvoir définir :

- couleur principale ;
- couleur secondaire ;
- couleur d'action ;
- couleur d'alerte ;
- couleur de succès ;
- préférence clair/sombre ;
- ambiance ;
- intensité RPG ;
- assets/persona associés.

### Moteur de palette

Le système doit pouvoir produire une palette cohérente avec :

- complémentaires ;
- analogues ;
- triades ;
- contraste ;
- mode nuit ;
- lisibilité ;
- accessibilité.

### États UI à ne pas coder seulement par couleur

Chaque état doit rester lisible par forme, texte, icône ou structure :

- prêt ;
- bloqué ;
- candidat ;
- validé ;
- rejeté ;
- source faible ;
- validation requise ;
- action sensible ;
- futur ;
- erreur.

### Relation avec la DA

La DA MasterFlow est l'autorité visuelle. Le design system doit donc relier :

- avatars ;
- assiettes/assets ;
- icônes ;
- badges ;
- companions ;
- outputs candidats ;
- références validées ;
- anti-patterns ;
- thèmes.

### Critère de validation UI-010

L'interface MALEX peut être RPG, gold, vivante et forte, mais elle doit rester lisible,
accessible, déclinable et gouvernée par la DA plutôt que par des goûts improvisés écran par écran.

## Ponts entre modes — principe transversal

MasterFlow ne doit pas devenir une suite de modules isolés. Un mode est une surface de travail,
pas une prison fonctionnelle.

Principe :

```txt
objet actif
-> mode courant
-> pont proposé
-> nouveau mode avec contexte conservé
-> retour possible au mode d'origine
```

Exemples de ponts attendus :

- Sujet / concours -> MasterStory : transformer un brief en scénario, lore, parcours, contraintes,
  personnages et mécaniques de jeu viables.
- Projet / motion -> MasterStory : rendre une production plus robuste par narration, structure,
  séquence, rythme et intentions.
- Teaching -> MasterStory : masteriser un sujet, créer une activité dont vous êtes le héros,
  scénariser un concours ou une progression.
- Inventory -> Project : utiliser ressources/assets/preuves dans un projet actif.
- Inventory -> DA : classer une référence visuelle, un asset, un output ou un anti-pattern.
- Inventory -> Help/MasterHelp : transformer un ensemble de contraintes/ressources en accompagnement
  situationnel.
- Learn -> Inventory : rattacher vidéos, timecodes, ressources et notions au bon parcours.
- Learn -> Teaching : convertir un programme de formation en séquence pédagogique exploitable.
- Godmode -> Theme Studio : corriger une vision produit, un thème, une DA ou une incohérence de
  présentation.
- Theme Studio -> toutes rooms : appliquer thème, fonts, couleurs, assets, intensité RPG ou variante
  institutionnelle selon scope.

### Règles de pont

Un pont doit toujours afficher :

- source du contexte ;
- ce qui est conservé ;
- ce qui change ;
- ce qui devient candidat ;
- ce qui reste à valider ;
- comment revenir au mode précédent.

Un pont ne doit jamais :

- canoniser automatiquement ;
- perdre les sources ;
- mélanger projet, sujet, asset et persona sans trace ;
- lancer une action sensible sans validation ;
- inventer un scénario ou une DA comme vérité finale.

### Ponts comme propositions visuelles

Quand MasterFlow propose une fonctionnalité ou un pont, cela ne doit pas apparaître comme du texte
normal.

La proposition doit être visuellement distincte :

- carte d'action ;
- badge de statut ;
- couleur ou bordure dédiée ;
- bouton clair ;
- icône de mode cible ;
- mention source/confiance ;
- état : disponible, recommandé, futur, bloqué, validation requise.

Objectif : l'utilisateur comprend que MasterFlow ne parle pas seulement ; il propose un chemin
actionnable.

## Mode Theme Studio

Theme Studio devient un mode à part entière.

Rôle : piloter la DA root, les thèmes, couleurs, typos, assets, packs visuels, intensité RPG,
versions institutionnelles, variantes dynamiques et cohérence graphique globale.

### Objets pilotés

- DA root ;
- thèmes ;
- palettes ;
- typos / font packs ;
- icônes ;
- assets fallback ;
- assets persona ;
- badges ;
- companions/subpersonas ;
- variantes marque blanche ;
- thèmes événementiels ;
- règles d'accessibilité ;
- anti-patterns visuels.

### Scopes possibles

Un thème peut s'appliquer à :

- tout MasterFlow ;
- une room ;
- un projet ;
- une classe ;
- un sujet/concours ;
- un événement ;
- un mode ;
- un persona ;
- une variante institutionnelle.

### Packs de thèmes

Un theme pack doit pouvoir contenir :

- couleurs ;
- fonts ;
- assets fixes ;
- assets dynamiques ;
- niveau d'animation ;
- intensité RPG ;
- fallback sobre ;
- règles accessibilité ;
- droits/licences ;
- source DA ;
- statut candidat/validé/rejeté.

Exemples de packs :

- MALEX / MasterFlow canon ;
- institutionnel sobre ;
- événementiel / concours / JPO ;
- Story/RPG ;
- accessibilité ;
- projet ou classe spécifique.

### Pouvoir godmode

Godmode doit pouvoir :

- voir qu'une vision produit ou graphique ne fonctionne pas ;
- ouvrir Theme Studio ;
- changer ou tester une variante ;
- comparer deux directions ;
- classer un output comme référence ou anti-pattern ;
- appliquer un thème à un scope limité ;
- revenir en arrière si besoin.

### Garde-fous

- pas de thème global modifié sans validation ;
- pas de font sans source/licence ;
- pas de chargement massif de fonts au boot ;
- pas d'asset candidat présenté comme canon ;
- accessibilité prioritaire sur effet visuel ;
- fallback lisible obligatoire.

### Critère de validation Theme Studio

Un godmode doit pouvoir comprendre quelle DA est active, sur quel scope, avec quels assets/fonts,
quels éléments sont candidats ou validés, et comment corriger une vision sans casser tout le
produit.

### Audit d'implémentation — Theme Studio

État actuel : les fondations existent, mais Theme Studio n'est pas encore un objet métier.

Déjà présent :

- registre DA : références visuelles, manifests, assets générés ;
- storage fichier réel pour les assets ;
- `room_instance.widget_state` pour mémoriser l'état vivant d'une room ;
- checkpoints de reprise ;
- action engine + validation pour les actions sensibles ;
- loadout runtime avec modes actifs, actions disponibles et palette rapide ;
- palettes persona dans `visual_config` côté seed.

Manquant :

- contrat `theme_pack` / `font_pack` ;
- scopes d'application d'un thème ;
- statut candidat / validé / rejeté pour un thème ;
- provenance et licence des fonts ;
- résolution du thème actif dans le contexte runtime ;
- actions godmode dédiées : créer, tester, appliquer, rollback, archiver ;
- mode `theme-studio` dans le cycle de modes ;
- garde-fou pour ne pas charger toutes les fonts/assets au boot.

Décision d'architecture :

Theme Studio doit réutiliser les briques DA existantes au lieu de créer un deuxième système
graphique. Un thème référence des assets, fonts, palettes et règles ; il ne les duplique pas.

Tranche recommandée :

1. ajouter le contrat partagé `ThemePack` + `ThemeScopeAssignment` ;
2. ajouter stockage backend minimal et routes godmode ;
3. exposer `active_theme` dans le contexte runtime ;
4. ajouter le mode frontend `theme-studio` ;
5. brancher l'application progressive du thème dans le shell UI.

Ne pas faire en V1 :

- génération massive automatique de tous les assets ;
- import libre de CSS utilisateur ;
- font globale sans licence/source ;
- remplacement brutal de la DA canon.

## Ponts entre modes — audit d'implémentation

État actuel : il existe des ponts ponctuels, mais pas encore un moteur de ponts transversal.

Déjà présent :

- Story -> DA : une scène narrative peut produire un manifest visuel ;
- Story workbench : source, patches candidats, canon lock, reader state ;
- room state/checkpoints : reprise et mode actif ;
- action registry : actions live/future, risque, validation ;
- resources/inventory/subjects : objets métier exploitables par plusieurs modes.

Manquant :

- objet générique `mode_handoff` ;
- contrat source_mode -> target_mode ;
- conservation explicite des refs transférées ;
- score de pertinence du pont ;
- affichage "pont recommandé" sous forme de carte actionnable ;
- audit trail dédié quand un objet passe d'un mode à un autre ;
- règles de validation selon impact : simple navigation, création candidate, canonisation.

Principe d'architecture :

Un pont ne doit pas être une redirection UI cachée. C'est une proposition actionnable :

- source vérifiée ;
- objet concerné ;
- mode cible ;
- raison du pont ;
- risque ;
- validation requise ou non ;
- effet attendu.

Exemples de ponts V1 :

- Sujet/concours -> Story : transformer un sujet en scénario robuste ;
- Projet -> Story : créer un workbench narratif à partir d'une vision produit ;
- Story -> DA : créer un manifest visuel depuis une scène/personnage ;
- Inventory -> DA : transformer un asset validé en référence visuelle ;
- Learning -> Playlist : proposer une séquence vidéo avec timecodes ;
- Godmode -> Theme Studio : corriger une vision graphique ou un thème actif ;
- Help -> Project : transformer une aide récurrente en cockpit projet.

Tranche recommandée :

1. définir `ModeHandoffCandidate` côté shared ;
2. exposer une route backend de lecture/création de candidats ;
3. créer 3 ponts sûrs : `project_to_story`, `story_to_da`, `inventory_to_da`;
4. afficher les ponts comme cartes distinctes dans Home/Mode panels ;
5. connecter les ponts sensibles à l'action engine.

Règle de validation :

- navigation ou suggestion : pas de validation ;
- création d'objet candidat : validation légère ;
- modification canon, thème global, génération provider ou publication : validation obligatoire.

## Décisions à prendre avant build

### Décisions produit

- Home : contenu exact des cartes visibles au premier écran.
- Modes : ordre et libellés définitifs de la barre latérale.
- Prochaine action : règles de choix par rôle et contexte.
- Inbox : niveau de visibilité sur Home.
- Chat : niveau d'expansion par défaut.
- Projection classe : première activité cible.
- Student cockpit : affichage quand plusieurs briefs sont actifs.

### Décisions visuelles

- intensité RPG MALEX V1 ;
- grille générale desktop ;
- position exacte persona rail ;
- structure des bulles de chat ;
- style des cartes ;
- icônes modes ;
- palette MALEX de départ ;
- fallback assets par défaut.

### Décisions techniques non sensibles

- composants frontend à créer/remplacer ;
- découpage des widgets ;
- état local vs `room_instance.widget_state` ;
- lazy-load des panels lourds ;
- contrats frontend pour états candidat/validé/bloqué/futur ;
- stratégie responsive mobile.

### Décisions sensibles à ne pas prendre sans validation

- suppression d'un panel existant ;
- migration de données ;
- changement de permissions ;
- activation micro/transcription live ;
- génération massive d'assets ;
- publication externe ;
- canonisation automatique d'assets ;
- changement backend destructif.

## Ordre de maquettage recommandé

1. Wireframe Home desktop.
2. Wireframe App shell + barre latérale.
3. Wireframe Persona rail + chat.
4. Wireframe page complète adaptative.
5. Wireframe Teaching cockpit.
6. Wireframe Projection classe.
7. Wireframe Student cockpit.
8. Wireframe Asset/persona studio léger.
9. Wireframe mobile Home + chat + micro.
10. Plan thème MALEX V1.

Objectif : valider la structure avant de faire du beau. Le beau vient ensuite, piloté par DA.

## Wireframe texte — Home desktop V1

Objectif : écran d'accueil léger, lisible en dix secondes.

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR                                                                     │
│ MasterFlow / espace MALEX                      recherche · inbox · profil   │
├───────────────┬───────────────────────────────────────────────┬─────────────┤
│ MODE RAIL     │ HOME / POINT DE REPRISE                       │ PERSONA     │
│               │                                               │ RAIL        │
│ Home          │ ┌───────────────────────────────────────────┐ │             │
│ Teaching      │ │ Tu es ici                                │ │ avatar      │
│ Project       │ │ Contexte actif + rôle + room              │ │ état        │
│ Learning      │ └───────────────────────────────────────────┘ │ écoute      │
│ Inventory     │                                               │             │
│ Story         │ ┌───────────────────────┐ ┌─────────────────┐ │ actions     │
│ DA            │ │ Prochaine action      │ │ À reprendre     │ │ rapides     │
│ MasterHelp    │ │ bouton principal      │ │ checkpoint      │ │             │
│ Godmode       │ └───────────────────────┘ └─────────────────┘ │             │
│ Admin/Ops     │                                               │             │
│               │ ┌───────────────────────┐ ┌─────────────────┐ │             │
│               │ │ À surveiller          │ │ Ressources      │ │             │
│               │ │ inbox/alertes         │ │ utiles          │ │             │
│               │ └───────────────────────┘ └─────────────────┘ │             │
│               │                                               │             │
│               │ ┌───────────────────────────────────────────┐ │             │
│               │ │ Modes utiles / cartes selon rôle          │ │             │
│               │ └───────────────────────────────────────────┘ │             │
├───────────────┴───────────────────────────────────────────────┴─────────────┤
│ CHAT COMPACT : poser une question / reprendre / demander aide                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Zones

#### 1. Top bar

Rôle : identité de l'application, recherche, inbox, profil.

Doit rester calme. Pas de métriques techniques.

#### 2. Mode rail gauche

Rôle : navigation stable.

Ordre provisoire :

1. Home
2. Teaching
3. Project
4. Learning
5. Inventory
6. Story
7. DA
8. MasterHelp
9. Godmode / Pilotage
10. Admin/Ops si autorisé

Les modes non autorisés n'apparaissent pas ou sont clairement verrouillés selon contexte.

#### 3. Zone centrale Home

Cartes visibles V1 :

- `Tu es ici` : contexte actif, rôle, room, source de contexte ;
- `Prochaine action` : un bouton principal + raison ;
- `À reprendre` : checkpoint, dernière action ou dernier chantier ;
- `À surveiller` : inbox, alertes, validations importantes ;
- `Ressources utiles` : quelques sources contextualisées ;
- `Modes utiles` : raccourcis selon rôle.

Règle : pas plus de 5 ou 6 cartes visibles en même temps.

#### 4. Persona rail droit ou gauche dédié

Décision provisoire : persona rail à droite si mode rail à gauche, pour éviter deux colonnes
visuellement concurrentes à gauche. À valider visuellement.

Doit afficher :

- avatar ;
- nom ;
- état ;
- rôle ;
- asset par défaut/candidat/validé ;
- micro-actions conversationnelles.

#### 5. Chat compact bas

Rôle : toujours disponible, non envahissant.

Comportement :

- compact au repos ;
- s'étend à l'écriture ;
- indique quel persona répond ;
- peut passer en mode dialogue si personas invités.

### Variante prof

Cartes prioritaires :

- prochaine classe/sujet à reprendre ;
- corrections/feedbacks ;
- météo pédagogique ;
- validations attendues ;
- ressources utiles ;
- projection classe si activité en cours.

### Variante étudiant

Cartes prioritaires :

- projet actif ;
- sujet(s) actif(s) ;
- prochaine tâche ;
- feedback récent ;
- ressource utile ;
- aide/persona recommandé.

### Variante MALEX/godmode

Cartes prioritaires :

- chantiers actifs ;
- décisions attendues ;
- alertes bloquantes ;
- prochaine action système ;
- inbox ;
- opportunités/gaps à examiner.

### Décision recommandée

Pour UI-BUILD-001, construire d'abord cette Home desktop avec données existantes et placeholders
propres, sans créer de nouvelles capacités backend.

## Première vague de build recommandée

Si on passe en implémentation, la première vague sûre est :

```txt
UI-BUILD-001
-> créer Home V1 légère
-> réorganiser App shell
-> garder panels existants lazy-load
-> ajouter états utilisateur lisibles
-> ne pas toucher backend
-> ne pas supprimer anciens panels
```

Succès :

- Home moins technique ;
- prochaine action visible ;
- modes accessibles ;
- persona actif visible ;
- inbox discrète ;
- panels privés toujours accessibles mais cachés ;
- tests/lint frontend/backend OK si disponibles.

## Wireframe texte — App shell + persona rail + chat

Objectif : définir les éléments persistants autour de toutes les rooms.

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR : MasterFlow · contexte actif · recherche · inbox · profil          │
├───────────────┬───────────────────────────────────────────────┬─────────────┤
│ MODE RAIL     │ SURFACE ACTIVE                                │ PERSONA     │
│ fixe          │ Home / Teaching / Project / etc.              │ RAIL        │
│               │                                               │ fixe ou     │
│ icône+label   │ contenu de la room                            │ collapsible │
│ statut court  │                                               │             │
│               │                                               │ avatar      │
│               │                                               │ état        │
│               │                                               │ rôle        │
│               │                                               │ actions     │
├───────────────┴───────────────────────────────────────────────┴─────────────┤
│ CHAT DOCK : input compact · persona actif · source/état · expansion         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### App shell V1

L'app shell doit rester présent dans toutes les rooms.

Contenu persistant :

- top bar ;
- mode rail ;
- surface active ;
- persona rail ;
- chat dock ;
- indicateur inbox ;
- profil/session.

Règle : l'app shell organise l'expérience, mais ne doit pas devenir un dashboard technique.

### Top bar V1

Doit afficher :

- nom MasterFlow ;
- contexte actif très court ;
- recherche/palette ;
- inbox discrète ;
- profil/session.

Ne doit pas afficher :

- logs ;
- jobs ;
- providers ;
- détails runtime ;
- métriques permanentes.

### Mode rail V1

Comportement :

- position gauche desktop ;
- icône + label ;
- état court si utile ;
- mode actif visible ;
- modes non autorisés masqués ou verrouillés ;
- compact possible sur petits écrans.

Ordre provisoire :

```txt
Home
Teaching
Project
Learning
Inventory
Story
DA
MasterHelp
Godmode/Pilotage
Admin/Ops
```

Décision : Teaching reste haut dans la navigation car c'est la room pilote.

### Persona rail V1

Position recommandée provisoire : droite desktop.

Raison : la gauche est déjà occupée par le mode rail. Le persona à droite crée un équilibre
conversationnel et laisse la surface centrale respirer.

Doit afficher :

- avatar ou fallback ;
- nom ;
- rôle/persona ;
- état : neutre, écoute, réflexion, réponse, succès, alerte, erreur, spécial ;
- statut asset : défaut, candidat, validé, manquant ;
- micro-actions : parler, ouvrir détails, inviter aide/persona, demander prochaine action.

Comportement :

- visible sur Home et desktop ;
- collapsible si la room a besoin d'espace ;
- jamais bloquant ;
- ne donne jamais de permissions supplémentaires ;
- affiche clairement si l'asset est candidat ou par défaut.

### Chat dock V1

Position : bas de l'écran.

États :

- compact ;
- actif ;
- étendu ;
- dialogue multi-persona ;
- bloqué / offline ;
- source faible ;
- validation requise.

Doit afficher :

- input simple ;
- persona qui répond ;
- bouton envoyer ;
- bouton micro uniquement si disponible ou explicitement futur ;
- indicateur source/confiance quand nécessaire ;
- accès à l'historique récent ;
- possibilité d'étendre la conversation.

### Mode dialogue V1

Quand plusieurs personas sont impliqués :

- persona principal reste l'orchestrateur ;
- invités visibles à droite ou dans la conversation ;
- chaque bulle est attribuée ;
- maximum 2 ou 3 invités ;
- l'utilisateur doit comprendre pourquoi chaque persona intervient.

### Responsive V1

Desktop :

- rail gauche visible ;
- persona rail droit visible ;
- chat dock bas.

Tablette :

- rail gauche compact ;
- persona rail collapsible ;
- chat dock bas.

Mobile :

- rail remplacé par menu/modes ;
- persona en header ou carte compacte ;
- chat prioritaire ;
- micro/texte très accessibles.

### Décision recommandée

UI-BUILD-001 doit construire ce shell en version desktop d'abord, avec comportement responsive
simple. Les raffinements mobile et micro viennent dans une tranche dédiée.

## Contrat d'exécution — UI-BUILD-001

### Intention produit

Transformer l'entrée MasterFlow en point de reprise clair, léger et orienté utilisateur.

Le but n'est pas de refaire toute l'application. Le but est de remplacer la sensation de dashboard
technique par une Home lisible qui charge le contexte actif, montre la prochaine action, rend le
persona présent et garde les panels lourds accessibles à la demande.

### Partie du canon concernée

- D03 Room OS / expérience ;
- D04 personas/contextual bots ;
- D05 Teaching ;
- D08 DA/assets uniquement en affichage d'état ;
- Source truth / contexte actif ;
- Validation inbox en signal discret.

### Ce qui doit changer

- structure visuelle de la Home ;
- organisation de l'app shell ;
- affichage du persona actif ;
- présentation des modes ;
- cartes de reprise : contexte, prochaine action, reprise, surveillance, ressources ;
- chat compact plus clairement identifié ;
- libellés orientés utilisateur.

### Ce qui ne doit pas changer

- backend ;
- permissions ;
- API contracts ;
- données ;
- panels existants ;
- routes sensibles ;
- génération d'assets ;
- micro/transcription live ;
- logique de validation ;
- canonisation d'outputs.

### Scope technique autorisé

Autorisé :

- modifier composants frontend existants ;
- créer petits composants UI communs ;
- réorganiser layout CSS ;
- ajouter placeholders sûrs ;
- garder lazy-load des panels lourds ;
- utiliser les données déjà présentes dans `CurrentContext`, personas, actions, resources,
  checkpoints, validation inbox.

Non autorisé dans cette vague :

- supprimer des panels ;
- ajouter une nouvelle route backend ;
- lancer une migration ;
- activer provider externe ;
- générer massivement des images ;
- modifier les rôles ou permissions ;
- publier/exporter/envoyer quoi que ce soit.

### Critères de succès utilisateur

En ouvrant MasterFlow, l'utilisateur comprend :

- qui il est ;
- dans quelle room/contexte il se trouve ;
- quel persona l'accompagne ;
- quelle action faire maintenant ;
- ce qui demande attention ;
- où sont les modes utiles ;
- que les outils avancés existent mais restent cachés.

### Critères de succès techniques

- l'app démarre ;
- pas de régression de login/contexte ;
- panels existants toujours accessibles ;
- pas de bundle volontairement alourdi ;
- `npm run lint` passe si disponible ;
- `npm test` passe si le backend est touché, sinon pas obligatoire ;
- build frontend à lancer seulement si la tranche touche beaucoup de CSS/layout ou avant publish.

### Risques de dérive

- trop remplir la Home ;
- recréer un dashboard technique ;
- cacher une action importante ;
- confondre persona et permission ;
- afficher un asset candidat comme canon ;
- commencer Teaching complet trop tôt ;
- ajouter du backend alors que la vague doit rester frontend.

### Garde-fous

- maximum 5 ou 6 cartes visibles sur Home ;
- aucune action sensible sans confirmation ;
- tout état important doit avoir un libellé utilisateur ;
- garder les surfaces admin/ops privées hors Home normale ;
- si une donnée manque, afficher `à compléter` ou un placeholder, pas inventer.

### Ordre d'implémentation recommandé

1. Identifier les données déjà disponibles dans `App.tsx`.
2. Créer/adapter composants : top bar, mode rail, home card, persona rail, chat compact.
3. Réorganiser `app-shell.tsx` sans changer la logique d'auth.
4. Brancher les cartes Home sur contexte/checkpoint/actions/resources/inbox.
5. Mettre les panels privés derrière accès explicite.
6. Ajuster CSS responsive desktop d'abord.
7. Vérifier login + Home + navigation modes + accès panels.
8. Lancer lint/checks proportionnés.

### Décision de lancement

Statut : prêt à lancer plus tard.

Recommandation : ne pas coder tant que les wireframes App shell + Persona rail/chat ne sont pas
validés ou suffisamment évidents.

## Parcours de questions guidé

### Bloc A — Vision générale

1. Quand tu ouvres MasterFlow, quelle sensation doit dominer ?
2. L'accueil doit-il ressembler plutôt à un cockpit, une room vivante, un bureau magique, un jeu RPG ou un outil pro ?
3. Quelle information doit absolument être comprise en 10 secondes ?
4. Qu'est-ce qui doit rester caché tant que l'utilisateur ne l'appelle pas ?

### Bloc B — Accueil contextuel

1. Quels widgets doivent apparaître au boot pour toi, en godmode ?
2. Quels widgets doivent apparaître au boot pour un prof ?
3. Quels widgets doivent apparaître au boot pour un étudiant ?
4. Le chat doit-il être central, compact ou secondaire ?
5. Le persona doit-il être visible sous forme d'avatar, de carte, de bulle ou de simple signature ?

### Bloc C — Notifications et alertes

1. Qu'est-ce qui mérite une notification ?
2. Qu'est-ce qui mérite une alerte bloquante ?
3. Qu'est-ce qui doit aller en inbox plutôt qu'en notification ?
4. Comment éviter que l'interface crie tout le temps ?

### Bloc D — Widgets / panneaux

1. Qu'est-ce qui doit être une carte ?
2. Qu'est-ce qui doit être un panneau complet ?
3. Qu'est-ce qui doit être une dataviz ?
4. Qu'est-ce qui doit être une timeline ?
5. Qu'est-ce qui doit être une checklist ?

### Bloc E — Graphisme / assets

1. Quels éléments doivent être visuels ou illustrés ?
2. Quels personas ont besoin d'un avatar canon ?
3. Quels boutons/icônes sont indispensables ?
4. Quels états doivent être immédiatement visibles par couleur/forme ?
5. Quel niveau RPG/jeu vidéo veux-tu vraiment dans l'interface ?

### Bloc F — Mobile / desktop / web

1. Que dois-tu pouvoir faire sur mobile ?
2. Que dois-tu pouvoir faire sur desktop ?
3. Quels raccourcis clavier ou gestes rapides veux-tu ?
4. Qu'est-ce qui doit rester confortable en classe ?

## Décisions ouvertes

- Direction graphique : bureau magique / salle de contrôle RPG assumée pour MALEX, marque blanche sobre possible.
- Organisation de l'accueil : point de reprise léger, contexte actif, actions principales, action logique suivante par section, raccourcis modes.
- Widgets prioritaires : prochaine action logique, classes/cours/sujets/corrections, projet actif, feedbacks, ressources, personas liés.
- Assets prioritaires : avatar canon, assiettes/assets de persona, états visuels, icônes de modes, thèmes utilisateur.
- Règles de notification : signal discret + inbox, alertes bloquantes seulement pour risque réel.
- Place des personas : compagnon visible à gauche, invités/consultés à droite, bulles différenciées.
- Première tranche de reconstruction : Home + page complète adaptative V1 + widgets épinglables/masquables simples + liaison DA MasterFlow.
- Mobile/desktop : mobile voice-first, desktop full power.
- Classe : mode projection prof avec subpersona évolutif.
- Raccourcis : palette de commande et logique app à spécifier.

## Prochaine étape

Transformer ce CDC en plan de surfaces V1 : Home, layout mode, page complète adaptative, persona
rail, inbox/notifications, projection classe et parcours asset/persona.
