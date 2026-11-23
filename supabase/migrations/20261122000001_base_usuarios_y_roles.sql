-- T-02 · Migración 1 de 4: tipos, tabla usuarios, roles y funciones de apoyo.
-- Pensada para Supabase (PostgreSQL). Se puede correr desde cero en un proyecto nuevo.

-- Tipos
create type public.rol_usuario as enum ('usuario', 'operador', 'admin');

-- Las 4 categorías del R1 (HU-02): DNI, cartera, celular, laptop.
create type public.categoria_objeto as enum ('celular', 'laptop', 'cartera', 'dni');

create type public.estado_perdida as enum ('activa', 'emparejada', 'en_entrega', 'cerrada', 'vencida');
create type public.estado_hallazgo as enum ('publicado', 'emparejado', 'en_entrega', 'cerrado', 'vencido');

-- Usuarios (perfil de la app; la autenticación vive en auth.users de Supabase)
create table public.usuarios (
  id          uuid primary key references auth.users (id) on delete cascade,
  celular     text unique check (celular ~ '^9[0-9]{8}$'),   -- celular peruano de 9 dígitos
  correo      text unique,
  distrito    text,
  verificado  boolean not null default false,                -- celular verificado (HU-01)
  rol         public.rol_usuario not null default 'usuario',
  bloqueado   boolean not null default false,
  creado_en   timestamptz not null default now()
);

comment on table public.usuarios is 'Perfil de cada persona. rol, verificado y bloqueado solo los cambia el servidor.';

-- Funciones de apoyo para las políticas RLS
-- security definer: leen usuarios sin pasar por sus propias reglas (evita recursión).
create function public.usuario_activo()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and not u.bloqueado
  );
$$;

create function public.es_operador_o_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and not u.bloqueado and u.rol in ('operador', 'admin')
  );
$$;

create function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and not u.bloqueado and u.rol = 'admin'
  );
$$;

revoke all on function public.usuario_activo(), public.es_operador_o_admin(), public.es_admin() from public;
grant execute on function public.usuario_activo(), public.es_operador_o_admin(), public.es_admin()
  to authenticated, service_role;

-- Al crear una cuenta en Supabase Auth se crea su perfil automáticamente.
-- Tolerante: si el celular no tiene el formato esperado, queda en null y el registro no falla.
create function public.crear_perfil_usuario()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, correo, celular)
  values (
    new.id,
    new.email,
    case when new.phone ~ '9[0-9]{8}$' then right(new.phone, 9) end
  );
  return new;
end;
$$;

create trigger al_crear_cuenta
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();

-- Mantiene actualizado_en en las tablas que lo usen.
create function public.tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;
