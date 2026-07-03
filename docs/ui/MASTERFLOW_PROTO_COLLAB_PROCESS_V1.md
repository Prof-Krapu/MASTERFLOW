# MasterFlow Proto Collaboration Process V1

Statut : process prototype local.

Ce document cadre le travail simultané MALEX + Vincent sur le prototype MasterFlow sans confondre prototype, canon produit, backend et déploiement.

## Intention

Permettre à plusieurs personnes de contribuer au prototype UI sans casser :

- l'étape visuelle validée ;
- la priorité UI de MALEX ;
- le contrat backend existant ;
- la future capacité à transformer le prototype en interface exploitable.

Le prototype reste une surface de décision et d'exploration. Il n'est pas encore la vérité produit finale.

## Rôles

| Rôle | Priorité | Peut faire | Ne doit pas faire |
|---|---|---|---|
| MALEX | Direction UI et produit | décider layout, DA, interactions, ton, priorités | valider une intégration backend par accident |
| Vincent | Profil test, regard backend/science, faisabilité | proposer besoins, assets perso, contraintes, données de test | modifier la direction UI ou imposer une logique web générique |
| Codex | Orchestration, docs, proto, garde-fous | implémenter localement, documenter, signaler les écarts | publier, canoniser ou déployer sans GO explicite |

## Zones De Travail

| Zone | Usage | Source de vérité |
|---|---|---|
| `/ui-reset` | prototype naviguable validé visuellement par MALEX | prototype local |
| `/ui-lab` | test isolé de composants, états et profils | registry prototype |
| `prototype-profile-registry.ts` | profils testables et palettes guidées | contrat prototype |
| `docs/ui/*` | CDC, contrats, process, fiches profils | documentation prototype |
| backend / API | runtime réel futur | GitHub + contrats partagés |

Règle : une idée validée dans `/ui-reset` reste prototype tant qu'elle n'a pas un contrat d'intégration explicite.

## Priorité De Décision

1. MALEX décide l'expérience et la DA.
2. Le CDC UI reset décide le sens général.
3. Le contrat de profil décide la structure des profils testables.
4. Le Lab sert à accélérer les composants sans risquer `/ui-reset`.
5. Vincent peut signaler une contrainte backend, mais pas remplacer une décision UI validée.

## Workflow Recommandé

### 1. Exploration UI

- Travailler dans `/ui-reset`.
- Valider visuellement les interactions principales.
- Ne pas chercher la perfection code tant que la décision produit bouge encore.
- Noter les décisions stables dans `docs/ui/MASTERFLOW_UI_RESET_CDC_V1.md` ou un document dédié.

### 2. Isolation Composant

- Dès qu'un composant devient stable, le tester dans `/ui-lab`.
- Garder les mêmes données que `/ui-reset`.
- Ne pas recréer de fixtures divergentes.
- Tester états : ouvert, fermé, mobile, desktop, clair, sombre, profil A, profil B.

### 3. Profil Testable

Pour ajouter un profil :

1. créer les assets candidats ;
2. ranger les assets dans `apps/frontend/src/assets/<persona>/` ;
3. ajouter le profil dans `prototype-profile-registry.ts` ;
4. créer une fiche dans `docs/ui/MASTERFLOW_PROTOTYPE_PROFILE_<NOM>_V1.md` ;
5. vérifier `/ui-reset` et `/ui-lab`.

Contrat de référence : `MASTERFLOW_PROTOTYPE_PROFILE_CONTRACT_V1.md`.

### 4. Passage Vers UI Exploitable

Avant d'intégrer au vrai frontend connecté :

- définir quelles données viennent du backend ;
- définir ce qui reste local UI ;
- définir les permissions ;
- définir les états vides, verrouillés et indisponibles ;
- écrire un contrat d'orchestration ;
- seulement ensuite coder l'intégration réelle.

## Règles Anti-Conflit

- Ne jamais modifier une décision UI validée par MALEX sans le dire.
- Ne jamais transformer une contrainte backend en redesign automatique.
- Ne jamais ajouter une couleur libre hors palette guidée.
- Ne jamais mélanger assets candidats et assets validés sans dossier clair.
- Ne jamais faire dépendre `/ui-reset` d'un backend live.
- Ne jamais publier le prototype comme produit fini.
- Ne jamais modifier le profil MasterFlex pour tester ProfKrapu.
- Ne jamais créer une seconde registry locale dans le Lab.

## Process Vincent

Vincent peut contribuer efficacement via des entrées courtes :

| Type d'entrée | Format utile | Destination |
|---|---|---|
| Besoin profil | "ProfKrapu doit afficher..." | fiche profil |
| Contrainte backend | "Cette donnée existe / n'existe pas..." | contrat d'intégration futur |
| Retour UX | "Je ne comprends pas..." | backlog prototype |
| Asset candidat | image + intention + statut | dossier assets candidat |
| Permission | rôle concerné + action autorisée | matrice permissions future |

