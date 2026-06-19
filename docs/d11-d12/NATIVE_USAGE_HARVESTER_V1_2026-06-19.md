# D11-D12 — Native Usage Harvester V1 — 2026-06-19

Status: `IMPLEMENTED_LOCAL_VERIFIED_BOUNDED_NATIVE_SLICE`

## Intention produit

Apprendre des frictions réelles de MasterFlow sans demander à l'utilisateur de lancer une
extraction, tout en maintenant chaque apprentissage en état candidat jusqu'à revue humaine.

Sources canon :

- `02_KERNEL/MASTERFLOW_KERNEL_MANIFEST.md` — Usage Learning And GodMode Routing ;
- `03_DOMAINS/MASTERFLOW_DOMAIN_MAP.md` — propriétaires fonctionnels par domaine ;
- `03_DOMAINS/D11_FACTORIES_BACKFLOW/DOMAIN_CARD.md` ;
- `03_DOMAINS/D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT/DOMAIN_CARD.md` ;
- `05_UI_RUNTIME_CONTRACTS/D11_USAGE_HARVESTER_BACKFLOW_CONTRACT.md` ;
- `05_UI_RUNTIME_CONTRACTS/SHARED_VALIDATION_INBOX_MVP_CONTRACT.md`.

## Flux V1 réellement implémenté

```txt
workflow event nettoyé
-> détection bornée d'un échec, blocage ou rejet
-> candidate privée usage_learning_candidate
-> qualification observation / hypothesis
-> déduplication par owner + scope + signal + process + output + domaines
-> routage vers propriétaires fonctionnels canoniques
-> Shared Validation Inbox admin/godmode
-> approve / park / reject / archive
```

Une approbation confirme une règle candidate dans le runtime. Elle ne modifie ni processus
validé, ni fichier Drive, ni canon.

## Garde-fous

- aucun contenu de conversation, message ou payload métier collecté ;
- événements neutres ignorés ;
- `privacy = do_not_export` par défaut ;
- un seul candidat partagé en cas de routage ambigu ;
- plusieurs propriétaires fonctionnels peuvent relire le même candidat ;
- aucune action, job, provider, patch, publication, déploiement ou écriture canon ;
- aucune ingestion automatique d'une factory portable externe.

## Propriétaires fonctionnels

Le routeur réutilise les owners du `MASTERFLOW_DOMAIN_MAP` : par exemple
`PEDAGOGY_ENGINE`, `CORRECTOR_RUNTIME`, `MASTERLAB`, `BACKFLOW_INTAKE`,
`AUTONOMY_STEP1` ou `OBSERVABILITY`.

Le rôle applicatif `godmode` protège la surface de revue. Il n'est pas confondu avec la
destination fonctionnelle du candidat.

## Recette

- Usage Harvester + fondations D12 ciblées : 43/43 ;
- backend complet : 347/347 ;
- TypeScript backend : OK ;
- aucune modification frontend nécessaire : la Shared Validation Inbox consomme déjà les items
  `autonomy_proposal`.

## Hors scope V1

- analyse automatique du texte des conversations ;
- détection automatique des préférences stables ou nouveaux workflows hors événements sourcés ;
- conversion automatique d'une finding D12 en apprentissage ;
- import runtime du kit Claude Project ;
- modification automatique d'un profil, processus ou canon ;
- sortie externe.

## Prochaine extension sûre

Ajouter des sources internes déjà structurées une par une : `teacher_decision_delta`, finding D12
validée, puis backflow portable explicitement importé. Chaque source doit avoir son contrat de
confidentialité, sa clé de déduplication et sa recette avant branchement.
