# Mapping contractuel — Shell/Dock vers contexte, loadout, actions et permissions

Date : 2026-07-31
Statut : mapping local, non implémenté
Round : `GIT-CONSOLIDATION-001`

## Autorité des données

`GET /api/v1/context/current` est la source primaire. Le backend :

- authentifie l'utilisateur ;
- résout la room et son instance ;
- dérive le loadout depuis le rôle, le contexte, les packs et les actions `live` ;
- filtre les personas et actions exposés ;
- renvoie un objet validé par `CurrentContextSchema`.

Le frontend projette ce snapshot. Il ne reconstruit ni les permissions ni le registre.

## Matrice Shell

| Bloc UI | Source | Champs | Autorité | État vide ou bloqué |
|---|---|---|---|---|
| identité visible | `CurrentContext` | `user.display_name`, `user.role` | backend | identité neutre, pas de permission inférée |
| ancrage | `CurrentContext` | `room`, `room_instance` | backend | état dégradé si aucune room accessible |
| modes visibles | `user_runtime_loadout` | `available_apps` | backend | Home minimale |
| ordre clavier | `user_runtime_loadout` | `active_mode_cycle` | backend | aucun cycle inventé |
| raccourcis | `user_runtime_loadout` | `available_shortcuts` | backend | raccourci absent = inactif |
| verrous | `user_runtime_loadout` | `locked_capabilities`, `disabled_reason_map` | backend | montrer seulement une raison explicite |
| personas affichables | `CurrentContext` | `personas` | backend | aucun avatar transformé en permission |

Règle : `available_apps` définit la visibilité. `active_mode_cycle` définit l'ordre de navigation,
pas une seconde liste de permissions.

## Matrice Command Dock

| Bloc UI | Source | Champs | Règle |
|---|---|---|---|
| suggestions initiales | `user_runtime_loadout` | `suggested_first_action_ids` | maximum trois |
| palette rapide | `user_runtime_loadout` | `quick_palette_action_ids` | maximum cinq |
| actions par défaut | `user_runtime_loadout` | `default_action_ids` | maximum cinq |
| lanceur créer | `user_runtime_loadout` | `create_launcher_action_ids` | bibliothèque ouverte explicitement |
| détails d'action | `CurrentContext` | `available_actions` | jointure par `action_id` |
| statut | `ActionRegistryEntry` | `status` | seul `live` peut être proposé par le loadout |
| risque | `ActionRegistryEntry` | `risk_level` | information, pas décision frontend |
| preflight | `ActionRegistryEntry` | `preflight_required` | futur geste séparé |
| validation | `ActionRegistryEntry` | `validation_required`, `validator_role` | jamais exécution directe |

La route `GET /actions/available` reste utile pour une future console explicative, mais pas pour les
suggestions P1 : elle renvoie le registre complet et n'est pas le loadout personnel.

## Matrice attention système

| Signal | Endpoint | Permission backend | Projection autorisée |
|---|---|---|---|
| jobs | `GET /jobs` | utilisateur authentifié, résultats scopés | compteur/état en lecture seule |
| Validation Inbox | `GET /validation-inbox` | teacher+ | compteur en lecture seule |
| orientation | `GET /experience/orientation` | diagnostic | hors P1, futur explicatif |

Pour un student, le futur frontend ne doit pas appeler Validation Inbox. Le rôle du snapshot peut
éviter la requête, mais le backend reste l'autorité et conserve son gate `teacher+`.

## État actuel du prototype

| Élément | État constaté | Décision |
|---|---|---|
| contexte | lecture opportuniste déjà présente | conserver comme preuve, ne pas étendre ici |
| jobs | lecture parallèle déjà présente | partiel autorisé |
| inbox | lecture tentée pour tous les rôles | corriger seulement dans une future tranche autorisée |
| suggestions | runtime si contexte disponible, fixtures sinon | acceptable en prototype explicitement dégradé |
| actions | aucune exécution depuis les chips | invariant à conserver |
| runtime final | non promu | nouvelle tranche et nouveau GO nécessaires |

## Frontières de permission

- `user.role` sert à l'affichage et à éviter une requête manifestement interdite ;
- la présence dans `available_actions` et dans les listes d'IDs du loadout décide de la projection ;
- `minimum_role` n'est pas réinterprété comme une permission locale ;
- `locked_capabilities` n'accorde rien : il explique une absence ;
- une fixture ne remplace jamais une réponse runtime dans une surface déclarée connectée ;
- `PERMISSION > CONTEXT_LOCK > SAFETY > OBJECT_TYPE > MATURITY > PREFERENCE` reste l'ordre
  d'autorité.

## Hors périmètre

- login dédié à `/ui-reset` ;
- création, preflight, validation ou exécution d'action ;
- décision Validation Inbox ;
- création, annulation ou retry de job ;
- Home runtime, Persona, Skilltree et verticales ;
- micro réel, voix, image, provider ou dépense ;
- modification d'asset, permission, endpoint, schéma ou seed.

## Revue attendue avant code

MALEX valide l'expérience et les états. Vincent valide que :

1. `available_apps` est bien la source unique de visibilité des modes ;
2. `CurrentContext.available_actions` est bien la source P1 du Dock ;
3. la requête Validation Inbox est conditionnée à `teacher+` ;
4. jobs restent un signal secondaire et scopé ;
5. aucun verrou affiché n'est inventé hors `disabled_reason_map` ou `locked_capabilities`.

## Critères de vérification futurs

- aucune liste fixe universelle ne réactive un mode absent ;
- aucune action hors loadout n'est visible comme active ;
- aucune suggestion ne déclenche d'effet ;
- une erreur inbox n'empêche pas le contexte de s'afficher ;
- un échec du contexte produit un état explicitement dégradé ;
- aucun fallback prototype n'est présenté comme vérité runtime.
