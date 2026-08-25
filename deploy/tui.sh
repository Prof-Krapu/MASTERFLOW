#!/usr/bin/env bash
# tui.sh — interface en terminal de l'installateur (bannière, étapes, cases à
# cocher, barre de progression, récapitulatif). Sourcé par install-all.sh APRÈS
# lib.sh, dont il réutilise les couleurs et `confirm`.
#
# Compatible bash 3.2 (macOS) comme le reste de deploy/ : pas de `declare -A`,
# pas de `mapfile`, pas de `${var,,}`, pas de `read -i`.
#
# ─── Deux interrupteurs distincts, volontairement séparés ─────────────────────
#
#   TUI_AFFICHE    : dessiner (bannière, étapes, barre). Demande un stdout tty.
#   TUI_INTERACTIF : demander (menu à cases). Demande EN PLUS un /dev/tty
#                    lisible et l'absence de --yes.
#
# La séparation compte : `install-all.sh --yes` dans un terminal doit continuer
# d'afficher joliment sa progression sans jamais bloquer sur une question. À
# l'inverse, une sortie redirigée vers un fichier ne doit contenir aucune
# séquence d'échappement.
#
# NO_TUI=1 force le mode texte simple (utile pour un journal, ou pour déboguer).

# --- Détection ---------------------------------------------------------------
# ÉVALUÉE À CHAQUE APPEL, jamais figée au chargement : les scripts sourcent cette
# bibliothèque AVANT d'analyser leurs arguments, donc ASSUME_YES vaut encore 0 ici.
# Une détection figée faisait afficher le menu interactif malgré `--yes`, et
# l'installation restait bloquée sur une touche qui ne venait jamais (constaté).
tui_affiche() {
  [ "${NO_TUI:-0}" != "1" ] && [ -t 1 ] && [ "${TERM:-dumb}" != "dumb" ]
}
tui_interactif() {
  tui_affiche || return 1
  [ "${ASSUME_YES:-0}" != "1" ] || return 1
  { true >/dev/tty; } 2>/dev/null && [ -r /dev/tty ]
}

# Largeur utile, bornée : au-delà de 100 colonnes les encadrés deviennent illisibles.
tui_largeur() {
  local c=""
  c="$(tput cols 2>/dev/null || echo 80)"
  case "$c" in ''|*[!0-9]*) c=80 ;; esac
  [ "$c" -gt 100 ] && c=100
  [ "$c" -lt 40 ] && c=40
  printf '%s' "$c"
}

# Jeu de caractères : le cadre en UTF-8 seulement si la locale le permet, sinon
# ASCII. Un terminal en latin-1 afficherait des mojibake sur toute la hauteur.
case "${LC_ALL:-${LC_CTYPE:-${LANG:-}}}" in
  *UTF-8*|*utf8*|*UTF8*)
    TUI_H="─"; TUI_V="│"; TUI_TL="╭"; TUI_TR="╮"; TUI_BL="╰"; TUI_BR="╯"
    TUI_ML="├"; TUI_MR="┤"
    TUI_OK="✓"; TUI_KO="✗"; TUI_SKIP="·"; TUI_COCHE="◉"; TUI_VIDE="○"; TUI_FLECHE="›"
    TUI_PLEIN="█"; TUI_CREUX="░"
    ;;
  *)
    TUI_H="-"; TUI_V="|"; TUI_TL="+"; TUI_TR="+"; TUI_BL="+"; TUI_BR="+"
    TUI_ML="+"; TUI_MR="+"
    TUI_OK="OK"; TUI_KO="X"; TUI_SKIP="-"; TUI_COCHE="[x]"; TUI_VIDE="[ ]"; TUI_FLECHE=">"
    TUI_PLEIN="#"; TUI_CREUX="."
    ;;
esac

# Répète un motif n fois (pas de `printf %*s` avec des caractères multi-octets :
# printf compte les OCTETS, le cadre serait tronqué en UTF-8).
tui_repeter() {
  local motif="$1" n="$2" out="" i=0
  while [ "$i" -lt "$n" ]; do out="$out$motif"; i=$((i + 1)); done
  printf '%s' "$out"
}

# Longueur en CARACTÈRES d'une chaîne (et non en octets) — indispensable pour
# aligner un cadre autour de libellés accentués.
tui_longueur() {
  local s="$1"
  # ${#s} compte les caractères dès lors que la locale est correcte ; on force
  # une locale UTF-8 le temps du calcul si besoin.
  printf '%s' "${#s}"
}

