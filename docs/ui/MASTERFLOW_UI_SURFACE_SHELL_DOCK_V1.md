# MasterFlow UI Surface Shell + Command Dock V1

Statut : branchement lecture seule local verifie, non publie
Date : 2026-07-04
Validation : GO MALEX du 2026-07-04 pour le patch local, pas pour publication
Reference CDC : `docs/ui/MASTERFLOW_UI_CDC_CANON_V2.md`
Registre : `docs/ui/MASTERFLOW_UI_INTEGRATION_REGISTRY_V1.md`
Surface : Shell / navigation / system bar + Command Dock

## 1. Contrat de deploiement

Intention produit :

- transformer la coque prototype en premiere surface branchable au systeme ;
- garder le feeling du prototype ;
- commencer en lecture seule ;
- ne jamais activer une action sensible sans validation humaine.

Partie du canon concernee :

- navigation globale ;
- modes disponibles ;
- command dock clavier / micro / actions ;
- raccourcis ;
- system bar ;
- etats verrouilles/futurs.

Ce qui doit changer plus tard dans le code :

- la navigation doit lire le loadout runtime ;
- les suggestions du dock doivent lire les actions disponibles ;
- les badges systeme doivent lire jobs / validation inbox ;
- les raccourcis doivent suivre le cycle autorise.

Ce qui ne doit pas changer :

- `/ui-reset` reste reference prototype ;
- `/ui-lab` reste atelier composant ;
- pas de nouveau backend ;
- pas de nouveau contrat API ;
- pas d'execution d'action sensible depuis une suggestion ;
- pas de merge `main`, provider, publication ou deploiement dans cette vague.

Critere simple de succes :

```txt
Le Shell et le Dock peuvent afficher l'etat reel du contexte courant sans casser la DA,
les raccourcis, les permissions, le mobile ou les animations du prototype.
```

Risque de derive :

- moyen si on copie le prototype tel quel dans le runtime ;
- moyen si les actions du dock deviennent executables trop tot ;
- faible si la premiere vague reste lecture seule.

Validation :

- patch local lecture seule autorise par MALEX le 2026-07-04 ;
- oui avant activation d'actions ;
- oui avant commit, push, PR, merge ou deploiement.

## 2. Role utilisateur

Le Shell repond a trois questions :

1. Ou suis-je ?
2. Quels modes sont disponibles pour moi maintenant ?
3. Qu'est-ce qui demande mon attention ?

Le Command Dock repond a trois autres questions :

1. Comment je parle au systeme ?
2. Quelles actions utiles sont disponibles maintenant ?
3. Comment je passe en clavier, micro, historique, actions ou tunnel sans chercher ?

## 3. Sources Git deja disponibles

| Besoin UI | Source Git | Statut |
|---|---|---|
| contexte courant | `GET /api/v1/context/current` | disponible |
| utilisateur / role | `CurrentContext.user` | disponible |
| room / instance active | `CurrentContext.room`, `CurrentContext.room_instance` | disponible |
| personas disponibles | `CurrentContext.personas` | disponible |
| actions disponibles | `CurrentContext.available_actions` | disponible |
| loadout runtime | `CurrentContext.user_runtime_loadout` | disponible |
| cycle de modes | `user_runtime_loadout.active_mode_cycle` | disponible |
| raccourcis autorises | `user_runtime_loadout.available_shortcuts` | disponible |
| actions par defaut | `default_action_ids`, `quick_palette_action_ids`, `suggested_first_action_ids` | disponible |
| raisons de verrouillage | `disabled_reason_map`, `locked_capabilities` | disponible |
| orientation systeme | `GET /api/v1/experience/orientation` | disponible diagnostic-only |
| jobs | `GET /api/v1/jobs` | disponible |
| validation humaine | `GET /api/v1/validation-inbox` | disponible teacher+ |
| session prototype | token stocke par `setToken()` en local dev | disponible prototype |

## 4. Donnees a consommer en V1

### Shell / Navigation

Source principale :

- `CurrentContext.user_runtime_loadout.available_apps`
- `CurrentContext.user_runtime_loadout.active_mode_cycle`
- `CurrentContext.user_runtime_loadout.locked_capabilities`
- `CurrentContext.user_runtime_loadout.disabled_reason_map`
- `CurrentContext.user.role`
- `CurrentContext.personas`

Session :

- `/ui-reset` peut relire le token stocke par l'app locale apres login ;
- ce pont sert uniquement au prototype local ;
- si le token est absent ou invalide, le proto reste visible en etat degraded/prototype ;
- aucune action sensible n'est declenchee depuis ce pont.

Regles :

- `available_apps` donne les modes visibles et autorises ;
- `active_mode_cycle` donne l'ordre de navigation clavier ;
- une entree absente du loadout ne doit pas etre presentee comme active ;
- une entree future peut etre affichee verrouillee seulement si la raison existe ;
- GodMode reste un acces, pas une experience normale exposee a tout le monde.

