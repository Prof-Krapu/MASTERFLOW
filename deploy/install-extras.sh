#!/usr/bin/env bash
# install-extras.sh — dépendances d'EXÉCUTION de la suite Correctors.
# Appelé par install-all.sh (étape 1bis) ou relançable seul :
#
#   deploy/install-extras.sh                     # interactif (propose chaque capacité)
#   deploy/install-extras.sh --yes               # tout installer sans demander
#   deploy/install-extras.sh --only latex,pandoc # sélection explicite, sans question
#   deploy/install-extras.sh --none              # ne rien installer, tout vérifier
#
# Quatre capacités, toutes REFUSABLES et jamais bloquantes — le cœur de la suite
# (correction, OCR, dashboard, chat) n'en dépend pas :
#
#   1. LaTeX (latexmk + XeLaTeX + styles) → rendu TeX → PDF de l'assistant
#   2. pandoc >= 2.15                     → rendu DOCX + éditeur Word (--sandbox)
#   3. SearXNG (conteneur Docker)         → recherche web de l'assistant
#   4. tailscale                          → exposition HTTPS (Funnel)
#
# Idempotent : ce qui est déjà présent n'est pas réinstallé, mais reste VÉRIFIÉ —
# une compilation XeLaTeX d'essai et un aller-retour pandoc réel, parce que
# « le binaire répond » ne prouve ni que la distribution TeX est complète, ni
# que pandoc est assez récent.
#
# PIÈGES connus :
# - Sonde figée : latex-routes.ts met en cache le résultat de sa sonde
#   latexmk/pandoc à vie du process. Après ajout de ces binaires sur une machine
#   où les services tournent DÉJÀ : systemctl --user restart 'corrector-*'
#   (mode complet) ou systemctl --user restart corrector-manage (mode économe).
# - pandoc trop ancien : /api/latex/health ne teste que la PRÉSENCE du binaire
#   et renvoie html:true. L'onglet Word s'affiche donc côté client puis échoue
#   au premier clic si --sandbox est inconnu. D'où la vérification par usage.
#
# Le mode économe (défaut) sert ces capacités : depuis server/routes/fork-api.ts,
# la gateway porte elle-même /api/latex/* et /api/search. Ce n'était pas le cas
# avant — ces routes tombaient alors dans le repli SPA (200 text/html), d'où
# l'ancien avertissement « exige le mode complet », désormais caduc.
set -uo pipefail   # PAS de -e : chaque étape est best-effort (|| warn), jamais fatale.
DEPLOY_DIR_BOOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$DEPLOY_DIR_BOOT/lib.sh"
. "$DEPLOY_DIR_BOOT/tui.sh"

while [ $# -gt 0 ]; do
  case "$1" in
    --yes) ASSUME_YES=1; shift ;;
    --only) EXTRAS_CHOIX="$2"; shift 2 ;;
    --only=*) EXTRAS_CHOIX="${1#*=}"; shift ;;
    --none) EXTRAS_CHOIX=""; shift ;;
    -h|--help) sed -n '2,36p' "$0"; exit 0 ;;
    *) die "install-extras.sh : argument inconnu $1" ;;
  esac
done
export ASSUME_YES

# `veut <clé> "<question>"` — la sélection prime sur la question.
#
# Quand install-all.sh a présenté son menu à cases, il exporte EXTRAS_CHOIX : on
# ne repose PAS la question, sinon l'utilisateur répondrait deux fois la même
# chose. EXTRAS_CHOIX vide et DÉFINI signifie « rien retenu » — d'où le test
# `${EXTRAS_CHOIX+x}` sur la définition, et non sur le contenu.
# Sans EXTRAS_CHOIX (script lancé seul), on retombe sur `confirm`.
veut() {
  local cle="$1" question="$2"
  if [ -n "${EXTRAS_CHOIX+x}" ]; then
    case ",${EXTRAS_CHOIX}," in *",$cle,"*) return 0 ;; *) return 1 ;; esac
  fi
  confirm "$question"
}

detect_pkg
NEW_LATEX=0 NEW_PANDOC=0

# --- Helpers -------------------------------------------------------------------
# searxng_up : 0 si un SearXNG répond sur le port attendu par les forks.
searxng_up() {
  need_cmd curl || return 1
  curl -sf --max-time 2 -o /dev/null http://127.0.0.1:8888/ 2>/dev/null
}

