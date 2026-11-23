#!/usr/bin/env bash
# Prueba T-02 en un PostgreSQL común y VACÍO (sin Supabase):
#   DATABASE_URL=postgres://usuario@localhost:5432/prueba_vacia ./supabase/tests/correr_pruebas.sh
# Pasos: simulador de Supabase -> migraciones desde cero -> seed -> pruebas RLS ->
#        migración posterior de ejemplo -> pruebas RLS otra vez.
# En el proyecto real de Supabase usa `supabase db reset` (corre migraciones + seed) y luego solo el paso de pruebas.
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL apuntando a una base de datos vacía}"
cd "$(dirname "$0")/.."   # carpeta supabase/
psql_() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

echo "== Simulador de Supabase (solo para Postgres común)"
psql_ -f tests/simulador_supabase_local.sql
echo "== Migraciones desde cero"
for f in migrations/*.sql; do echo "   $f"; psql_ -f "$f"; done
echo "== Seed"
psql_ -f seed.sql
echo "== Pruebas RLS"
psql_ -f tests/rls.sql
echo "== Migración posterior de ejemplo (pagos) + pruebas otra vez"
psql_ -f tests/migracion_posterior_ejemplo.sql
psql_ -f tests/rls.sql