### System Bar

Source principale :

- `/jobs`
- `/validation-inbox`
- `/experience/orientation`

Regles :

- jobs = ce qui tourne ;
- validation inbox = ce qui attend decision humaine ;
- orientation = ce qui existe, manque, est verrouille ou futur ;
- la system bar reste discrete ;
- pas de dashboard technique permanent.

### Command Dock

Source principale :

- `CurrentContext.available_actions`
- `user_runtime_loadout.default_action_ids`
- `user_runtime_loadout.quick_palette_action_ids`
- `user_runtime_loadout.suggested_first_action_ids`
- `user_runtime_loadout.create_launcher_action_ids`

Regles :

- afficher 5 actions visibles par defaut ;
- Home peut monter jusqu'a 8 actions, mais sur une seule ligne ;
- les actions excedentaires vont dans la bibliotheque `+` ;
- action `status='live'` + permission OK = visible comme utilisable ;
- action `future` = verrouillee ou cachee selon contexte ;
- action `out_of_scope` = masquee ;
- `validation_required` visible avant toute execution ;
- `preflight_required` impose un preflight avant action.

## 5. Permissions et etats

| Etat | Shell | Dock |
|---|---|---|
| utilisateur non connecte | route login / no context | dock cache ou inactif |
| contexte charge | modes du loadout | actions du loadout |
| contexte vide | Home minimale | clavier simple sans suggestions |
| action absente | mode cache | chip cachee |
| action future | mode verrouille si utile | chip verrouillee avec raison |
| action sensible | visible seulement si utile | preflight + validation, jamais execution directe |
| role insuffisant | mode cache ou readonly | action cachee/verrouillee |
| endpoint indisponible | etat degraded | pas de fake actif |
| mobile | bottom nav + panels plein ecran | dock bas, largeur propre |

## 6. Raccourcis canon V1

| Raccourci | Comportement |
|---|---|
| `Esc` | ferme selon priorite globale |
| `K` | ouvre/ferme clavier |
| `M` | ouvre/ferme micro conversationnel |
| `H` | ouvre/ferme historique |
| `A` | ouvre/ferme bibliotheque d'actions |
| `S` | ouvre/ferme recherche rapide |
| `T` | ouvre/ferme Mode Tunnel |
| `R` | ouvre/ferme raccourcis |
| `F` | plein ecran / focus / normal |
| `Cmd/Ctrl + haut/bas` | navigue dans `active_mode_cycle` |
| `gauche/droite` | reserve skilltree quand page personnage active |
| `Enter` | envoie dans un textarea |
| `Shift+Enter` | ajoute une ligne |

Regle :

- si le focus est dans un champ texte, seuls `Enter`, `Shift+Enter` et `Esc` sont interpretes par le
  composeur ;
- les autres raccourcis ne doivent pas voler la saisie utilisateur.

## 7. Etats vides et verrouilles

| Cas | Texte / comportement recommande |
|---|---|
| aucune action disponible | dock clavier seul, sans chips |
| aucun mode supplementaire | Home + profil seulement |
| loadout absent | fallback prototype interdit en runtime ; afficher degraded |
| jobs indisponibles | masquer compteur, pas de fausse pastille |
| validation inbox interdite au role | masquer inbox ou readonly explicite |
| orientation indisponible | ne pas afficher future/locked invente |
| action sensible | afficher intention + validation requise |

## 8. Ce qui reste prototype

- assets MasterFlex / ProfKrapu ;
- themes personnels complets ;
- skilltree/galaxy ;
- Tunnel avec reponse mockee ;
- animations fines du prototype ;
- pages Project/Teaching/Learn/DA/MasterStory ;
- edition des preferences profils ;
- micro reel / transcription provider.

## 9. Ce qui peut etre branche en lecture seule

| Element | Donnee reelle | Pourquoi c'est safe |
|---|---|---|
| nom / role utilisateur | `CurrentContext.user` | affichage seulement |
| profil/persona disponible | `CurrentContext.personas` | affichage seulement |
| modes autorises | `active_mode_cycle`, `available_apps` | navigation seulement |
| session locale | token deja obtenu par login | lecture contexte seulement |
| chips d'action | `available_actions` | affichage seulement si pas d'execution |
| badges jobs | `/jobs` | compteur/etat seulement |
| badge inbox | `/validation-inbox` | compteur teacher+ seulement |
| verrous/futurs | orientation + loadout | explication seulement |

## 10. Ce qui ne doit pas etre branche en V1

- execution directe d'action depuis chip ;
- validation ou rejet d'inbox ;
- creation de job ;
- micro reel ;
- provider voix/image ;
- modification de role ou permissions ;
- sauvegarde de preferences utilisateur ;
- edition live des themes ;
- lecture de Factories au runtime.

