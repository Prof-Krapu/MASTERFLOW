# MasterFlow Prototype Profile - ProfKrapu V1

Statut : prototype local.

Ce document décrit l'instance Vincent / ProfKrapu telle qu'elle existe dans le prototype `/ui-reset` et dans le Lab `/ui-lab`.

Il applique le contrat `MASTERFLOW_PROTOTYPE_PROFILE_CONTRACT_V1.md`. Il ne canonise pas Vincent dans le backend et n'ajoute aucun contrat API.

## Source Prototype

- Registre : `apps/frontend/src/ui-reset/prototype-profile-registry.ts`
- Profil : `profkrapu`
- Contrat : `prototype-profile-v1`
- Surface de test : `/ui-reset`
- Surface de composants : `/ui-lab`

## Identité

- Persona : `ProfKrapu`
- Utilisateur affiché : `Vincent`
- Rang prototype : `Maître des Flux`
- Score rang : `84`
- Ton : vouvoiement, science propre, troll sec, utile avant tout.
- Principe : précision scientifique avant style, style seulement si les données tiennent debout.

## Thème

Palette par défaut : `Orchidée`

| Rôle | Couleur | Usage |
|---|---:|---|
| Couleur UI majeure | `#e84f8a` | boutons, actions, accents de thème |
| Couleur persona | `#35a879` | avatar, bulles utilisateur, science |
| Couleur support | `#3979e8` | appuis visuels, schémas, liens secondaires |

Règle : Vincent ne doit pas modifier librement les couleurs du prototype vers une palette illisible. Les choix doivent rester guidés par les palettes validées.

## Assets

Portraits UI :

- `apps/frontend/src/assets/profkrapu-portraits/neutral.png`
- `apps/frontend/src/assets/profkrapu-portraits/fear.png`
- `apps/frontend/src/assets/profkrapu-portraits/disgust.png`
- `apps/frontend/src/assets/profkrapu-portraits/sad.png`
- `apps/frontend/src/assets/profkrapu-portraits/confident.png`
- `apps/frontend/src/assets/profkrapu-portraits/joy.png`

Visuel canon :

- `apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v3.png`

Invariants assets :

- même cadrage pour les six portraits ;
- pas de saut de taille dans le skilltree ;
- pas de remplacement des assets MasterFlex ;
- attention aux fonds chroma et reflets, notamment dans les lunettes.

## Punchlines

| Contexte | Texte |
|---|---|
| Défaut | Science propre, vanne sèche. |
| Home | On vulgarise, mais avec des preuves. |
| Project | Votre bazar a mis une blouse. |
| Teaching | Cours prêt. Mauvaise foi sous contrôle. |
| Learn | On apprend, mais on vérifie. |
| Inventory | Ressources rangées, miracle discret. |
| DA Studio | Le style attendra les données. |
| MasterStory | Narration oui, intox non. |
| Companions | Équipe calme, microscope ouvert. |

Tunnel :

- Ligne : `ProfKrapu développe le point, sources sur la table.`
- Prompt : `Posez votre hypothèse, ProfKrapu sort la lampe UV.`

## Métriques

| Id | Label | Valeur | Maîtrise | Couleur |
|---|---|---:|---:|---:|
| `science` | Science sans paillettes | 92 | 92 | `#35a879` |
| `logic` | Logique sous lampe UV | 81 | 81 | `#3979e8` |
| `dataviz` | Dataviz qui ne ment pas | 61 | 61 | `#8b62c9` |
| `source` | Source encore en cavale | 38 | 38 | `#d9823f` |
| `troll` | Troll passé au contrôle qualité | 18 | 18 | `#c94b32` |
| `patience` | Patience avec les approximations | 8 | 8 | `#d83e34` |

Labels courts :

- Science nette
- Logique froide
- Dataviz propre
- Source d'abord
- Troll utile
- Patience scientifique

## Inventaire Lié

| Id | Label | Nombre | Couleur |
|---|---|---:|---:|
| `courses` | Cours | 24 | `#35a879` |
| `schemas` | Schémas | 18 | `#3979e8` |
| `dataviz` | Dataviz | 9 | `#e84f8a` |
| `molekids` | Molekids | 7 | `#f0c14a` |

## Galaxies De Compétences

| Id | Label | Titre galaxy | Couleur | Punchline |
|---|---|---|---:|---|
| `science` | Science | La matière avoue quand on pose la bonne question | `#35a879` | La science, pas le karaoké. |
| `pedagogy` | Pédagogie | Le cours devient suspect, donc utile | `#3979e8` | Pédagogie sèche, impact net. |
| `dataviz` | Dataviz | Les chiffres arrêtent de faire les malins | `#e84f8a` | Un graphe propre ou rien. |
| `support` | Supports | Le tableau cesse enfin de transpirer | `#f0c14a` | Support net, ego rangé. |

Exemples de skills déjà présents :

- Science : chimie, botanique, molécules, logique, hypothèse, protocole, précision source.
- Pédagogie : cours, vulgarisation, reformulation, question piège, démonstration, élèves perdus.
- Dataviz : axes, légendes, hiérarchie, graphique, donnée source, anti-bullshit.
- Supports : thumbnail, poster, fiche, bannière, storyboard, Molekids, print handoff.

## Validation Prototype

À vérifier après modification du profil :

- MasterFlex reste inchangé.
- Le switch de profil fonctionne dans les paramètres.
- La Home affiche le texte Vincent, pas le texte Malex.
- La page personnage charge ProfKrapu, son thème et ses galaxies.
- Les six portraits sont visibles dans les états du skilltree.
- Le Lab `/ui-lab` lit la même registry que `/ui-reset`.
- Le thème Orchidée reste lisible en sombre et en clair.
- Aucun backend, provider, publication, commit ou push n'est impliqué.

## Points À Valider Plus Tard

- Validation finale du canon Vincent par Vincent et Malex.
- Nettoyage définitif des éventuels artefacts de détourage dans les lunettes.
- Pack émotionnel final si les portraits actuels sont encore candidats.
- Mapping futur vers loadout backend, uniquement après contrat API dédié.

## Décision Produit Actuelle

ProfKrapu est un profil prototype exploitable pour tester :

- la multi-identité dans une même UI ;
- un thème personnel distinct sans casser celui de Malex ;
- une page personnage réutilisable ;
- une galerie de compétences orientée professeur/science ;
- la séparation entre prototype local et canon produit final.
