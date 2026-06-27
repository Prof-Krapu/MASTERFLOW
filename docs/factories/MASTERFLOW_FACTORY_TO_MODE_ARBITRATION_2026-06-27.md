# MasterFlow — Arbitrage Factory → Mode candidat

Date : 2026-06-27  
Statut : candidat documentaire  
Objet : décider ce qui reste Factory autonome, ce qui devient mode MasterFlow candidat, et ce qui mérite Git runtime.

## Principe

Une Factory n'est pas seulement un bot autonome. C'est un laboratoire d'usage.

```txt
Factory autonome
-> usage réel rapide
-> extraction structurée
-> primitive récupérable
-> mode MasterFlow candidat
-> runtime Git si le besoin devient robuste, récurrent ou sensible
```

## Critères d'entrée

| Critère | Factory only | Mode candidat | Runtime Git |
|---|---|---|---|
| Utilisateurs | 1 personne / test | répétable | multi-utilisateur ou stratégique |
| Données | faibles | structurées | persistantes, sensibles ou partagées |
| Permissions | simples | scope utile | rôles, owner, validation |
| UI | conversation suffisante | widgets utiles | app/workspace nécessaire |
| Source truth | manuel | traçable | vérifié, versionné |
| Export | doc ponctuel | format structuré | pipeline stable |
| Risque | faible | moyen | sécurité, argent, données, terrain |
| Valeur | locale | primitive transversale | brique MasterFlow durable |

## Matrice initiale

| Factory | Usage observé | Primitive récupérable | Mode MasterFlow candidat | Git runtime maintenant ? | Condition d'entrée Git | Risque |
|---|---|---|---|---|---|---|
| Roadtrip Moto | préparer et accompagner un voyage réel | source truth critique, variantes, checkpoints, dataviz, inventory de situation, GPX integrity | MasterHelp / Situation Companion / Field Companion | pas comme app complète ; oui comme primitives | usage répété + besoin UI/export + validation sécurité | élevé si infos terrain inventées |
| Prof Krapu | visuels pédagogiques, dataviz science, DA, supports | visual pedagogy, anti-hallucination données, DA source truth, sortie pédagogique | Visual Pedagogy / Teaching Assets | non immédiat | contrat source + droits + D08/D05/D06 | moyen à élevé |
| Batrasia | récit, lore, reader graph, DA narrative | reader graph, timeline, reveal gates, visual map narrative | Story / MasterStory | partiel déjà D09 ; pas tout | besoin auteur récurrent + anti-spoiler | moyen |
| ISCOM JPO Guide | orientation JPO et refus hors périmètre | source lock, refusal scope, guide conversationnel | Event Guide / School Ops | non immédiat | plusieurs JPO + sources validées | moyen |
| Parcours Talents Créatifs | extraction brief, routing étudiants/niveaux | brief → JSON sujet, routing niveaux, multi-brief étudiant | Teaching / Subject Routing | probablement oui par D05/D06 | schéma sujet stable + roster/projets | moyen |
| Transcription | transformer conversation/transcription en besoin produit | extraction inbox, résumé, questions, CDC | Factory Builder / Intake | oui comme primitive D11/D03 plus tard | CDC commun validé | faible |

## Décisions recommandées

1. Roadtrip ne doit pas entrer comme "app GPS" complète.
2. Roadtrip doit nourrir `MasterHelp / Situation Companion`.
3. Prof Krapu doit nourrir `Visual Pedagogy` et les verrous Dataviz/science.
4. Batrasia doit rester pilote `Story graph` et anti-spoiler.
5. Les Factories doivent toutes exposer un passeport, un backflow et une extraction Dataviz si elles produisent des vues.

## Queue

### À faire maintenant

- Auditer les Factories actives avec cette matrice.
- Ajouter `Factory → Mode candidat` au CDC commun.
- Renforcer Roadtrip comme pilote MasterHelp/Dataviz.

### À mettre en queue

- Créer un registre `factory_capability_registry`.
- Créer un registre `mode_candidate_registry`.
- Préparer une UI D11 qui montre Factory → primitives → mode candidat.

### À faire quand tokens disponibles

- Passer chaque Factory active dans la matrice.
- Identifier les doublons entre Factories.
- Créer templates d'extraction par mode candidat.

### À décider plus tard

- Quels modes candidats deviennent visibles dans l'UI MasterFlow.
- À partir de quel seuil une Factory devient Git runtime.

