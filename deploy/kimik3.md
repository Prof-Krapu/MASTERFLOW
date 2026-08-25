# kimik3.md — handoff session 2026-07-31 : installation clé en main (dépendances d'exécution)

> Pour les futurs agents. Contexte transverse : `~/Documents/AGENTS.md` ; guide déploiement : `deploy/README-DEPLOY.md`.

## Demande

L'installation en une ligne (`deploy/install-all.sh`) n'installait que git/Node/npm/build-tools.
Or les forks appellent **à l'exécution** des binaires système — `latexmk -xelatex …`
(aperçu PDF de l'assistant) et `pandoc …` (export DOCX) via `execFile` dans
`latex-routes.ts` — absents d'une machine neuve. Objectif : que l'installateur
**propose tout** pour un fonctionnement complet clé en main.

## Ce qui a été fait (2026-07-31)

1. **Nouveau `deploy/install-extras.sh`** (exécutable, standalone, `--yes` supporté).
   Quatre capacités, toutes refusables et jamais bloquantes (pas de `die`, `set -uo pipefail`
   sans `-e`, `|| warn` partout) :
   - **LaTeX** : paquets par gestionnaire (apt/dnf/yum/pacman/zypper/brew BasicTeX+tlmgr).
     Le set apt : `latexmk texlive-xetex texlive-latex-recommended texlive-latex-extra
     texlive-pictures texlive-science texlive-lang-french texlive-fonts-recommended` (~1,5 Go).
     **Vérif `kpsewhich`** sur les styles/classes de la liste blanche `ALLOWED_PACKAGES`
     de `latex-routes.ts` → preuve indépendante de la distro.
   - **pandoc** : paquet `pandoc` partout.
   - **SearXNG** : `docker.io`/`docker` + conteneur `searxng/searxng` sur `127.0.0.1:8888`
     + activation **best-effort** du format JSON (sed de `settings.yml` dans le volume,
     repli : bloc `search.formats` ajouté) + **vérif par requête réelle**
     (`/search?q=ping&format=json`). Fallback honnête avec marche à suivre manuelle.
   - **tailscale** : script officiel `tailscale.com/install.sh` (cohérent avec NodeSource
     déjà utilisé) ; jamais de `tailscale up` (login interactif) — rappel affiché.
   - Idempotent : chaque capacité déjà présente est sautée (`need_cmd` / sonde curl).
2. **`install-all.sh`** : flag `--no-extras` ; étape **1bis** après les build-tools ;
   **garde mode léger** (voir piège ci-dessous) ; récap final « Capacités : PDF · DOCX · Web ».
3. **Docs** : `deploy/README-DEPLOY.md` (§2 tableau + pièges, §3 options, §3bis « Ce qui
   est perdu », §4 table des scripts, §9 dépannage PDF/DOCX/Web, §11 checklist),
   `API_manage/README.md` (section extras + **correction du mensonge « aucune
   fonctionnalité » perdue** en mode light + 2ᵉ cas d'usage du mode complet),
   `~/Documents/AGENTS.md` (section Déploiement), `API_corrector/README.md`
   (commande apt complète). Le README des 10 autres forks ne mentionne toujours pas
   ces deps — non propagé (hors scope, le sujet vit côté gateway/deploy).

## Décisions à conserver

- **Extras proposés, pas imposés** : `confirm()` interactif (défaut non, ~1,5 Go pour
  TeX) ; `--yes` installe tout (esprit clé en main non interactif). `--no-extras` saute.
- **Pas de texlive-full** (3,2 Go sur la machine de prod) : set minimal couvrant
  exactement la liste blanche de compilation.
- **SearXNG = conteneur** (pas de paquet pip/OS) : aligné sur la prod existante.
- **Rien de commité** : tout commit `API_*` déclenche l'autopush vers corrector.git —
  laisser l'utilisateur relire/committer.

## Pièges (vérifiés dans le code)

- **Mode `--light` = pas de routes backend des forks** (`API_manage/server/routes/proxy.ts:169-214`) :
  la gateway ne sert que les `dist/`. `/api/latex/*` et `/api/search/*` n'y répondent
  pas → aperçu PDF/DOCX et recherche web **morts en mode léger**, binaires installés
  ou non (le client masque les boutons via l'échec du health). `install-all.sh`
  détecte « light + outils présents » et propose de basculer en mode complet ;
  avec `--yes --light` : choix respecté + warning. Décision utilisateur : avertir,
  **pas** dupliquer `latex-routes.ts` dans la gateway (code sensible, risque de drift).
- **Sonde figée** : `latex-routes.ts` cache `probePromise` à vie du process → après
  ajout de `latexmk`/`pandoc` sur une machine déjà servie :
  `systemctl --user restart 'corrector-*'` (rappel affiché par le script en run standalone).
- ~~**Fork PC divergent** : `API_corrector/latex-routes.ts` a 2 routes en plus
  (`/html`, `/docx-from-html`)~~ — **PLUS VRAI depuis le 2026-08-01** : `/html` et
  `/docx-from-html` sont propagées et commitées dans **les 11 forks** (vérifié).
  `latex-routes.ts` est de nouveau identique partout.
- **`confirm()` lit `/dev/tty`** : un test non interactif (CI, agent) auto-décline avec
  warning — normal, pas un bug.

## État de vérification

- `bash -n` OK sur les deux scripts ; shellcheck absent de la machine (à lancer si dispo).
- Run sur la machine de prod (tout déjà installé) : 4 capacités sautées proprement,
  récap correct, exit 0 — **idempotence prouvée**.
- `kpsewhich` : tous les styles trouvés ici.
- **Non testé** : installation réelle sur machine vierge (apt réel), chemins
  pacman/zypper/dnf/brew (noms de paquets best-effort — la vérif `kpsewhich` est le
  filet), activation JSON SearXNG de bout en bout, bascule light→complet interactive.

---

## Revue du 2026-08-01 (après le chantier éditeur de document)

Relecture du script contre le code d'aujourd'hui. **Trois écarts corrigés :**

1. **La liste blanche a 24 entrées, pas 23** : `amsfonts` était dans
   `ALLOWED_PACKAGES` mais absent de la boucle `kpsewhich` — il n'était donc jamais
   vérifié (le commentaire du script disait déjà 24, la boucle en listait 23).
2. **`pandoc` n'était vérifié que par sa présence.** Les routes `/html` et
   `/docx-from-html` de l'éditeur Word passent `--sandbox`, qui n'existe qu'à partir
   de **pandoc 2.15**. Or `/api/latex/health` renvoie `html: tools.docx`, c'est-à-dire
   « le binaire existe » : sur une distro à pandoc 2.9, le client affiche l'onglet
   Word et il échoue au premier clic. Ajout de `verify_pandoc()` — un aller-retour
   réel `latex → html5 --mathml --sandbox → docx`.
   **Piège mesuré** : `pandoc --sandbox --version` **sort 0 même sur une option
   inconnue** (`--version` court-circuite l'analyse). La sonde naïve par `--version`
   aurait validé n'importe quel pandoc. Seule une vraie conversion tranche.
3. **`kpsewhich` ne prouve pas qu'on sait compiler** (polices, cache fontconfig,
   mhchem incompatible). Ajout de `verify_latex_compile()` : une compilation XeLaTeX
   d'essai chargeant toute la liste blanche, ~3 s mesurées. En cas d'échec le
   répertoire temporaire est **conservé** et le chemin du `probe.log` affiché.

**Deux changements de comportement :**

- Les vérifications tournent aussi quand l'outil est **déjà présent** (avant, la
  branche « déjà présent » ne vérifiait rien — une install TeX partielle passait).
- Le récap annonce des capacités **mesurées**, plus des binaires présents, et
  distingue **DOCX** (n'importe quel pandoc) de **Éditeur Word** (`--sandbox`).
  `install-extras.sh` écrit son verdict dans `$EXTRAS_CAPS_FILE` quand la variable
  est posée ; `install-all.sh` la pose et lit ce fichier pour son récap final,
  au lieu de re-sonder plus faiblement dans son propre process.

Chemins d'échec testés avec des stubs (`pandoc` refusant `--sandbox`, `latexmk`
en erreur) : les deux avertissent avec la marche à suivre et le récap bascule en
`PDF non` / `Éditeur Word non`. Run réel sur la machine : tout à `oui`, exit 0.

## Reste à faire (idées, non demandé)

- Tester sur VM/conteneur vierge : `CORRECTORS_PARENT=/tmp/essai deploy/install-all.sh --only pc --no-services` puis `deploy/install-extras.sh`.
- Propager la note « deps assistant » aux README des 10 autres forks si souhaité.
- Si le mode léger doit un jour servir PDF/DOCX : la gateway devra enregistrer elle-même
  les routes latex (duplication à assumer, ou extraction d'un paquet partagé).
- **Correctif côté serveur, non fait** : `/api/latex/health` pourrait renvoyer
  `html: false` quand `--sandbox` est refusé, pour que le client masque l'onglet Word
  au lieu de le laisser échouer. Touche les 11 forks → à décider séparément.
