#!/usr/bin/env bash
# Escribe .env.local con la URL y la llave anon de Supabase LOCAL.
# Lo usan scripts/session-start.sh y CI. Nunca contiene llaves de producción.
set -euo pipefail
cd "$(dirname "$0")/.."

eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=')"
: "${API_URL:?Supabase local no está corriendo}"
cat >.env.local <<ENV
# Generado por scripts/write-env.sh — Supabase local.
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
ENV
