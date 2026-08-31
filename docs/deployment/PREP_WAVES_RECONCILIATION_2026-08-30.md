# Réconciliation des waves GPT/OpenCode - 2026-08-30

## But

Décider ce qui entre réellement dans la préparation full-stack sans transformer une sortie d'audit,
une branche sale ou un index statique en nouvelle source de vérité.

## Verdicts

| Artefact | Verdict | Usage retenu |
|---|---|---|
| Handoff maître et Waves 02-04 | archivé comme preuve | Source du plan global, sans autorité d'exécution autonome. |
| Plan full-stack consolidé | retenu | Feuille de route unique du chantier serveur. |
| Audit de consolidation backend | retenu comme preuve partielle | Cartographie utile ; constats serveur et chemins revalidés séparément. |
| Registre IA de Big Pickle | historique, non importé | Il pointe encore vers l'ancien serveur Vincent et contient des chemins datés. |
| `MASTERFLOW_FAST_INDEX/*.tsv` | différé | Photographie utile à l'audit, mais aucun générateur reproductible n'accompagne l'index. |
| Préparation Link Engine | candidat lot 5 | Contrat déterministe utile ; l'implémentation peut commencer lexicalement sans figer l'architecture. |
| Préparation sécurité provider IA | candidat lot 5 | À reprendre avant toute clé ou dépense réelle. |
| API Manage | différé du premier déploiement | Non supprimé, non déprécié, non rejeté. |
| Capacités Corrector et export runner | différé du premier déploiement | Corrector n'est pas migré comme produit ; le socle correction reste actif et seuls les écarts fonctionnels prouvés sont absorbés. |
| Moteur de concours complet | différé | Le pilote Ours d'Or commence par projet, jalons, dépôt et accompagnement. |
| MasterPlan absorption | différé | Le planning reste une verticale future du backend commun. |
| Talents Créatifs | différé | Future verticale du backend commun, sans runtime autonome dans cette vague. |
| Asset Engine / Hatch Pet workshop | différé | Aucun asset ou pipeline lourd dans le chemin critique serveur. |

## Règle Fast Index

Le Fast Index ne pourra entrer dans Git comme artefact opérable que lorsqu'une commande déterministe :

1. le régénère depuis des sources Git explicites ;
2. exclut secrets, fichiers privés, builds et dépendances ;
3. inscrit le SHA source et le schéma de sortie ;
4. produit le même résultat à entrée identique ;
5. dispose d'un test de fraîcheur.

Jusqu'à cette tranche, les TSV restent dans la branche de préparation précédente et ne sont pas
recopiés dans le worktree serveur.

## État des branches

- branche source historique : `vincent/masterplan`, conservée intacte avec ses changements locaux ;
- branche de préparation : `codex/masterflow-fullstack-preview` ;
- base au démarrage : `origin/main` `2ea7167` ;
- aucun commit, push, PR, merge ou déploiement réalisé.

## Suite

Le lot 1 est clos. Le lot 2 peut stabiliser la release preview locale, puis s'arrêter au gate
d'installation serveur.
