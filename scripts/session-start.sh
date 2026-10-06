#!/usr/bin/env bash
# Prepara una sesión de Claude Code (DEC-005, regla 4):
# dependencias → Docker → Supabase local → migraciones + seed → .env.local.
# Es idempotente: se puede ejecutar a mano las veces que haga falta.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}"
LOG="${TMPDIR:-/tmp}/sabor-session-start.log"
: >"$LOG"

say() { echo "[session-start] $*"; }
run() { "$@" >>"$LOG" 2>&1; }

# 1. Dependencias de npm (solo si faltan o cambió el lockfile).
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  say "Instalando dependencias (npm ci)…"
  run npm ci
fi

# 2. Docker. En la nube el daemon no arranca solo.
if ! docker info >/dev/null 2>&1; then
  if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && command -v dockerd >/dev/null; then
    say "Arrancando el daemon de Docker…"
    nohup dockerd >"${TMPDIR:-/tmp}/dockerd.log" 2>&1 &
    for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
  docker info >/dev/null 2>&1 || { say "ERROR: Docker no está disponible. Ver $LOG"; exit 1; }
fi

# 3. Supabase local. En la nube, ghcr.io y public.ecr.aws están bloqueados por
#    la red del entorno; Docker Hub sí responde (a veces con 429), así que se
#    fuerza ese registro y se reintenta.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  export SUPABASE_INTERNAL_IMAGE_REGISTRY="${SUPABASE_INTERNAL_IMAGE_REGISTRY:-docker.io}"
fi
if ! npx supabase status >/dev/null 2>&1; then
  say "Arrancando Supabase local…"
  for intento in 1 2 3; do
    if run npx supabase start; then break; fi
    if [ "$intento" = 3 ]; then say "ERROR: supabase start falló. Ver $LOG"; exit 1; fi
    say "supabase start falló (intento $intento); reintentando…"
    sleep $((intento * 10))
  done
fi

# 4. Base limpia: migraciones + seed.
say "Aplicando migraciones y seed (supabase db reset)…"
run npx supabase db reset || { say "ERROR: supabase db reset falló. Ver $LOG"; exit 1; }

# 5. Variables para Vite (solo valores locales, nunca de producción).
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=')"
cat >.env.local <<ENV
# Generado por scripts/session-start.sh — Supabase local.
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
ENV

# 6. Playwright: en la nube se usa el Chromium preinstalado.
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  echo "export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium" >>"$CLAUDE_ENV_FILE"
fi

say "Listo: Supabase local en $API_URL (log: $LOG)."
