# MASTERBUILD — renforts externes OpenCode / Big Pickle V1

Statut : `canon_operable_masterbuild`
Derniere mise a jour : 2026-07-04

## Decision

MASTERBUILD peut utiliser OpenCode et Big Pickle comme renforts, mais uniquement en lane
controlee. Le but est de gagner du temps sur les taches longues, mecaniques ou repetitives, sans
creer une deuxieme autorite produit.

## Sources verifiees

- OpenCode Agents : `https://opencode.ai/docs/agents/`
- OpenCode Server : `https://opencode.ai/docs/server/`
- Canal local existant : `.opencode/INBOX.md`
- Verdict historique : `docs/audits/CODEX_BP_AUDIT_ABSORPTION_VERDICT_2026-06-29.md`
- Resume runtime : `docs/runtime-queue/MASTERFLOW_GLOBAL_ABSORPTION_RESUME_PLAN_2026-06-29.md`

## Ce qu'OpenCode apporte

OpenCode expose deux briques utiles pour MASTERBUILD :

- des agents specialises, dont des agents primaires et des subagents ;
- un serveur HTTP local pilotable via `opencode serve`.

La bonne utilisation pour MasterFlow n'est pas "un agent libre de plus". C'est une lane de
delegation bornee, avec permissions, cout, sortie attendue et verification.

## Role de Big Pickle

Big Pickle est le sparring partner mecanique.

Il peut aider pour :

- lire beaucoup de fichiers et extraire une matrice ;
- comparer docs et code ;
- chercher des doublons, incoherences ou traces legacy ;
- preparer un inventaire ;
- produire un rapport `done_unverified` facile a relire ;
- tester une hypothese documentaire sans toucher au canon.

Il ne doit pas aider pour :

- arbitrer le produit ;
- modifier le canon ;
- valider une decision UI/DA ;
- creer une branche, commit, push, PR ou merge ;
- lancer provider, migration, seed, donnees reelles ou deploiement ;
- transformer une archive, une factory ou un retour utilisateur en verite produit.

## Orchestration recommandee

```text
MALEX demande
  ↓
MASTERBUILD cadre le Round
  ↓
Codex prepare une tache Big Pickle
  ↓
.opencode/INBOX.md passe a ready_for_big_pickle
  ↓
Big Pickle execute une tache mecanique
  ↓
Big Pickle ecrit done_unverified
  ↓
Codex relit, corrige, classe
  ↓
MALEX tranche si produit / UI / canon
```

## Contrat de delegation

Chaque tache Big Pickle doit contenir :

| Champ | Regle |
|---|---|
| `id` | court et unique |
| `status` | `ready_for_big_pickle` uniquement quand MALEX/Codex ont vraiment borne la tache |
| `objective` | une sortie observable, pas une intention vague |
| `allowed_reads` | liste courte, pas tout le repo par defaut |
| `allowed_writes` | vide sauf GO explicite |
| `required_output` | format attendu : matrice, liste, diff explique, rapport |
| `checks` | controles que Codex peut refaire vite |
| `stop_rules` | quand s'arreter au lieu d'improviser |
| `patch_allowed` | `false` par defaut |
| `git_allowed` | toujours `false` en V1 |

## Permissions OpenCode conseillees

Pour MASTERBUILD, OpenCode doit demarrer en lecture seule :

- agent `plan` ou subagent read-only pour audit ;
- permissions `edit: deny`, `bash: ask` ou deny sauf commandes de lecture ;
- `steps` bas pour limiter le cout ;
- `task` restreint si un orchestrateur OpenCode est configure.

Le mode `build` d'OpenCode n'est acceptable que pour une vague technique deja bornee, hors UI/DA/canon,
avec validation MALEX et revue Codex ensuite.

## Quand l'utiliser

| Cas | Utiliser Big Pickle ? | Pourquoi |
|---|---:|---|
| audit massif de legacy | oui | long a lire, facile a verifier par echantillons |
| extraction de patterns Factory | oui | mecanique et utile pour backflow candidat |
| comparaison docs/code | oui | bon gain de temps |
| retouche UI subjective | non | MALEX verifie plus vite humainement |
| assets / DA / canon perso | non | decision visuelle et canonique |
| backend sensible | seulement audit | jamais execution libre |
| commit/push/PR | non | MASTERBUILD prepare, Codex execute apres GO |

## Cout et contexte

MASTERBUILD doit afficher avant delegation :

- pourquoi deleguer ;
- ce que Big Pickle va lire ;
- ce qu'il n'a pas le droit de faire ;
- cout probable : leger / moyen / lourd ;
- sortie attendue ;
- verification Codex ;
- verification MALEX si necessaire.

## Sortie attendue

Big Pickle ne livre jamais une decision finale. Il livre :

- `summary` ;
- `files_read` ;
- `files_changed` si autorise ;
- `checks_run` ;
- `evidence` ;
- `doubts` ;
- `blocker`.

Le statut `done_unverified` veut dire : "matiere recue, pas encore absorbee".

## Phrase MASTERBUILD

> Big Pickle part en Training, pas en ranked. Il farm l'info, Codex verifie le replay,
> MALEX garde le bouton Start.