# tui_pad "texte" largeur → EXACTEMENT `largeur` caractères : complété d'espaces
# s'il est trop court, TRONQUÉ avec une ellipse s'il est trop long. La troncature
# n'est pas cosmétique : sans elle, un chemin un peu long (le « git -C … pull »
# du récapitulatif, par exemple) poussait la bordure droite hors du cadre.
tui_pad() {
  local texte="$1" cible="$2" n
  n=$(tui_longueur "$texte")
  if [ "$n" -eq "$cible" ]; then printf '%s' "$texte"; return; fi
  if [ "$n" -gt "$cible" ]; then
    [ "$cible" -le 1 ] && { printf '%s' "${texte:0:$cible}"; return; }
    printf '%s…' "${texte:0:$((cible - 1))}"
    return
  fi
  printf '%s%s' "$texte" "$(tui_repeter ' ' $((cible - n)))"
}

# --- Bannière ----------------------------------------------------------------
tui_banniere() {
  local titre="$1" sous="$2" l int
  if ! tui_affiche; then
    printf '== %s ==\n%s\n\n' "$titre" "$sous"
    return
  fi
  l=$(tui_largeur); int=$((l - 2))
  printf '\n%s%s%s%s%s\n' "$C_B" "$TUI_TL" "$(tui_repeter "$TUI_H" "$int")" "$TUI_TR" "$C_0"
  printf '%s%s%s %s %s%s\n' "$C_B" "$TUI_V" "$C_0" "$(tui_pad "$titre" $((int - 2)))" "$C_B$TUI_V" "$C_0"
  printf '%s%s%s %s %s%s\n' "$C_B" "$TUI_V" "$C_D" "$(tui_pad "$sous" $((int - 2)))" "$C_0$C_B$TUI_V" "$C_0"
  printf '%s%s%s%s%s\n\n' "$C_B" "$TUI_BL" "$(tui_repeter "$TUI_H" "$int")" "$TUI_BR" "$C_0"
}

tui_section() {
  if ! tui_affiche; then log "$1"; return; fi
  printf '\n%s%s %s%s\n' "$C_B" "$TUI_FLECHE" "$1" "$C_0"
}

# --- Étapes ------------------------------------------------------------------
# tui_etape "libellé" ok|ko|skip|info ["détail"]
tui_etape() {
  local libelle="$1" etat="$2" detail="${3:-}" sym coul
  case "$etat" in
    ok)   sym="$TUI_OK";   coul="$C_G" ;;
    ko)   sym="$TUI_KO";   coul="$C_R" ;;
    skip) sym="$TUI_SKIP"; coul="$C_D" ;;
    *)    sym="$TUI_FLECHE"; coul="$C_0" ;;
  esac
  if ! tui_affiche; then
    printf '[deploy] %s %s%s\n' "$libelle" "$etat" "${detail:+ — $detail}"
    return
  fi
  printf '  %s%s%s %s' "$coul" "$sym" "$C_0" "$(tui_pad "$libelle" 42)"
  [ -n "$detail" ] && printf '%s%s%s' "$C_D" "$detail" "$C_0"
  printf '\n'
}

# --- Barre de progression ----------------------------------------------------
# tui_progression courant total "libellé"
tui_progression() {
  local courant="$1" total="$2" libelle="$3" l largeur remplis pct
  [ "$total" -le 0 ] && total=1
  pct=$((courant * 100 / total))
  if ! tui_affiche; then
    printf '[deploy] (%s/%s) %s\n' "$courant" "$total" "$libelle"
    return
  fi
  l=$(tui_largeur); largeur=$((l - 34))
  [ "$largeur" -lt 10 ] && largeur=10
  remplis=$((pct * largeur / 100))
  printf '\r  %s%s%s%s %3s%%  %s' \
    "$C_G" "$(tui_repeter "$TUI_PLEIN" "$remplis")" "$C_0" \
    "$(tui_repeter "$TUI_CREUX" $((largeur - remplis)))" "$pct" "$(tui_pad "$libelle" 24)"
  [ "$courant" -ge "$total" ] && printf '\n'
}

