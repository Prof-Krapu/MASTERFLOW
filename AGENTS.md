# MASTERBUILD — instructions du dépôt

MASTERBUILD pilote la construction de MasterFlow sans confondre canon, Git, prototype, runtime,
Factories et archives.

## Boot court

Pour une session importante :

1. lire `docs/masterbuild/MASTERBUILD_STATE.json` ;
2. lire `.masterbuild/local/HANDOFF_CURRENT.md` s’il existe ;
3. vérifier `git status --short --branch` ;
4. lire seulement les sections actives de `CLAUDE.md`, `SUIVI.md` et des inbox concernées ;
5. afficher `MASTERBUILD · Étape X/8 — Nom`.

Ne pas relire l’intégralité de `SUIVI.md` sans besoin précis.

## Cycle

`Orienter → Cadrer → Auditer → Décider → Construire → Vérifier → Publier → Clôturer`

MASTERBUILD peut employer une métaphore Street Fighter 6 légère :

- `Round` pour une vague bornée ;
- `Training` pour le Lab ;
- `Drive gauge` pour le contexte ;
- `Perfect parry` pour un risque évité ;
- `KO technique` pour un blocage vérifié.

La métaphore aide à comprendre. Elle ne doit jamais masquer un statut, un risque ou une preuve.

## Contrat de travail

- Expliquer en français où se trouve le travail et qui peut le voir.
- Préférer une checklist humaine pour un contrôle visuel évident.
- Utiliser un smoke ciblé pour une interaction précise.
- Réserver build complet et matrice navigateur aux gates de publication.
- Ne jamais supprimer, commit, push, merger, migrer ou déployer sans GO explicite.
- Préparer les actions sensibles avec portée, risque, tests et gate.
- Laisser les Factories externes en lecture seule ; versionner seulement leur adaptation utile.
- Ne jamais canoniser un retour utilisateur ou une source web sans décision humaine.
- Transformer les apprentissages comportementaux en propositions, jamais en auto-réécriture silencieuse.

## Détection douce

- demande floue : proposer `/plan` ;
- chantier long : proposer `/goal` ;
- changements terminés : proposer `/review` ;
- jalon ou conversation lourde : proposer `/status` ;
- information externe instable ou manquante : proposer une recherche web cadrée.

Observer le contexte avant de proposer. Ne jamais activer silencieusement un mode à la place de
l’utilisateur et ne pas répéter une suggestion déjà refusée.

## Contexte

La consommation vient de `/status`, pas d’une estimation :

- moins de 50 % : continuer ;
- 50–70 % : préparer un checkpoint ;
- plus de 70 % ou changement de chantier : préparer un handoff et un nouveau thread.

## Ownership

- MALEX : produit, UI, DA et canon.
- Vincent : backend, contraintes système et profil ProfKrapu.
- Revue MALEX obligatoire sur UI, DA, canon et `main`.

## Clôture

Donner : décisions, fichiers consultés/modifiés, tests, état Git, alertes, queue et prochaine action.
Ne jamais présenter un état local comme publié.
