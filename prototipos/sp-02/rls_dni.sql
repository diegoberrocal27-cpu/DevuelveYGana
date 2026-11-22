-- SP-02 · Prueba de que el DNI protegido no se filtra por la base de datos, usando el esquema y las
-- reglas RLS de T-02 (hay que haber corrido las migraciones de T-02 y su seed antes).
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prototipos/sp-02/rls_dni.sql
-- Todo ocurre dentro de una transacción que se deshace al final.
\o /dev/null
begin;

create schema pruebas_dni;
grant usage on schema pruebas_dni to anon, authenticated, service_role;

create function pruebas_dni.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLÓ: %', msg; end if;
  raise notice 'OK: %', msg;
end $$;
create function pruebas_dni.niega(sentencia text) returns boolean language plpgsql as $$
begin execute sentencia; return false; exception when insufficient_privilege then return true; end $$;
create function pruebas_dni.cuenta(consulta text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || consulta || ') q' into n; return n; end $$;
create function pruebas_dni.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pruebas_dni.servidor() returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', '', true); execute 'set local role service_role'; end $$;
create function pruebas_dni.superusuario() returns void language plpgsql as $$ begin execute 'reset role'; end $$;

\set operador '''00000000-0000-4000-8000-000000000002'''
\set rosa     '''00000000-0000-4000-8000-000000000003'''
\set luis     '''00000000-0000-4000-8000-000000000004'''

-- Escenario: Luis perdió su DNI (guardado como HMAC, nunca el número) y Rosa lo encontró (el seed ya
-- trae el hallazgo de Rosa con ese mismo HMAC de ejemplo en hallazgos.dni_hmac).
select pruebas_dni.superusuario();
insert into public.perdidas (id, dueno_id, categoria, descripcion, fecha, distrito)
  values ('10000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000004', 'dni', 'DNI perdido', current_date, 'Ayacucho');
insert into public.rasgos_ocultos (perdida_id, tipo, valor_protegido) values
  ('10000000-0000-4000-8000-0000000000d1', 'dni_hmac',           'f00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeed'),
  ('10000000-0000-4000-8000-0000000000d1', 'fecha_emision_hmac', 'beefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef');

\echo '--- El HMAC del DNI de Luis no sale por el cliente ---'
select pruebas_dni.como(:rosa);   -- Rosa es quien encontró el DNI
select pruebas_dni.ok(pruebas_dni.cuenta($$select 1 from public.rasgos_ocultos where tipo in ('dni_hmac','fecha_emision_hmac')$$) = 0,
  'Rosa (quien halló el DNI) NO puede leer los rasgos protegidos del DNI de Luis');
select pruebas_dni.ok(pruebas_dni.cuenta($$select 1 from public.perdidas where categoria = 'dni'$$) = 0,
  'Rosa NO ve la pérdida de DNI de Luis');
select pruebas_dni.ok(pruebas_dni.niega('select dni_hmac from public.hallazgos'),
  'Nadie con sesión puede leer hallazgos.dni_hmac');

select pruebas_dni.como(:operador);
select pruebas_dni.ok(pruebas_dni.cuenta($$select 1 from public.rasgos_ocultos where tipo like '%hmac'$$) = 0,
  'El operador NO lee los HMAC de DNI');
select pruebas_dni.ok(pruebas_dni.niega('select dni_hmac from public.hallazgos'),
  'El operador NO lee hallazgos.dni_hmac');

select pruebas_dni.como(:luis);
select pruebas_dni.ok(pruebas_dni.cuenta($$select 1 from public.rasgos_ocultos where tipo = 'dni_hmac'$$) = 1,
  'Luis (el dueño) SÍ ve su propio HMAC de DNI');
select pruebas_dni.ok(pruebas_dni.niega($$insert into public.hallazgos (hallador_id, categoria, descripcion, dia, distrito, buena_fe_aceptada, dni_hmac)
  values (auth.uid(), 'dni', 'x', current_date, 'Ayacucho', true, 'abc')$$),
  'Nadie puede escribir dni_hmac desde el cliente (solo el servidor)');

select pruebas_dni.superusuario();
select pruebas_dni.ok(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'hallazgos_publicos' and column_name like '%dni%') = 0,
  'La vista pública del catálogo no tiene ninguna columna de DNI');

\echo '--- El servidor sí puede emparejar por igualdad de HMAC ---'
select pruebas_dni.servidor();
select pruebas_dni.ok(
  (select p.dueno_id::text
     from public.rasgos_ocultos r
     join public.perdidas p on p.id = r.perdida_id
     join public.hallazgos h on h.dni_hmac = r.valor_protegido
    where r.tipo = 'dni_hmac' and h.categoria = 'dni') = '00000000-0000-4000-8000-000000000004',
  'service_role empareja el DNI hallado por Rosa con la pérdida de Luis comparando HMAC (sin ver el número)');

rollback;
\echo 'PRUEBAS DE DNI CONTRA RLS DE T-02: TODAS PASARON'