Vincent ne doit pas modifier directement les choix de navigation, de layout, de rythme ou de DA sans validation MALEX.

## Bot / Assistant Vincent

Un assistant dédié à Vincent devra appliquer ces règles :

- toujours distinguer prototype, canon, backend et déploiement ;
- répondre d'abord en impact produit, pas en technique ;
- proposer des patchs courts, jamais des refontes globales ;
- ne pas publier ;
- ne pas pousser vers `main` ;
- ne pas demander de validation sur des micro-choix ;
- signaler les conflits avec la direction UI de MALEX ;
- transformer ses retours en tâches ou fiches, pas en changements implicites.

Prompt court recommandé pour ce bot :

```text
Tu aides Vincent sur MasterFlow sans prendre la direction UI.
Tu vérifies la faisabilité, les données disponibles, les permissions et les écarts backend.
Tu ne modifies pas le prototype sans validation MALEX.
Tu distingues toujours prototype, canon, implémentation et déploiement.
Tu transformes les retours en tâches courtes, fiches profils ou alertes.
Tu ne publies rien.
```

## Espaces De Travail Partagés

Le Component Lab est unique, mais ses états locaux sont séparés :

| Espace | URL | Profil initial | Configuration propriétaire |
|---|---|---|---|
| MALEX | `/ui-lab/malex` | MasterFlex | `component-lab-workspaces/malex.ts` |
| Vincent | `/ui-lab/vincent` | ProfKrapu | `component-lab-workspaces/vincent.ts` |

Les deux espaces consomment les mêmes composants partagés. Profil, thème, viewport et état du Lab
sont persistés sous deux clés locales distinctes. Un espace n'est donc ni un fork visuel ni une
copie du prototype.

## Branches Et Intégration

Branche d'intégration du prototype :

```txt
codex/ui-reset-prototype-lab
```

Règles de contribution :

1. MALEX et Vincent créent chacun une branche courte depuis la branche d'intégration à jour.
2. Une branche porte un composant ou une famille cohérente.
3. Les réglages propres à un espace restent dans son fichier de workspace ou sa fiche profil.
4. Les composants réutilisables restent dans les modules partagés `prototype-*`.
5. Chacun commit et pousse sa branche de contribution ; personne ne pousse sur la branche de
   travail de l'autre.
6. MALEX valide la direction UI et choisit les composants à intégrer.
7. L'intégration revient dans `codex/ui-reset-prototype-lab`, jamais directement dans `main`.
8. À la fin de la vague intégrée, lancer :

   ```bash
   npm run build:ui-lab
   ```

   Cette commande exécute le lint frontend puis le build frontend complet.

9. Une PR vers `main`, un raccord backend ou un déploiement restent des décisions séparées avec GO
   explicite.

Nommage recommandé :

```txt
codex/ui-lab-malex-<composant>
vincent/ui-lab-<composant>
```

Une contribution peut être poussée pour collaboration sans devenir canon produit ni frontend
runtime.

## Définition D'une Vague Validable

Une vague est validable si :

- son objectif tient en une phrase ;
- les fichiers touchés sont listés ;
- `/ui-reset` reste consultable ;
- `/ui-lab` reste cohérent ;
- MasterFlex n'est pas cassé par ProfKrapu ;
- ProfKrapu n'est pas une simple copie de MasterFlex ;
- les couleurs restent lisibles ;
- aucune action backend sensible n'est simulée comme active.

## Queue De Travail Recommandée

### À faire maintenant

- Continuer à stabiliser `/ui-lab` comme atelier de composants.
- Ajouter les fiches profils au même format que ProfKrapu.
- Garder les corrections UI rapides dans `/ui-reset`.

### À mettre en queue

- Créer un vrai mode "profil courant" persistant uniquement prototype.
- Préparer un flux d'intro qui collecte préférences, couleur, ton et assets.
- Définir le contrat futur entre profil prototype et loadout backend.

### À demander à Vincent

- Valider le ton ProfKrapu.
- Donner les contraintes de données réellement disponibles côté backend.
- Lister les rôles/permissions qu'il estime nécessaires pour son usage.

### À décider plus tard

- Quand `/ui-reset` devient une UI exploitable.
- Quel sous-ensemble rejoint le frontend connecté.
- Quelle partie du profil devient canon produit.

## Critères De Succès

En fin de phase, on doit pouvoir dire :

- MALEX peut itérer vite sur l'UI sans rebuild mental permanent.
- Vincent peut contribuer sans changer la direction produit.
- Les profils sont testables sans casser l'app.
- Le Lab accélère les composants sans devenir une deuxième UI.
- Le passage vers le backend est préparé, pas improvisé.

## Alerte De Dérive

Stopper et reclarifier si :

- Vincent demande une modification qui change la promesse produit ;
- une contrainte backend force un redesign sans discussion ;
- un asset candidat remplace un asset validé sans trace ;
- une couleur devient illisible ;
- une interaction du Lab diverge de `/ui-reset` ;
- un composant prototype déclenche ou simule une action backend réelle.
