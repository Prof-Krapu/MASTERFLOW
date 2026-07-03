# MasterFlow Skilltree / Galaxy Lab V1

Statut : prototype local.

Cette fiche cadre l'isolation du skilltree et des galaxies dans `/ui-lab`.

## Intention

Le skilltree concentre beaucoup de décisions visuelles :

- centre de gravité ;
- taille des pictos ;
- vitesse des orbites ;
- distance des skills ;
- familles actives ;
- profil central ;
- mode mobile ;
- tableau complet.

Le Lab doit permettre de tester ces variations sans retoucher `/ui-reset` à chaque essai.

## Presets Disponibles

| Preset | Objectif |
|---|---|
| Profil | revenir à la vue centrale du persona |
| Tableau | afficher la cartographie complète des skills |
| Mobile | tester une galaxy en viewport 390 px |

## Contrôles

- Boutons directs vers chaque galaxy du profil actif.
- Boutons de familles disponibles dans la galaxy ouverte.
- Switch profil global : MasterFlex / ProfKrapu.
- Switch thème clair/sombre.
- Switch desktop/mobile.

## Règles Produit

- La fiche de contrôle du Lab ne doit pas influencer le centrage de la galaxy.
- La galaxy reste pilotée par le composant `PrototypeSkilltreeSurface`.
- Les données viennent du profil actif dans `prototype-profile-registry.ts`.
- Les familles actives colorent les skills concernés ; les autres restent secondaires.
- Le Lab ne définit pas encore la DA finale du skilltree, il sert à la tester.

## Validation Rapide

À vérifier dans `/ui-lab` :

- onglet `persona` ;
- profil MasterFlex ;
- profil ProfKrapu ;
- chaque galaxy ;
- chaque famille disponible ;
- preset `Tableau` ;
- preset `Mobile` ;
- thème clair et sombre.

## Limite

Cette vague ne change pas la logique de distance, vitesse ou taille dans `/ui-reset`. Elle donne le banc de test pour les régler plus vite dans une prochaine tranche.