# verify_latex : vérifie que les 24 paquets de la liste blanche latex-routes.ts
# (ALLOWED_PACKAGES) sont bien trouvés par kpsewhich — preuve indépendante de la
# distro que l'installation couvre le périmètre de compilation de l'assistant.
# La liste doit rester alignée sur ALLOWED_PACKAGES : un paquet autorisé mais
# absent d'ici passerait la vérification et échouerait à la première copie.
verify_latex() {
  need_cmd kpsewhich || return 0
  local missing="" f
  for f in fontspec.sty polyglossia.sty geometry.sty amsmath.sty amssymb.sty \
           amsfonts.sty mathtools.sty siunitx.sty mhchem.sty chemfig.sty \
           tikz.sty pgfplots.sty enumitem.sty booktabs.sty tcolorbox.sty \
           fancyhdr.sty graphicx.sty xcolor.sty array.sty multirow.sty \
           multicol.sty caption.sty float.sty exam.cls; do
    kpsewhich "$f" >/dev/null 2>&1 || missing="$missing $f"
  done
  if [ -n "$missing" ]; then
    warn "Styles LaTeX introuvables :$missing — complétez l'installation TeX."
  else
    ok "Styles LaTeX vérifiés (24 entrées de la liste blanche présentes)."
  fi
}

# verify_latex_compile : preuve par l'usage. kpsewhich prouve que les fichiers
# de style existent, pas que XeLaTeX aboutit — polices manquantes, cache
# fontconfig vide ou mhchem incompatible ne se voient qu'à la compilation.
# Document représentatif du périmètre réel (~3 s sur la machine de dev).
LATEX_COMPILE_OK=0
verify_latex_compile() {
  need_cmd latexmk && need_cmd xelatex || return 0
  local d; d="$(mktemp -d)" || return 0
  cat > "$d/probe.tex" <<'TEX'
\documentclass[12pt,a4paper]{article}
\usepackage{fontspec}\usepackage{polyglossia}\setdefaultlanguage{french}
\usepackage{amsmath,amssymb,amsfonts,mathtools}
\usepackage{siunitx}\usepackage[version=4]{mhchem}\usepackage{chemfig}
\usepackage{tikz}\usepackage{pgfplots}\usepackage{tcolorbox}
\usepackage{enumitem,booktabs,fancyhdr,graphicx,xcolor,array,multirow,multicol,caption,float,geometry}
\begin{document}
\SI{9.81}{\meter\per\second\squared} \ce{H2O} $\frac{1}{2}$
\begin{tcolorbox}essai\end{tcolorbox}
\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}
\end{document}
TEX
  local run="latexmk"
  need_cmd timeout && run="timeout 180 latexmk"   # 1re compilation : cache de polices à construire
  if ( cd "$d" && $run -xelatex -interaction=nonstopmode -halt-on-error probe.tex >/dev/null 2>&1 ) \
     && [ -s "$d/probe.pdf" ]; then
    LATEX_COMPILE_OK=1
    ok "Compilation LaTeX vérifiée : XeLaTeX produit un PDF avec toute la liste blanche."
  else
    warn "XeLaTeX est installé mais la compilation d'essai échoue — l'aperçu PDF sera KO."
    warn "Diagnostic : cd $d && latexmk -xelatex probe.tex   (log probe.log) — répertoire conservé."
    return 0   # répertoire volontairement NON supprimé pour le diagnostic
  fi
  rm -rf "$d"
}

# verify_pandoc : preuve par l'usage, indispensable depuis l'éditeur Word.
# Les routes /html et /docx-from-html passent --sandbox à pandoc (barrière
# anti-SSRF, cf. latex-routes.ts) ; l'option n'existe qu'à partir de pandoc
# 2.15. Un pandoc plus ancien satisfait pourtant la sonde du serveur —
# /api/latex/health ne teste que la PRÉSENCE du binaire et renvoie html:true —
# donc le client affiche l'onglet Word, qui échoue au premier clic.
#
# ATTENTION : `pandoc --sandbox --version` ne prouve RIEN. pandoc traite
# --version avant d'analyser le reste et sort 0 même sur une option inconnue
# (mesuré). Seule une vraie conversion tranche.
PANDOC_SANDBOX=0
verify_pandoc() {
  need_cmd pandoc || return 0
  local d; d="$(mktemp -d)" || return 0
  printf '\\documentclass{article}\\begin{document}Essai $E=mc^2$\\end{document}\n' > "$d/probe.tex"
  if pandoc "$d/probe.tex" -f latex -t html5 --mathml --sandbox -o "$d/probe.html" 2>/dev/null \
     && grep -q '<math' "$d/probe.html" 2>/dev/null \
     && pandoc "$d/probe.html" -f html -t docx --sandbox -o "$d/probe.docx" 2>/dev/null \
     && [ -s "$d/probe.docx" ]; then
    PANDOC_SANDBOX=1
    ok "pandoc vérifié : MathML et --sandbox acceptés (éditeur Word opérationnel)."
  else
    warn "pandoc présent ($(pandoc --version 2>/dev/null | head -1)) mais l'aller-retour"
    warn "--mathml/--sandbox échoue : l'ÉDITEUR WORD de l'assistant ne fonctionnera pas."
    warn "L'export DOCX simple, lui, reste bon. Il faut pandoc >= 2.15 :"
    warn "  https://github.com/jgm/pandoc/releases (paquet .deb / .rpm), puis"
    warn "  systemctl --user restart 'corrector-*'"
  fi
  rm -rf "$d"
}

