#!/usr/bin/env bash
# smoke-test.sh — vérifie une gateway installée : santé publique, gate /app/*,
# login admin (creds lus dans .env, JAMAIS affichés), assets préfixés, santé des targets.
# Usage : smoke-test.sh [BASE_URL]   (défaut http://localhost:3000)
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

BASE="${1:-http://localhost:3000}"
need_cmd curl || die "curl introuvable."
fail=0
pass() { printf '  %s %s\n' "$C_G✓$C_0" "$*"; }
bad()  { printf '  %s %s\n' "$C_R✗$C_0" "$*"; fail=1; }

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

log "Cible : $BASE"

# 1) santé publique
h="$(curl -s "$BASE/healthz" 2>/dev/null || true)"
case "$h" in *'"ok":true'*) pass "/healthz répond ok" ;; *) bad "/healthz muet ou inattendu" ;; esac

# 2) page de login servie
c="$(code "$BASE/login")"; [ "$c" = "200" ] && pass "/login (200)" || bad "/login = $c"

# 3) gate proxy : /app/pc/ non authentifié → 302 vers /login
c="$(code -o /dev/null "$BASE/app/pc/")"
[ "$c" = "302" ] && pass "/app/pc/ non authentifié → 302 (gate active)" || bad "/app/pc/ = $c (302 attendu)"

# 4) login admin + parcours authentifié
USER="$(grep -E '^ADMIN_USERNAME=' "$MANAGE_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2-)"
PASS="$(grep -E '^ADMIN_PASSWORD=' "$MANAGE_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2-)"
if [ -z "$USER" ] || [ -z "$PASS" ]; then
  warn "ADMIN_USERNAME/PASSWORD absents de .env — parcours authentifié sauté."
else
  JAR="$(mktemp)"; trap 'rm -f "$JAR" "$BODY"' EXIT; BODY="$(mktemp)"
  # JSON construit sans afficher le mot de passe.
  payload="$(printf '{"username":"%s","password":"%s"}' "$USER" "$PASS")"
  lc="$(printf '%s' "$payload" | curl -s -o "$BODY" -w '%{http_code}' -c "$JAR" \
        -H 'Content-Type: application/json' --data-binary @- "$BASE/api/v1/auth/login")"
  if [ "$lc" = "200" ]; then
    pass "login admin (200)"
    # /app/pc/ authentifié → 200 + assets préfixés /app/pc/
    ac="$(curl -s -b "$JAR" -o "$BODY" -w '%{http_code}' "$BASE/app/pc/")"
    if [ "$ac" = "200" ]; then
      grep -q '/app/pc/' "$BODY" && pass "/app/pc/ authentifié (200) + assets préfixés" \
        || bad "/app/pc/ (200) mais aucun chemin /app/pc/ dans le HTML (VITE_BASE_PATH ?)"
    else bad "/app/pc/ authentifié = $ac"; fi
    # santé des targets (admin)
    hb="$(curl -s -b "$JAR" "$BASE/api/v1/admin/health" 2>/dev/null || true)"
    up="$(printf '%s' "$hb" | grep -oE '"(ok|up|healthy)":true' | grep -c . || true)"
    [ -n "$hb" ] && pass "santé targets interrogée (${up} indicateur(s) up)" || warn "santé targets : réponse vide"
  else
    bad "login admin = $lc (creds .env ?)"
  fi
fi

echo
[ "$fail" = "0" ] && ok "Smoke-test OK." || die "Smoke-test : échecs ci-dessus."
