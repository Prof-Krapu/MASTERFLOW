# Implémentation USD-002/003/005 — Shell, navigation et Command Dock

Date : 2026-07-12  
Round : `UI-SHELL-DOCK-001`  
Statut : tranche P1 implémentée sur branche V2  

## Diagnostic simple

La branche V2 possède maintenant une entrée prototype `/ui-reset` et une entrée atelier `/ui-lab`.
La tranche promeut la coque validée du prototype sans reprendre les scènes lourdes :

- navigation gauche ;
- barre système ;
- rail d’actions ;
- clavier / micro / historique ;
- bibliothèque d’actions ;
- recherche rapide ;
- raccourcis ;
- mode Tunnel mocké ;
- lecture runtime optionnelle.

Home, page personnage et skilltree ne sont pas promus dans cette tranche. Le centre de l’écran affiche
un placeholder de contrat Shell/Dock pour éviter de faire croire que les surfaces produit sont livrées.

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `apps/frontend/src/main.tsx` | ajoute `/ui-reset`, `/ui-lab` et `/ui-lab/vincent` |
| `apps/frontend/src/current-ui-demo.tsx` | remplace l’ancien prototype par une surface Shell/Dock P1 |
| `apps/frontend/src/current-ui-demo.css` | reprend la charte prototype et ajoute le style Lab compact |
| `apps/frontend/src/ui-reset/prototype-shell-components.tsx` | composants Shell/Dock promus |
| `apps/frontend/src/ui-reset/use-prototype-shortcuts.ts` | raccourcis globaux promus |
| `apps/frontend/src/ui-reset/prototype-shortcut-registry.ts` | registre raccourcis |
| `apps/frontend/src/ui-reset/prototype-ui-state-registry.ts` | états UI et priorités Esc |
| `apps/frontend/src/ui-reset/component-lab.tsx` | Lab compact MALEX/Vincent |

## Contrat respecté

- Pas de backend ajouté.
- Pas de migration.
- Pas de provider voix/image.
- Pas d’assets candidats copiés.
- Pas de Home/persona/skilltree promus.
- Les actions suggérées restent non sensibles : clic prototype uniquement.
- Le runtime est optionnel : fallback clair si le backend ne répond pas.

## Vérification

Commande exécutée :

```bash
npm run build:frontend
```

Résultat : build frontend OK.

## Validation humaine restante

MALEX doit vérifier rapidement dans le navigateur :

- `/ui-reset` : coque, menu, dock, raccourcis, tunnel ;
- `/ui-lab` : atelier MALEX ;
- `/ui-lab/vincent` : atelier Vincent ;
- mobile 390 px si cette tranche doit ensuite être promue runtime.

## Prochaine action

Publier cette tranche sur la draft PR #214, puis demander une validation visuelle humaine courte.

## Correctif 2026-07-12 — Lab/proto restaurés

La première promotion avait trop réduit le prototype en remplaçant le vrai Lab par une coquille
Shell/Dock minimale. Cette approche était techniquement propre mais inutilisable pour le travail UI
partagé.

Correction appliquée :

- restauration du vrai `/ui-reset` depuis le prototype local avancé ;
- restauration du vrai `/ui-lab` avec workspaces MALEX et Vincent ;
- versionnement des assets actifs nécessaires uniquement ;
- exclusion maintenue des assets candidats, backups, sources lourdes et PSD ;
- ajout du pipeline `MASTERBUILD_UI_LAB_PIPELINE.md`.

Nouveau critère de validation : MALEX et Vincent doivent pouvoir travailler dans leurs Labs respectifs
et voir leurs composants se refléter dans le prototype unique.
