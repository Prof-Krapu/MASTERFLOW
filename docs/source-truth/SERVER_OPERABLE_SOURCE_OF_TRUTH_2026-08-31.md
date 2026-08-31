# MasterFlow — Le serveur comme source de vérité opérable

Date de décision : 2026-08-31

Statut : actif après la dernière fusion de transition

Décision MALEX : GitHub est mis en pause. La preview privée active sur Malex Graphics devient la
vérité opérationnelle de ce qui existe réellement dans MasterFlow. Le clone local reste l'atelier de
construction. GitHub peut conserver un miroir historique, mais ne pilote plus le travail courant.

## Hiérarchie active

1. **Serveur actif** : release pointée par
   `/Users/alexcoulot/Playground/MASTERFLOW_SERVER/releases/preview/current`, services réellement
   démarrés et données persistantes dans `shared/preview`.
2. **Clone local MALEX** : code, tests, contrats, queue et prochains snapshots. Une modification
   locale reste candidate tant qu'elle n'est pas promue sur le serveur.
3. **Canon produit et décisions MALEX** : ils cadrent ce qui doit être construit, mais une promesse
   n'est pas déclarée disponible tant que le serveur ne la prouve pas.
4. **GitHub** : miroir en pause au dernier SHA de transition. Aucun fetch, push, PR ou merge courant
   sans décision explicite de réactivation.
5. **Drive, Factories, archives et legacy** : sources candidates ou historiques ; jamais runtime
   automatique.

La vérité serveur ne transforme pas les données runtime en canon produit. Elle dit uniquement ce
qui est réellement disponible. Une décision produit conserve son statut explicite jusqu'à
validation MALEX.

## Baseline vérifiée au moment de la décision

- hôte : `malex-graphics` / `Malex-Graphics.local` ;
- racine : `/Users/alexcoulot/Playground/MASTERFLOW_SERVER` ;
- canal : `preview` privé, Tailscale uniquement ;
- pointeur actif : `releases/preview/current` ;
- release active : `releases/preview/33f553fb8bbd` ;
- backend, frontend et export runner : actifs ;
- endpoint local serveur : `http://127.0.0.1:8080/health` ;
- provider : `mock` ;
- stable : absente ;
- GitHub au dernier merge de transition : `3d91c0a1ba0a89a11be1c7ad8343fab957b31f0a` ;
- écart assumé : la nouvelle interface pilotes est dans le clone et le miroir GitHub, mais pas dans
  la release serveur active. Elle reste donc candidate tant qu'un déploiement n'est pas validé.

## Preuve minimale de vérité serveur

Avant tout diagnostic ou reprise importante :

```bash
npm run server:preflight
```

La preuve doit contenir :

- cible SSH attendue ;
- chemin exact du pointeur `current` ;
- identifiant de release actif ;
- réponse health valide ;
- état des trois conteneurs preview ;
- date du contrôle.

Ne jamais lire ni afficher les fichiers `.env`, credentials bootstrap, tokens, clés, mots de passe
ou URL ICS sécurisées.

## Cycle de changement sans GitHub

```txt
décision MALEX
→ branche et commits dans le clone local
→ tests, lint, build et recette locale
→ snapshot immuable + manifeste + checksums
→ backup serveur préalable
→ copie dans MASTERFLOW_SERVER/incoming
→ vérification du snapshot
→ installation dans releases/preview/<release_id>
→ bascule atomique du pointeur current
→ smoke HTTPS, WebSocket et permissions
→ reçu de déploiement local + serveur
```

GitHub ne fait plus partie de ce cycle. Les commits locaux restent utiles pour l'historique et les
identifiants de snapshot, mais un commit local n'est pas une preuve live.

## Règles de mutation serveur

- ne jamais éditer une release active à la main ;
- ne jamais travailler directement dans `releases/preview/current` ;
- toute nouvelle version passe par `incoming`, une release immuable et une bascule atomique ;
- les données persistantes restent hors release dans `shared/preview` ;
- backup et rollback sont obligatoires avant migration ou changement de données ;
- déploiement, migration, provider, dépense, suppression et stable exigent toujours un GO séparé ;
- si le serveur est indisponible, déclarer la vérité courante inconnue plutôt que promouvoir le
  clone local par défaut.

## Manifeste obligatoire à partir de la prochaine release

La baseline `33f553fb8bbd` ne contient pas de manifeste embarqué détectable. Elle reste acceptée car
le pointeur, le health, les conteneurs et les preuves de déploiement sont concordants.

La prochaine release doit embarquer un manifeste non secret avec au minimum :

- `release_id` ;
- `built_from_local_commit` ;
- `source_tree_sha256` ;
- `created_at` ;
- `channel` ;
- `seed_profile` ;
- `provider_mode` ;
- résultats tests/lint/build ;
- schéma et migrations attendus ;
- identifiant du backup préalable ;
- procédure de rollback.

## GitHub en pause

Le dernier geste GitHub autorisé est la fusion de cette transition de gouvernance. Après ce merge :

- ne plus utiliser GitHub comme préflight obligatoire ;
- ne plus ouvrir de PR automatiquement ;
- ne plus pousser le travail courant ;
- ne pas supprimer le remote ni les branches historiques ;
- réactiver GitHub uniquement sur une nouvelle décision explicite de MALEX.