# install_latex_brew : BasicTeX (~100 Mo) + collections via tlmgr — bien plus
# léger que MacTeX. Best-effort comme tout le chemin macOS de la suite.
install_latex_brew() {
  pkg_install --cask basictex || return 1
  export PATH="$PATH:/Library/TeX/texbin"
  if ! need_cmd tlmgr; then
    warn "tlmgr introuvable — ouvrez une nouvelle session (PATH /Library/TeX/texbin) puis relancez."
    return 1
  fi
  $SUDO tlmgr update --self && $SUDO tlmgr install latexmk collection-xetex \
    collection-latexrecommended collection-latexextra collection-pictures \
    collection-science collection-langfrench collection-fontsrecommended
  warn "macOS : les LaunchAgents n'héritent pas de /Library/TeX/texbin — ajoutez-le au PATH de l'unité si besoin."
}

# install_latex_pkgs : paquets TeX par gestionnaire. Couvre la liste blanche :
# fontspec/polyglossia (xetex + lang-french), geometry/amsmath/mathtools (base +
# recommended), siunitx/mhchem/chemfig (science), tikz/pgfplots (pictures),
# enumitem/booktabs/tcolorbox/fancyhdr/multirow/caption/float/exam (recommended +
# extra), Latin Modern (fonts-recommended).
install_latex_pkgs() {
  case "$PKG_MGR" in
    apt-get) pkg_install latexmk texlive-xetex texlive-latex-recommended \
               texlive-latex-extra texlive-pictures texlive-science \
               texlive-lang-french texlive-fonts-recommended ;;
    dnf|yum) pkg_install texlive-latexmk texlive-collection-xetex \
               texlive-collection-latexrecommended texlive-collection-latexextra \
               texlive-collection-pictures texlive-collection-science \
               texlive-collection-langfrench texlive-collection-fontsrecommended ;;
    pacman)  pkg_install texlive-binextra texlive-xetex texlive-latexrecommended \
               texlive-latexextra texlive-pictures texlive-mathscience \
               texlive-langeuropean texlive-fontsrecommended ;;
    zypper)  pkg_install texlive-latexmk texlive-collection-xetex \
               texlive-collection-latexrecommended texlive-collection-latexextra \
               texlive-collection-pictures texlive-collection-science \
               texlive-collection-langfrench texlive-collection-fontsrecommended ;;
    brew)    install_latex_brew ;;
    *)       return 1 ;;
  esac
}

