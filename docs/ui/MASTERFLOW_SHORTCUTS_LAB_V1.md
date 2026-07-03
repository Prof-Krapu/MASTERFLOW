# MasterFlow Shortcuts Lab V1

Statut : prototype local.

Cette vague durcit les raccourcis clavier du prototype et les rend visibles dans `/ui-lab`.

## Objectif

Éviter les raccourcis qui changent selon l'écran, les exceptions invisibles et les bugs de navigation.

## Ajouts

- Resolver unique pour le cycle `Cmd/Ctrl + ↑/↓`.
- Le Lab utilise le même resolver pour afficher les destinations précédente/suivante.
- Les flèches `←/→` pilotent maintenant réellement le skilltree dans le Lab.
- L'onglet `states` affiche la table canonique des raccourcis.

## Règles Actives

| Raccourci | Rôle |
|---|---|
| `Esc` | fermer selon priorité |
| `T` | mode Tunnel |
| `R` | raccourcis |
| `A` | bibliothèque d'actions |
| `S` | recherche rapide |
| `K` | clavier |
| `M` | micro |
| `H` | historique |
| `F` | plein écran / focus / normal |
| `Cmd/Ctrl + ↑/↓` | navigation globale |
| `←/→` | navigation skilltree quand la page personnage est active |
| `Enter` | envoyer dans un textarea |
| `Shift + Enter` | retour ligne dans un textarea |

## Priorité `Esc`

L'ordre de fermeture reste :

1. Tunnel
2. Raccourcis
3. Paramètres
4. Actions
5. Panneau système
6. Page personnage mobile
7. Historique
8. Accès
9. Dock clavier / micro
10. Menu gauche
11. Mode focus / fullscreen

## Limite

Le navigateur peut réserver certains raccourcis selon l'OS ou le contexte. Le prototype écoute en capture, mais si un raccourci système gagne, il faudra prévoir une alternative produit.