## 11. Matrice d'integration Shell / Dock

| Bloc UI | Donnee backend | Endpoint / contrat | Permission | Etat vide | Etat verrouille | Priorite |
|---|---|---|---|---|---|---|
| profil visible | user + personas | `/context/current` | user | avatar neutre prototype | profil runtime manquant | P1 |
| menu modes | `available_apps`, `active_mode_cycle` | `/context/current` | user/loadout | Home seule | disabled reason | P1 |
| raccourcis nav | `available_shortcuts`, `active_mode_cycle` | `/context/current` | user/loadout | fallback Home | shortcut absent | P1 |
| dock clavier | local state + context | UI local | user | textarea seul | disabled si no context | P1 |
| suggestions | `available_actions`, action ids du loadout | `/context/current` | action minimum role | aucune chip | future/out_of_scope | P1 |
| bibliotheque actions | `available_actions` | `/context/current`, puis `/actions/available` si besoin | user/loadout | recherche vide | action future | P1 |
| system jobs | jobs | `/jobs` | user/role backend | pas de badge | endpoint error degraded | P1 |
| validation inbox | inbox items | `/validation-inbox` | teacher+ | pas de badge | role insuffisant | P1 |
| orientation/futur | capabilities | `/experience/orientation` | user | rien | locked/future explique | P2 |

## 12. Acceptance tests avant code

### Desktop

- le menu lit une liste canonique unique ;
- `Cmd/Ctrl + haut/bas` boucle sans blocage ;
- profil et modes restent alignes ;
- dock ouvert/ferme partout ;
- `Enter` envoie, `Shift+Enter` ajoute une ligne ;
- `M` ne bascule jamais vers clavier par erreur ;
- suggestions limitees et sur une seule ligne ;
- actions sensibles non executables directement ;
- sortie animee de chaque panneau.

### Mobile

- menu bas utilisable ;
- panels plein ecran ;
- dock largeur propre a 390 px ;
- pas de debordement horizontal ;
- system bar adaptee ou reduite.

### Runtime lecture seule

- si `/context/current` echoue, pas de fallback prototype silencieux ;
- si `/jobs` echoue, badge jobs absent/degraded ;
- si `/validation-inbox` retourne 403, inbox masquee ou readonly explicite ;
- si une action est `future`, elle n'apparait pas comme active ;
- si un mode n'est pas dans le loadout, le raccourci ne le cible pas.

## 13. Questions a poser a Vincent

1. `available_apps` doit-il etre la source unique des modes visibles, ou faut-il une table de
   mapping UI separee ?
2. `active_mode_cycle` inclut-il Home/persona/skilltree, ou seulement les apps runtime ?
3. Quelle route est la meilleure pour lister toutes les actions possibles dans la bibliotheque `+` :
   `CurrentContext.available_actions` ou `/actions/available` filtre cote front ?
4. Les compteurs jobs/inbox doivent-ils etre visibles pour `student`, `teacher`, `admin`, ou
   seulement selon capabilities ?
5. Les `locked_capabilities` doivent-elles alimenter le menu gauche, le dock, ou seulement les
   pages detaillees ?

## 14. Decision recommandee

Premiere vague code recommandee :

```txt
Shell + Dock lecture seule
```

Ordre exact :

1. extraire une liste canonique de modes UI a partir du prototype ;
2. ajouter un mapping `mode -> app/loadout/action` sans changer le visuel ;
3. brancher `CurrentContext` en lecture seule ;
4. brancher suggestions sur `available_actions` sans execution ;
5. brancher badges jobs/inbox en lecture seule ;
6. verifier raccourcis et mobile ;
7. seulement ensuite, decider si Home runtime peut commencer.

## 15. Checkpoint d'implementation 2026-07-03

Statut : premiere passe lecture seule appliquee au prototype `/ui-reset`.

Ce qui est fait :

- `CurrentUiDemo` tente de lire `GET /context/current` au montage ;
- si un token API est deja disponible dans la session, le prototype utilise :
  - `CurrentContext.user_runtime_loadout` pour filtrer les modes mappables ;
  - `CurrentContext.available_actions` pour generer les suggestions du Dock ;
  - `/jobs` pour le compteur Queue ;
  - `/validation-inbox` pour le compteur Notifications si le role y a acces ;
- si le runtime est absent ou refuse la requete, `/ui-reset` reste consultable en mode prototype ;
- aucune action n'est executee depuis les chips ;
- aucune validation inbox n'est prise depuis la system bar ;
- aucune route backend, permission ou migration n'a ete ajoutee.

Limite assumee :

- `/ui-reset` n'a pas encore de login dedie ; le pont runtime est donc opportuniste et non bloquant ;
- l'integration dans le frontend runtime principal reste une vague separee ;
- l'orientation systeme reste P2.
