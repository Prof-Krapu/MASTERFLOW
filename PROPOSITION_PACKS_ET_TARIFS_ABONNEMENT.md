# Proposition packs et tarifs d'abonnement MasterFlow

Version : 2026-06-12  
Statut : `PROPOSAL / NON_CANONICAL / BLOCKED_BY_HUMAN_VALIDATION`  
Owner de décision : MALEX

## Objet

Première hypothèse commerciale pour les packs déjà décrits dans le canon Drive :

```txt
Student
Student Pro / Portfolio
Teacher
Studio / Creator
School / Campus
White Label
Godmode / Owner Ops
```

Cette grille sert à tester le positionnement et l'économie du produit. Elle n'active aucun
billing, aucune feature et aucune permission.

## Proposition tarifaire

Prix particuliers : TTC. Prix organisations : HT, hors accompagnement spécifique.

| Pack | Mensuel | Annuel | Cible |
|---|---:|---:|---|
| Student | 0 EUR | 0 EUR | découverte et usage pédagogique léger |
| Student Pro / Portfolio | 8,90 EUR TTC | 89 EUR TTC | étudiant autonome, portfolio et exports |
| Teacher | 24,90 EUR TTC | 249 EUR TTC | enseignant individuel |
| Studio / Creator | 49 EUR TTC | 490 EUR TTC | création avancée, DA et production |
| School / Campus S | 199 EUR HT | 1 990 EUR HT | 10 enseignants, 250 étudiants |
| School / Campus M | 399 EUR HT | 3 990 EUR HT | 30 enseignants, 1 000 étudiants |
| School / Campus L | sur devis | sur devis | volume supérieur, intégrations et support |
| White Label | 990 à 2 500 EUR HT | sur devis | instance personnalisée et intégrations |
| Godmode / Owner Ops | non commercialisé | non commercialisé | propriétaires techniques uniquement |

White Label prévoit des frais d'installation indicatifs de `3 000 à 10 000 EUR HT`, selon
migration, identité, intégrations et accompagnement.

## Contenu proposé

### Student

- onboarding et persona pédagogique basique ;
- projets et ressources publics limités ;
- mémoire de session et widgets essentiels ;
- quota IA léger ;
- aucun accès architecture, administration ou ressources privées.

### Student Pro / Portfolio

- projets personnels plus nombreux ;
- portfolio et canon personnel ;
- mémoire projet, imports et exports personnels ;
- accompagnement et analyses plus poussés ;
- quotas IA supérieurs ;
- aucune permission enseignant ou administration.

### Teacher

- ressources privées ;
- préparation pédagogique ;
- correction assistée avec validation humaine ;
- programmes, sujets et workflows lorsqu'ils existent réellement ;
- exports pédagogiques et suivi d'usage personnel ;
- possibilité future de connecter une clé IA propre.

### Studio / Creator

- MasterLab et workflows créatifs activés selon maturité ;
- DA, manifests, assets candidats et exports avancés ;
- mémoire projet/canon ;
- quotas de génération supérieurs ;
- coûts lourds et files visibles ;
- aucune propriété du noyau MasterFlow.

### School / Campus

- comptes enseignants et étudiants inclus selon palier ;
- espaces, ressources et workflows mutualisés ;
- administration locale et permissions d'organisation ;
- analytics agrégés par défaut ;
- budgets et quotas centralisés ;
- données privées par défaut ;
- Owner Ops exclu.

### White Label

- identité et configuration tenant ;
- domaine, onboarding et surfaces personnalisables ;
- intégrations convenues contractuellement ;
- support et accompagnement ;
- aucune exposition du noyau propriétaire ou d'Owner Ops.

### Godmode / Owner Ops

- diagnostic privé, gouvernance, architecture et debug ;
- modification des contrats, permissions et coûts sous validation ;
- réservé à MALEX et aux propriétaires techniques autorisés ;
- jamais vendu comme niveau premium client.

## Modèle de consommation IA

Ne pas promettre d'illimité réel.

- budget mensuel de crédits inclus par pack ;
- modèles économiques pour les tâches ordinaires ;
- OCR massif, raisonnement lourd, images et rendu décomptés séparément ;
- coût, file et validation visibles avant une action lourde ;
- recharges optionnelles ou clé fournisseur propre pour les packs autorisés ;
- arrêt ou dégradation contrôlée au quota ;
- aucun dépassement facturé silencieusement.

Hypothèse de plafonds de coût interne :

| Pack | Budget IA mensuel cible |
|---|---:|
| Student | 1 à 2 EUR |
| Student Pro | 3 à 5 EUR |
| Teacher | 7 à 10 EUR |
| Studio / Creator | 15 à 20 EUR |
| School / Campus | enveloppe mutualisée selon contrat |

Ces montants servent au calcul de marge. Ils ne sont pas nécessairement affichés comme crédits.

## Invariants

```txt
PACK != ROLE
ABONNEMENT != PERMISSION ABSOLUE
QUOTA != VALIDATION
WHITE LABEL != OWNERSHIP
GODMODE != PRODUIT COMMERCIAL
```

- le pack ouvre une capacité commerciale et des limites ;
- le rôle donne les droits ;
- la maturité module l'autonomie ;
- permissions et contexte peuvent encore refuser une action ;
- toute action sensible conserve permission check, preflight et validation humaine ;
- une feature absente du backend ne peut pas être vendue comme disponible ;
- les tarifs restent modifiables avant canonisation.

## Points à challenger par Vincent

1. Coût réel par tâche depuis `token_events` et les providers.
2. Marge minimale soutenable par pack.
3. Quotas anti-abus et politique de recharge.
4. Coût d'exploitation School/Campus et White Label.
5. Séparation billing, pack, rôle, permission et feature flag.
6. Promesses impossibles tant que le backend ne les expose pas.
7. Faisabilité future, sans implémentation avant validation.

