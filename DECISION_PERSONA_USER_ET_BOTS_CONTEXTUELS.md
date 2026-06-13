# DECISION — Persona utilisateur et bots contextuels

Statut : `DECISION MALEX / 2026-06-13`

## Sources canon

Cette decision formalise pour le backend Git une logique deja presente dans le canon MasterFlow :

- `02_CONTRACTS/PERSONAL_PERSONA_ASSIGNMENT_AND_CHATBOT_CONTRACT.md` ;
- `02_CONTRACTS/CONDITIONAL_SUB_PERSONA_RUNTIME_AND_CLASS_INSTANCE_CONTRACT.md` ;
- `02_CONTRACTS/CONVERSATION_SURFACE_AND_SPEAKER_ROUTING_CONTRACT.md` ;
- `02_CONTRACTS/APP_CAPABILITY_GUIDANCE_AND_USER_INTERROGATION_CONTRACT.md` ;
- `05_PERSONAS/PERSONA_RUNTIME_SYSTEM.md` ;
- `05_PERSONAS/INCUBATOR_RUNTIME_AND_GAMIFIED_ORCHESTRATION_SYSTEM.md` ;
- `01_CORE/PEDAGOGICAL_RUNTIME_SYSTEM.md`.

Elle ne cree pas un nouveau concept. Elle rappelle l'intention canon : persona personnel, personas
assignes, sous-personas conditionnels, routing conversationnel et gates permissionnelles.

## Decision

MasterFlow distingue trois couches conversationnelles :

1. **Persona utilisateur par defaut** : compagnon personnel attache a l'utilisateur.
2. **Persona contextuel assigne** : voix d'un prof, sujet, methode, jury, expert ou classe.
3. **Bot/guide contextuel** : intervenant assigne a une activite, classe, projet, event ou tunnel.

MOTH n'est pas le persona par defaut de tous les utilisateurs. MOTH est un guide contextuel
assignable a un atelier, par exemple une classe ou une activite CDC, avec une utilite de check /
friction / cadrage du CDC. Incubator peut jouer le meme role pour Ours d'Or.

La metaphore produit est proche d'un RPG : l'utilisateur garde son interlocuteur principal, puis
une activite peut ajouter une petite "party" de personas contextuels selon permissions.

## Regle produit

Chaque utilisateur doit pouvoir avoir son persona dedie pour l'accompagner dans MasterFlow :

- preferences ;
- niveau ;
- style d'accompagnement ;
- historique autorise ;
- aide transverse ;
- continuites personnelles.

Les bots contextuels ont une mission bornee :

- MOTH pour CDC / cadrage ;
- Incubator pour Ours d'Or / incubation / qualification ;
- bot event pour inscription ou qualification ;
- bot devis pour demande client ;
- bot correction pour grille ;
- bot cours pour exercice ou sequence.

Les personas contextuels peuvent representer :

- le prof qui assigne un sujet ;
- une methode pedagogique ;
- un jury ;
- un expert metier ;
- un contradicteur bienveillant ;
- une grille ou un graphe pedagogique.

## Invariant permission

Ni le persona personnel, ni le bot contextuel, ni le lore ne donnent de droits.

Les droits viennent uniquement de :

```text
permission_runtime
membership
ownership
scope
action risk
validation gates
```

## Interaction attendue

Dans une classe ou activite :

```text
user
-> personal_persona_runtime
-> activite assignee
-> contextual_bot_guide
-> permission_runtime
-> guided/session/action engines
```

Le persona personnel peut aider l'utilisateur a comprendre et progresser. Le bot contextuel mene
l'exercice selon le guide, les templates, les scopes et les gates.

## Conversation multi-personas

Une activite peut autoriser plusieurs personas en meme temps, mais en petit nombre :

```text
personal persona principal
+ 1 a 3 personas contextuels maximum
+ guide/bot d'activite si assigne
```

Objectif :

- croiser plusieurs methodes pedagogiques ;
- confronter un CDC a plusieurs grilles ;
- faire intervenir la voix du prof sans remplacer le persona personnel ;
- combiner ressources, graphs pedagogiques et contraintes du sujet ;
- rendre visibles les divergences entre methodes au lieu de les fusionner silencieusement.

Un orchestrateur de conversation doit indiquer quelle voix parle, pourquoi elle intervient et
sur quelle source/regle elle s'appuie. Les personas ne doivent pas tous repondre a chaque tour :
la conversation choisit les voix utiles selon contexte, permissions, charge cognitive et objectif.

Par defaut, limiter a 2 ou 3 personas contextuels actifs. Au-dela, passer par une synthese ou une
vue diagnostic reservee.

## Impact backend

Prevoir dans les contrats :

- `personal_persona_id` ou equivalent cote profil utilisateur ;
- `contextual_persona_assignments` cote activite/classe/sujet/session ;
- `contextual_bot_id` / `guide_id` cote activite/session ;
- `conversation_roster` ou equivalent pour lister les voix actives ;
- `conversation_moderator` / orchestrateur pour choisir les tours de parole ;
- separation entre persona fonctionnelle et persona lore ;
- assignations scopees par classe/projet/session ;
- aucune elevation de droit par assignation de persona.

## Impact UI

L'UI doit eviter la confusion :

- persona personnel = accompagnement general ;
- persona prof/sujet/methode = voix contextuelle explicite ;
- bot contextuel = activite precise ;
- MOTH visible seulement dans les contexts ou il est assigne ;
- plusieurs personas actifs = conversation encadree, pas chat brouillon ;
- action disponible seulement si le runtime la permet.

## Impact pedagogique

Cette separation permet :

- accompagnement personnalise continu ;
- interventions pedagogiques specialisees ;
- activites plus incarnées sans imposer un personnage unique partout ;
- confrontation constructive entre methodes, prof, jury, expert et guide ;
- meilleure lisibilite pour les etudiants ;
- reutilisation des bots dans cours, event, devis, correction et ateliers.
