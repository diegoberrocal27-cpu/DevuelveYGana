-- Simula una migración de un sprint futuro (pagos) para comprobar que agregar tablas nuevas
-- no rompe lo anterior. Solo se usa en las pruebas; NO es parte de las migraciones reales.
create table public.pagos_ejemplo (
  id          uuid primary key default gen_random_uuid(),
  perdida_id  uuid not null references public.perdidas (id),
  monto       numeric(10, 2) not null
);
alter table public.pagos_ejemplo enable row level security;
revoke all on public.pagos_ejemplo from anon, authenticated;
