# MasterFlow Prototype Profile Contract V1

Statut : prototype local.

Ce contrat décrit comment ajouter ou modifier un profil consultable dans `/ui-reset` et `/ui-lab` sans casser l'UI validée.

## Intention

Un profil prototype est une identité testable dans l'interface : persona, thème, assets, rang, punchlines, inventaire lié et galaxies de compétences.

Le registre local est la source de vérité du prototype :

- `apps/frontend/src/ui-reset/prototype-profile-registry.ts`

Le backend ne consomme pas encore ce contrat. Aucun contrat API n'est ajouté dans cette vague.

## Données Obligatoires

Chaque profil doit définir :

- `id` : identifiant stable du profil prototype.
- `name` : nom visible du persona.
- `displayName` : nom utilisateur affiché dans la Home.
- `defaultThemePaletteId` : palette contrôlée, jamais couleur libre.
- `personaColor` : couleur du persona et des bulles utilisateur.
- `supportColor` : couleur secondaire.
- `avatarAsset` : portrait UI neutre.
- `moodAssets` : six portraits émotionnels compatibles avec le skilltree.
- `canonAsset` et `canonAlt` : visuel canon en pied.
- `stats` : métriques cyclées dans la vue personnage.
- `inventoryConnections` : boutons d'actifs liés au persona.
- `skillArcs` : galaxies de compétences.
- `shortLabels` : libellés courts des métriques.
- `defaultPunchline`, `modePunchlines`, `skillPunchlines`.
- `tunnelLine` et `tunnelPrompt`.

## Invariants

- Le profil ne doit pas modifier les données d'un autre profil.
- Les palettes viennent de `themePalettes`.
- Les assets restent importés localement, pas chargés depuis un provider.
- Les skills utilisent les familles contrôlées : `image`, `volume`, `system`, `story`, `soft`.
- Les six états émotionnels gardent le même cadrage pour éviter les sautes UI.
- La navigation et la Home doivent consommer les helpers du registre, pas recoder une liste locale.
- `/ui-lab` sert à tester le même profil que `/ui-reset`, pas une version simplifiée divergente.

## Helpers À Utiliser

- `prototypeProfileIds`
- `getPrototypeProfile(profileId)`
- `getPrototypeThemePalette(paletteId)`
- `getPrototypeProfileRank(profile)`
- `buildPrototypeModeGroups(visibleModeIds?)`
- `buildPrototypeHomeModes(ids)`

## Recette D'Ajout

1. Ajouter les assets dans `apps/frontend/src/assets/<persona>/`.
2. Importer les assets dans `prototype-profile-registry.ts`.
3. Ajouter les métriques, inventaire, skill arcs et punchlines.
4. Ajouter l'entrée dans `prototypeProfiles`.
5. Vérifier `/ui-reset` : Home, menu, page personnage, skilltree, Tunnel.
6. Vérifier `/ui-lab` : profil, navigation, command dock, overlays.

## Critères D'Acceptation

- `npm run lint --workspace @masterflow/frontend` OK.
- `npm run build:frontend` OK.
- `/ui-reset` répond.
- `/ui-lab` répond.
- Changer de profil ne modifie pas le profil précédent.
- Le thème du profil reste guidé et lisible.
- Aucun backend, provider, publication ou commit n'est nécessaire pour valider le prototype.

## Risques

- Dérive visuelle si le Lab recrée des fixtures au lieu de lire le registre.
- Illisibilité si une couleur libre remplace une palette validée.
- Saut de layout si les portraits n'ont pas le même gabarit.
- Confusion produit si un profil prototype est traité comme canon backend.

## Prochaine Évolution

Quand le prototype sera stable, ce contrat pourra être rapproché du loadout backend, mais seulement après validation d'un contrat API explicite.
