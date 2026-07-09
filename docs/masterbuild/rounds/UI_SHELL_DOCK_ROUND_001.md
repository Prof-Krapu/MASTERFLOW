# UI-SHELL-DOCK-001 — Shell, navigation et Command Dock

Date : 2026-07-09  
Statut : cadrage ouvert  
Owner produit : MALEX  
Revue runtime : Vincent  

## Intention

Transformer la coque prototype en première couche intégrable sans perdre la philosophie UI :
navigation légère, actions contextualisées, clavier/micro cohérents, permissions visibles sans
catalogue technique.

## Périmètre autorisé par ce GO

- cadrage ;
- audit ciblé du prototype, du Lab et des endpoints existants ;
- Design Preflight ;
- préparation des work packages ;
- modifications bornées dans le Lab/prototype si le contrat reste respecté ;
- tests ciblés ;
- commit, push et draft PR si le Round atteint une tranche cohérente.

## Hors périmètre sans nouveau GO

- merge dans `main` ;
- déploiement ;
- migration ;
- provider voix/image ;
- suppression d'assets ou de panels ;
- changement de canon produit ;
- refonte Home, personas ou skilltree.

## Surfaces concernées

- Shell / navigation gauche ;
- system bar ;
- Command Dock clavier, micro, actions ;
- raccourcis globaux ;
- états mobile conversationnels ;
- lecture future du loadout et des actions disponibles.

## Données backend attendues

- `GET /context/current` ;
- actions disponibles ;
- runtime loadout ;
- permissions / rôle ;
- jobs et validation inbox en lecture plus tardive.

## Décisions verrouillées

- afficher la situation, pas le catalogue ;
- pas de liste fixe universelle de modes ;
- cinq actions visibles maximum par défaut ;
- raccourcis optionnels, jamais exclusifs ;
- action sensible jamais exécutée depuis une simple suggestion ;
- entrée et sortie animées ;
- mobile conversationnel, desktop cockpit complet ;
- review MALEX pour expérience et DA ;
- review Vincent pour contrats, permissions et runtime.

## Work packages

| ID | Sujet | Owner | Statut | Preuve attendue |
|---|---|---|---|---|
| USD-001 | Audit Lab / prototype / runtime existant | Codex | pending | matrice composants et endpoints |
| USD-002 | Contrat Shell + navigation | Codex + MALEX | pending | Design Preflight validé |
| USD-003 | Contrat Command Dock | Codex + MALEX | pending | règles actions et raccourcis |
| USD-004 | Mapping backend lecture seule | Codex + Vincent | pending | endpoints et états vides/verrouillés |
| USD-005 | Implémentation bornée | Codex | pending | build + smoke ciblé |
| USD-006 | Publication draft PR | Codex | pending | commit, push, draft PR |

## Critères de succès

- une autre IA sait quoi brancher sans redessiner l'UI ;
- Vincent voit les contraintes UI avant de modifier un composant ;
- MALEX voit ce qui reste prototype, lab, connecté ou runtime ;
- aucun bouton ne ment sur une capacité disponible ;
- le Shell/Dock peut être promu avant Home.

## Prochaine action

Faire l'audit ciblé Lab / prototype / runtime existant, puis transformer l'écart en tâches bornées.