# install_searxng : Docker (paquet OS) + conteneur searxng/searxng sur
# 127.0.0.1:8888 + activation du format JSON exigé par les forks. Best-effort :
# toute erreur se solde par un warn avec la marche à suivre manuelle.
install_searxng() {
  # 1. Docker lui-même.
  if ! need_cmd docker; then
    if [ -z "$PKG_MGR" ]; then
      warn "Docker absent et aucun gestionnaire de paquets — SearXNG non installé."
      return 1
    fi
    local pkg="docker"
    [ "$PKG_MGR" = "apt-get" ] && pkg="docker.io"
    [ "$PKG_MGR" = "brew" ] && pkg="--cask docker"
    # shellcheck disable=SC2086
    pkg_install $pkg || { warn "Docker non installé — SearXNG abandonné."; return 1; }
    if need_cmd systemctl; then $SUDO systemctl enable --now docker >/dev/null 2>&1 || true; fi
  fi
  # 2. Daemon joignable ? (groupe docker, sinon sudo, sinon abandon)
  local DOCKER="docker"
  if ! docker info >/dev/null 2>&1; then
    if [ -n "$SUDO" ] && $SUDO docker info >/dev/null 2>&1; then
      DOCKER="$SUDO docker"
    else
      warn "Le daemon Docker ne répond pas (lancé ? groupe docker ?) — SearXNG abandonné."
      [ "$DEPLOY_OS" = "darwin" ] && warn "macOS : ouvrez Docker.app puis relancez install-extras.sh."
      return 1
    fi
  fi
  # 3. Conteneur : démarrer l'existant ou le créer.
  if $DOCKER ps -a --format '{{.Names}}' 2>/dev/null | grep -qx searxng; then
    $DOCKER start searxng >/dev/null || { warn "Impossible de démarrer le conteneur searxng."; return 1; }
    ok "Conteneur searxng existant démarré."
  else
    $DOCKER run -d --name searxng --restart unless-stopped \
      -p 127.0.0.1:8888:8080 -v searxng-data:/etc/searxng searxng/searxng >/dev/null \
      || { warn "docker run searxng a échoué."; return 1; }
    ok "Conteneur searxng créé (127.0.0.1:8888)."
  fi
  # 4. Format JSON (search.formats) — les forks en ont besoin. Best-effort :
  #    sed des deux formes usuelles, sinon ajout d'un bloc search.formats.
  sleep 3
  local mp="" yml=""
  mp="$($DOCKER volume inspect -f '{{.Mountpoint}}' searxng-data 2>/dev/null || true)"
  [ -n "$mp" ] && yml="$mp/settings.yml"
  if [ -n "$yml" ] && $SUDO test -f "$yml"; then
    if ! $SUDO grep -q 'json' "$yml" 2>/dev/null; then
      $SUDO sed -i -e 's/^\([[:space:]]*formats:[[:space:]]*\)\[html\][[:space:]]*$/\1[html, json]/' \
                   -e 's/^\([[:space:]]*\)#[[:space:]]*-[[:space:]]*json[[:space:]]*$/\1- json/' \
                   "$yml" 2>/dev/null || true
      if ! $SUDO grep -q 'json' "$yml" 2>/dev/null; then
        printf '\nsearch:\n  formats:\n    - html\n    - json\n' | $SUDO tee -a "$yml" >/dev/null || true
      fi
      $DOCKER restart searxng >/dev/null 2>&1 || true
      sleep 2
    fi
  fi
  # 5. Vérification honnête : une requête JSON doit passer.
  if searxng_up && curl -sf --max-time 5 'http://127.0.0.1:8888/search?q=ping&format=json' 2>/dev/null | grep -q '"results"'; then
    ok "SearXNG opérationnel (format JSON actif)."
  else
    warn "SearXNG lancé mais JSON non vérifié — dans settings.yml du volume searxng-data,"
    warn "ajoutez « search: formats: [html, json] » puis : $DOCKER restart searxng"
  fi
}

tui_section "Capacités d'exécution"
log "Refusables : correction, OCR, dashboard et chat fonctionnent sans elles."

# --- 1) LaTeX : aperçu PDF (latexmk + XeLaTeX + styles) -------------------------
if need_cmd latexmk && need_cmd xelatex; then
  # Présent ≠ complet : une install partielle (sans texlive-science, par exemple)
  # passe cette porte et échoue à la première copie. On vérifie quand même.
  ok "LaTeX déjà présent (latexmk, xelatex)."
  verify_latex
  verify_latex_compile
elif [ -z "$PKG_MGR" ]; then
  warn "latexmk/xelatex absents et aucun gestionnaire de paquets — installez TeX Live à la main."
elif veut latex "Installer LaTeX pour le rendu PDF de l'assistant ? (latexmk + XeLaTeX + styles, ~1,5 Go)"; then
  if install_latex_pkgs && need_cmd latexmk && need_cmd xelatex; then
    ok "LaTeX installé."
    NEW_LATEX=1
    verify_latex
    verify_latex_compile
  else
    warn "Installation LaTeX incomplète — aperçu PDF désactivé (repli géré : .tex / Overleaf)."
  fi
else
  log "LaTeX refusé — aperçu PDF désactivé (repli : téléchargement .tex / Overleaf)."
fi

# --- 2) pandoc : export DOCX ----------------------------------------------------
if need_cmd pandoc; then
  ok "pandoc déjà présent."
  verify_pandoc
elif [ -n "$PKG_MGR" ] && veut pandoc "Installer pandoc pour le rendu DOCX et l'éditeur Word ?"; then
  if pkg_install pandoc && need_cmd pandoc; then
    ok "pandoc installé."
    NEW_PANDOC=1
    verify_pandoc
  else
    warn "pandoc non installé — export DOCX désactivé (bouton masqué côté client)."
  fi
