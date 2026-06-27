# MasterFlow — Pont atelier Factories → Git

Date : 2026-06-28  
Statut : correction de frontière  
Autorité : repo Git opérable pour MasterFlow, dossier Bureau pour les Factories  

## Décision

Les Factories ne sont pas un sous-module documentaire de MasterFlow.

Leur lieu de travail actif est :

```txt
/Users/malex/Desktop/FACTORIES/
```

Le repo Git MasterFlow ne doit pas contenir les audits détaillés de chaque Factory, leurs CDC de bot, leurs versions actives ou leurs dossiers de patch.

Git ne reçoit que ce qui devient utile au logiciel MasterFlow :

- une primitive transversale ;
- un contrat produit ;
- un type shared ;
- un guardrail runtime ;
- une tâche de queue ;
- un backflow candidat via D11 ;
- un blocage ou rejet utile au pilotage.

## Règle simple

```txt
Factory = atelier autonome sur le Bureau
Primitive intéressante = candidate vers Git
Runtime MasterFlow = seulement après contrat + test + validation
```

## Ce qui reste côté Bureau

À garder dans `/Users/malex/Desktop/FACTORIES/` :

- versions actives `CURRENT` ;
- archives `ARCHIVE` ;
- CDC spécifiques aux bots ;
- prompts complets ;
- audits détaillés par Factory ;
- reçus de patch de Factory active ;
- ZIP actifs ;
- tests de boot plateforme ;
- consignes Big Pickle / OpenCode propres aux Factories.

## Ce qui peut aller dans Git

À garder dans ce repo :

- `docs/factories/FACTORY_REQUEST_ROUTING_PROTOCOL_2026-06-27.md` : décider si une demande est Factory, extraction, primitive ou runtime ;
- `docs/factories/FACTORY_PRIMITIVE_ROUTER_2026-06-27.md` : router une primitive déjà identifiée vers un domaine MasterFlow ;
- specs D08, D05, D06, D11, UI ou MasterHelp créées à partir d'une primitive validée ;
- lignes de queue liées à un domaine MasterFlow réel.

## Pipeline corrigé

```txt
1. Travail Factory dans /Desktop/FACTORIES
2. Extraction ou retour d'usage produit par la Factory
3. Tri : local-only / primitive candidate / runtime gap / blocked / rejected
4. Si intéressant pour MasterFlow : fiche primitive courte dans Git
5. Si validé : contrat + test + implémentation Git
```

## Ce qui ne doit plus arriver

- publier dans Git un audit exhaustif des 19 Factories actives ;
- transformer une Factory en vérité produit MasterFlow ;
- copier un CDC de bot dans Git comme si c'était une spec runtime ;
- laisser croire qu'un patch de Factory active est un déploiement MasterFlow ;
- maintenir deux cockpits : un cockpit Factories et un cockpit MasterFlow mélangés.

## Double bénéfice attendu

On garde les Factories rapides, libres et efficaces dans leur dossier.

En parallèle, on extrait leur meilleur :

- source truth ;
- boot contexte ;
- garde-fous ;
- extraction inbox ;
- dataviz ;
- OCR/image gates ;
- pédagogie ;
- modes candidats ;
- signaux d'usage.

Puis on l'intègre dans MasterFlow seulement quand ça vaut vraiment le coût.

## Conséquence sur les docs du 2026-06-27

Les documents d'audit détaillé Factories créés dans Git le 2026-06-27 sont retirés de la couche active.

La vérité corrigée est :

- les audits détaillés Factories doivent vivre côté Bureau ;
- Git garde le pont, le routeur de primitives et les specs MasterFlow issues de ces primitives ;
- D08-GATE-001 reste valide car il s'agit d'un vrai guardrail runtime MasterFlow détecté grâce au travail Factories.