# --- Menu à cases cochables --------------------------------------------------
# Entrées : TUI_CASES_LIBELLES / TUI_CASES_DETAILS / TUI_CASES_ETATS (0|1).
# Sortie  : TUI_CASES_ETATS mis à jour. Retourne 1 si l'utilisateur annule.
#
# Sans terminal interactif, le menu n'est PAS affiché : on garde les valeurs par
# défaut et on les journalise, pour qu'un run --yes reste lisible et reproductible.
tui_cases() {
  local titre="$1" n=${#TUI_CASES_LIBELLES[@]} curseur=0 i touche reste

  if ! tui_interactif; then
    tui_section "$titre"
    i=0
    while [ "$i" -lt "$n" ]; do
      if [ "${TUI_CASES_ETATS[$i]}" = "1" ]; then
        tui_etape "${TUI_CASES_LIBELLES[$i]}" ok "retenu par défaut"
      else
        tui_etape "${TUI_CASES_LIBELLES[$i]}" skip "non retenu"
      fi
      i=$((i + 1))
    done
    return 0
  fi

  printf '\n%s%s %s%s\n' "$C_B" "$TUI_FLECHE" "$titre" "$C_0" > /dev/tty
  printf '%s   ↑/↓ déplacer · espace cocher · a tout · n rien · entrée valider%s\n\n' \
    "$C_D" "$C_0" > /dev/tty

  printf '\033[?25l' > /dev/tty                       # curseur masqué
  # Le curseur DOIT être rendu même sur Ctrl-C, sinon le terminal reste aveugle.
  trap 'printf "\033[?25h" > /dev/tty' EXIT INT TERM

  while :; do
    i=0
    while [ "$i" -lt "$n" ]; do
      local marque="$TUI_VIDE" coul="$C_0" pointeur="  "
      [ "${TUI_CASES_ETATS[$i]}" = "1" ] && { marque="$TUI_COCHE"; coul="$C_G"; }
      [ "$i" = "$curseur" ] && pointeur="$C_B$TUI_FLECHE$C_0 "
      printf '  %s%s%s%s %s  %s%s%s\n' \
        "$pointeur" "$coul" "$marque" "$C_0" \
        "$(tui_pad "${TUI_CASES_LIBELLES[$i]}" 34)" \
        "$C_D" "${TUI_CASES_DETAILS[$i]}" "$C_0" > /dev/tty
      i=$((i + 1))
    done

    IFS= read -rsn1 touche < /dev/tty || touche=""
    case "$touche" in
      '')  break ;;                                    # entrée
      ' ') if [ "${TUI_CASES_ETATS[$curseur]}" = "1" ]; then
             TUI_CASES_ETATS[$curseur]=0
           else
             TUI_CASES_ETATS[$curseur]=1
           fi ;;
      a|A) i=0; while [ "$i" -lt "$n" ]; do TUI_CASES_ETATS[$i]=1; i=$((i + 1)); done ;;
      n|N) i=0; while [ "$i" -lt "$n" ]; do TUI_CASES_ETATS[$i]=0; i=$((i + 1)); done ;;
      j)   curseur=$(( (curseur + 1) % n )) ;;
      k)   curseur=$(( (curseur - 1 + n) % n )) ;;
      $'\033')
        # Séquence de flèche : \033[A / \033[B. Le -t 0.01 distingue une vraie
        # flèche d'un appui sur Échap seul (qui annule).
        if IFS= read -rsn2 -t 0.01 reste < /dev/tty; then
          case "$reste" in
            '[A') curseur=$(( (curseur - 1 + n) % n )) ;;
            '[B') curseur=$(( (curseur + 1) % n )) ;;
          esac
        else
          printf '\033[?25h' > /dev/tty; trap - EXIT INT TERM
          printf '%s  (annulé)%s\n' "$C_Y" "$C_0" > /dev/tty
          return 1
        fi ;;
    esac
    printf '\033[%sA' "$n" > /dev/tty                  # remonter pour redessiner
  done

  printf '\033[?25h' > /dev/tty
  trap - EXIT INT TERM
  printf '\n' > /dev/tty
  return 0
}

# --- Récapitulatif -----------------------------------------------------------
# tui_recap_debut "titre" ; tui_recap_ligne "clé" "valeur" ; tui_recap_fin
TUI_RECAP_L=0
tui_recap_debut() {
  if ! tui_affiche; then printf '\n== %s ==\n' "$1"; return; fi
  TUI_RECAP_L=$(tui_largeur)
  printf '\n%s%s%s%s%s\n' "$C_B" "$TUI_TL" "$(tui_repeter "$TUI_H" $((TUI_RECAP_L - 2)))" "$TUI_TR" "$C_0"
  printf '%s%s%s %s %s%s\n' "$C_B" "$TUI_V" "$C_0" "$(tui_pad "$1" $((TUI_RECAP_L - 4)))" "$C_B$TUI_V" "$C_0"
  printf '%s%s%s%s%s\n' "$C_B" "$TUI_ML" "$(tui_repeter "$TUI_H" $((TUI_RECAP_L - 2)))" "$TUI_MR" "$C_0"
}
# Largeur visible d'une ligne = V + espace + clé(14) + valeur(W) + espace + V,
# soit W + 18. La valeur se cale donc sur (largeur - 18), pas (largeur - 20) :
# l'écart se voyait comme une bordure droite désalignée sous le cadre.
tui_recap_ligne() {
  if ! tui_affiche; then printf '  %-14s %s\n' "$1" "$2"; return; fi
  printf '%s%s%s %s%s %s%s\n' "$C_B" "$TUI_V" "$C_0" \
    "$(tui_pad "$1" 14)" "$(tui_pad "$2" $((TUI_RECAP_L - 18)))" "$C_B$TUI_V" "$C_0"
}
tui_recap_fin() {
  tui_affiche || { printf '\n'; return; }
  printf '%s%s%s%s%s\n\n' "$C_B" "$TUI_BL" "$(tui_repeter "$TUI_H" $((TUI_RECAP_L - 2)))" "$TUI_BR" "$C_0"
}