else
  log "pandoc refusé — export DOCX désactivé."
fi

# --- 3) SearXNG : recherche web de l'assistant (conteneur Docker) ---------------
if searxng_up; then
  ok "SearXNG déjà joignable (127.0.0.1:8888) — étape sautée."
elif [ "$DEPLOY_OS" = "darwin" ]; then
  warn "SearXNG (macOS) : ouvrez Docker Desktop puis :"
  warn "  docker run -d --name searxng --restart unless-stopped -p 127.0.0.1:8888:8080 -v searxng-data:/etc/searxng searxng/searxng"
elif veut searxng "Installer SearXNG pour la recherche web de l'assistant ? (Docker + conteneur sur 127.0.0.1:8888)"; then
  install_searxng || true
else
  log "SearXNG refusé — recherche web désactivée (toggle « Web » masqué côté client)."
fi

# --- 4) tailscale : exposition HTTPS (Funnel) -----------------------------------
if need_cmd tailscale; then
  ok "tailscale déjà présent — étape sautée."
elif [ "$DEPLOY_OS" = "darwin" ]; then
  if [ "$PKG_MGR" = "brew" ] && veut tailscale "Installer tailscale (exposition HTTPS via Funnel) ?"; then
    { pkg_install --cask tailscale-app || pkg_install --cask tailscale; } \
      && ok "tailscale installé — ouvrez l'app et connectez le tailnet." \
      || warn "tailscale non installé."
  else
    log "tailscale refusé — la suite restera joignable en local seulement."
  fi
elif [ -n "$PKG_MGR" ] && veut tailscale "Installer tailscale (exposition HTTPS via Funnel) ?"; then
  if need_cmd curl && curl -fsSL https://tailscale.com/install.sh | $SUDO sh; then
    ok "tailscale installé."
  else
    warn "tailscale non installé — exposition impossible (usage local uniquement)."
  fi
else
  log "tailscale refusé — la suite restera joignable en local seulement."
fi

# --- Récap + rappels ------------------------------------------------------------
echo
# Capacités RÉELLES, pas « le binaire existe » : une distribution TeX
# incomplète ou un pandoc trop ancien répondent présents et échouent à l'usage.
CAP_PDF="non"  ; if [ "$LATEX_COMPILE_OK" = "1" ]; then CAP_PDF="oui"; fi
CAP_DOCX="non" ; if need_cmd pandoc; then CAP_DOCX="oui"; fi
# Éditeur Word = /html + /docx-from-html, qui exigent --sandbox : distinct de
# l'export DOCX, qui se contente de n'importe quel pandoc.
CAP_WORD="non" ; if [ "$PANDOC_SANDBOX" = "1" ]; then CAP_WORD="oui"; fi
CAP_WEB="non"  ; if searxng_up; then CAP_WEB="oui"; fi
CAP_EXPO="non" ; if need_cmd tailscale; then CAP_EXPO="oui"; fi
printf '%s== Capacités assistant ==%s PDF %s · DOCX %s · Éditeur Word %s · Web %s · Expo %s\n' \
  "$C_B" "$C_0" "$CAP_PDF" "$CAP_DOCX" "$CAP_WORD" "$CAP_WEB" "$CAP_EXPO"

# Transmission à install-all.sh : lui ne peut que re-sonder la présence des
# binaires, ce qui mentirait sur un TeX incomplet ou un pandoc trop ancien.
if [ -n "${EXTRAS_CAPS_FILE:-}" ]; then
  printf 'PDF=%s\nDOCX=%s\nWORD=%s\nWEB=%s\nEXPO=%s\n' \
    "$CAP_PDF" "$CAP_DOCX" "$CAP_WORD" "$CAP_WEB" "$CAP_EXPO" > "$EXTRAS_CAPS_FILE" 2>/dev/null || true
fi

# Sonde figée : n'a de sens que si des services tournent déjà (run standalone).
if { [ "$NEW_LATEX" = "1" ] || [ "$NEW_PANDOC" = "1" ]; } && need_cmd systemctl \
   && systemctl --user is-active --quiet corrector-manage 2>/dev/null; then
  warn "latexmk/pandoc ajoutés alors que les services tournent : la sonde des forks est figée au démarrage."
  warn "Redémarrez : systemctl --user restart 'corrector-*'"
fi
if [ "$CAP_EXPO" = "oui" ]; then
  log "Exposition : tailscale up  puis  tailscale funnel --bg --https=443 http://localhost:3000"
fi
exit 0
