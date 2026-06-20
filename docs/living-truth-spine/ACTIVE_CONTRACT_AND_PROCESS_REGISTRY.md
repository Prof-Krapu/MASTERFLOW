# Active Contract & Process Registry

Statut : `CANON_CANDIDATE_FROM_LEGACY_RECONCILIATION_WAVE_7`

## But

Donner une vue exploitable de la chaîne : intention + objet + rôle + scope
-> domaine/processus -> owner -> contrats -> état runtime -> action autorisée.

Ce registre est un index de pilotage. Il n'est jamais la source qui invente le
canon ni une permission d'activer un moteur absent.

## Statuts autorisés

| Statut | Signification |
|---|---|
| `canon` | règle produit validée dans le Drive |
| `implemented` | contrat, code et tests disponibles dans Git |
| `partial` | fondation réelle, périmètre incomplet |
| `future` | produit cadré, runtime non livré |
| `candidate` | proposition à review, sans effet canon/runtimes |
| `legacy_reference` | preuve historique en lecture seule |
| `deprecated` | conservé pour audit/migration, non activable |

## Première projection active

| Processus | Owner fonctionnel | Canon | Git runtime | Action autorisée maintenant |
|---|---|---|---|---|
| Permission & validation | D01 / Permission Engine | `canon` | `implemented` | actions selon registre et gates |
| Context & Source Truth | D02 | `canon` | `implemented/partial` | Context Pack cité, RAG lexical |
| Correction | D05/D06 | `canon` | `implemented/partial` | contexte/identité/roster ; barème et lot encore incomplets |
| Roster & identité | D05/D06 | `canon` | `implemented` | gestion manuelle professeur, matching toujours humain |
| DA manifest & références | D08 | `canon_candidate` | `future` | cadrage/manifest read model, pas de provider |
| Mémoire/version | D02 transverse | `canon_candidate` | `partial` | cards/checkpoints existants, ledger à livrer |
| Continuité/runtime | D12 | `canon_candidate` | `partial` | observer/receipts, pas de redéploiement automatique |
| Factories/backflow | D11 | `canon` | `implemented_bounded` | intake/routage manuel candidats uniquement |
| Public/event/devis | D10 | `future` | `future` | aucun flux public non cadré |
| MasterStory | D09 | `partial` | `future` | extraction/audit canon, pas de runtime narratif annoncé |

## Règles de routage

- Un processus `future` n'affiche jamais une action comme disponible.
- Un processus `candidate` peut créer une tâche de review, jamais modifier le
  canon, une permission ou un runtime.
- Un owner est responsable d'une décision fonctionnelle, pas automatiquement
  owner des données hors scope.
- Toute lecture UI doit afficher `canon`, `runtime` et `preuve de déploiement`
  comme trois états distincts.
- Le registre d'actions Git reste l'autorité des actions exécutables ; cette
  projection ne peut qu'expliquer leur rattachement produit.

## Livraison Git prévue

1. Conserver le document comme projection source de la matrice Canon → Git.
2. Ajouter un read model généré uniquement après une source de données
   versionnée et des tests de cohérence.
3. Ne jamais charger ce registre pour contourner `action_registry`, permissions,
   validation inbox ou preflight.

## Critère de succès

Un owner peut répondre, sans lecture technique exhaustive : « ce processus est-il
canonique, réellement utilisable, partiel, ou seulement prévu — et qui décide de
la suite ? »
