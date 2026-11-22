-- Pruebas de seguridad de T-02. Se corren con el seed cargado y todo dentro de una transacción
-- que se deshace al final (no deja datos). Cada línea imprime "OK: ..." o aborta con "FALLÓ: ...".
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql

\o /dev/null
begin;

create schema pruebas;
grant usage on schema pruebas to anon, authenticated, service_role;

create function pruebas.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLÓ: %', msg; end if;
  raise notice 'OK: %', msg;
end $$;

-- Ejecuta una sentencia con el rol actual y dice si termina en "permiso denegado / RLS" (42501).
create function pruebas.niega(sentencia text) returns boolean language plpgsql as $$
begin
  execute sentencia;
  return false;
exception when insufficient_privilege then
  return true;
end $$;

create function pruebas.cuenta(consulta text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'select count(*) from (' || consulta || ') q' into n;
  return n;
end $$;

-- Cambia a "iniciar sesión como" una persona (o anónimo). pruebas.servidor() vuelve al superusuario.
create function pruebas.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pruebas.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end $$;
create function pruebas.como_servidor() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role service_role';
end $$;
create function pruebas.superusuario() returns void language plpgsql as $$
begin execute 'reset role'; end $$;

-- Personas del seed
\set admin    '''00000000-0000-4000-8000-000000000001'''
\set operador '''00000000-0000-4000-8000-000000000002'''
\set rosa     '''00000000-0000-4000-8000-000000000003'''
\set luis     '''00000000-0000-4000-8000-000000000004'''
\set bloqueado '''00000000-0000-4000-8000-000000000005'''

\echo '--- Rasgos ocultos: solo el dueño ---'
select pruebas.como(:rosa);
select pruebas.ok(pruebas.cuenta('select 1 from public.rasgos_ocultos') = 4,
  'Rosa ve solo los 4 rasgos de sus 2 pérdidas');
select pruebas.ok(pruebas.cuenta($$select 1 from public.rasgos_ocultos where perdida_id = '10000000-0000-4000-8000-000000000003'$$) = 0,
  'Rosa NO ve los rasgos ocultos de la laptop de Luis');
select pruebas.ok(pruebas.niega($$insert into public.rasgos_ocultos (perdida_id, tipo, valor_protegido)
  values ('10000000-0000-4000-8000-000000000003', 'serie', 'x')$$),
  'Rosa NO puede agregar rasgos a la pérdida de Luis');
select pruebas.ok(pruebas.cuenta($$select 1 from public.perdidas where dueno_id <> auth.uid()$$) = 0,
  'Rosa NO ve pérdidas ajenas');

select pruebas.como(:luis);
select pruebas.ok(pruebas.cuenta('select 1 from public.rasgos_ocultos') = 2,
  'Luis ve solo los 2 rasgos de su pérdida');

select pruebas.como(:operador);
select pruebas.ok(pruebas.cuenta('select 1 from public.rasgos_ocultos') = 0,
  'El operador NO lee rasgos ocultos desde el cliente');
select pruebas.ok(pruebas.cuenta('select 1 from public.perdidas') = 3,
  'El operador sí ve todas las pérdidas (sin sus rasgos)');
select pruebas.como(:admin);
select pruebas.ok(pruebas.cuenta('select 1 from public.rasgos_ocultos') = 0,
  'El admin NO lee rasgos ocultos desde el cliente');

select pruebas.anonimo();
select pruebas.ok(pruebas.niega('select * from public.rasgos_ocultos'), 'Sin sesión: rasgos ocultos denegados');
select pruebas.ok(pruebas.niega('select * from public.perdidas'),       'Sin sesión: pérdidas denegadas');
select pruebas.ok(pruebas.niega('select * from public.usuarios'),       'Sin sesión: usuarios denegados');
select pruebas.ok(pruebas.niega('select * from public.hallazgos_publicos'), 'Sin sesión: catálogo requiere cuenta');

\echo '--- Hallazgos: foto original y datos del hallador ---'
select pruebas.como(:rosa);
select pruebas.ok(pruebas.niega('select foto_original_path from public.hallazgos'),
  'Rosa NO puede leer la foto original de un hallazgo');
select pruebas.ok(pruebas.niega('select * from public.hallazgos'),
  'select * sobre hallazgos se deniega (hay columnas privadas)');
select pruebas.ok(pruebas.niega('select hallador_id from public.hallazgos'),
  'Rosa NO puede ver quién es el hallador');
select pruebas.ok(pruebas.niega('select dni_hmac from public.hallazgos'),
  'Rosa NO puede leer el HMAC del DNI hallado');
select pruebas.ok(pruebas.niega('select descripcion from public.hallazgos'),
  'El público NO ve la descripción del hallazgo (solo categoría, distrito y día)');
select pruebas.ok(pruebas.niega('select foto_difuminada_path from public.hallazgos'),
  'El cliente NO obtiene ni la foto difuminada (la entrega el servidor al dueño emparejado)');
select pruebas.ok(pruebas.cuenta('select id, categoria, distrito, dia from public.hallazgos') = 3,
  'Catálogo: Rosa ve los 3 hallazgos publicados (categoría, distrito, día)');
select pruebas.ok(pruebas.cuenta('select 1 from public.hallazgos_publicos') = 3,
  'La vista hallazgos_publicos funciona para usuarios con sesión');

select pruebas.como(:luis);
select pruebas.ok(pruebas.niega('select foto_original_path from public.hallazgos'),
  'Ni siquiera el hallador lee la foto original desde el cliente');

select pruebas.superusuario();
select pruebas.ok(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'hallazgos_publicos'
      and column_name in ('descripcion','marca','color','latitud','longitud','hallador_id',
                          'foto_original_path','foto_difuminada_path','dni_hmac')) = 0,
  'La vista pública no contiene columnas sensibles');

\echo '--- Escrituras ---'
select pruebas.como(:rosa);
select pruebas.ok(pruebas.niega($$update public.usuarios set rol = 'admin' where id = auth.uid()$$),
  'Rosa NO puede subirse el rol a admin');
select pruebas.ok(pruebas.niega($$update public.usuarios set verificado = true where id = auth.uid()$$),
  'Rosa NO puede marcarse como verificada por su cuenta');
select pruebas.ok(pruebas.niega($$update public.usuarios set bloqueado = false where id = auth.uid()$$),
  'Rosa NO puede desbloquearse');
select pruebas.ok(pruebas.niega($$insert into public.perdidas (dueno_id, categoria, descripcion, fecha, distrito)
  values ('00000000-0000-4000-8000-000000000004', 'celular', 'x', current_date, 'Ayacucho')$$),
  'Rosa NO puede registrar una pérdida a nombre de Luis');
select pruebas.ok(pruebas.niega($$update public.perdidas set estado = 'cerrada' where dueno_id = auth.uid()$$),
  'Rosa NO puede cambiar el estado de su pérdida (lo hace el servidor)');
select pruebas.ok(pruebas.niega($$insert into public.hallazgos (hallador_id, categoria, descripcion, dia, distrito, buena_fe_aceptada)
  values (auth.uid(), 'celular', 'x', current_date, 'Ayacucho', false)$$),
  'No se puede publicar un hallazgo sin la declaración de buena fe');
select pruebas.ok(pruebas.niega($$insert into public.hallazgos (hallador_id, categoria, descripcion, dia, distrito, buena_fe_aceptada, dni_hmac)
  values (auth.uid(), 'dni', 'x', current_date, 'Ayacucho', true, 'abc')$$),
  'El cliente NO puede escribir dni_hmac (lo escribe el servidor)');
select pruebas.ok(pruebas.niega($$insert into public.eventos (accion) values ('falsa')$$),
  'Rosa NO puede escribir eventos (solo el servidor)');
select pruebas.ok(pruebas.cuenta('select 1 from public.eventos') = 0,
  'Rosa NO lee eventos');

-- Lo que sí debe poder hacer
insert into public.perdidas (dueno_id, categoria, descripcion, fecha, distrito)
  values (auth.uid(), 'laptop', 'Laptop de prueba', current_date, 'Ayacucho');
select pruebas.ok(pruebas.cuenta($$select 1 from public.perdidas where descripcion = 'Laptop de prueba'$$) = 1,
  'Rosa SÍ puede registrar su propia pérdida');
insert into public.hallazgos (hallador_id, categoria, descripcion, dia, distrito, buena_fe_aceptada)
  values (auth.uid(), 'laptop', 'Hallazgo de prueba', current_date, 'Ayacucho', true);
select pruebas.ok(pruebas.cuenta($$select 1 from public.hallazgos where categoria = 'laptop'$$) = 1,
  'Rosa SÍ puede publicar un hallazgo con buena fe');
update public.usuarios set distrito = 'Jesús Nazareno' where id = auth.uid();
select pruebas.ok(pruebas.cuenta($$select 1 from public.usuarios where distrito = 'Jesús Nazareno'$$) = 1,
  'Rosa SÍ puede cambiar su distrito');

select pruebas.como(:operador);
select pruebas.ok(pruebas.cuenta('select 1 from public.eventos') >= 4, 'El operador SÍ lee los eventos');
select pruebas.ok(pruebas.niega('delete from public.eventos'), 'Los eventos no se pueden borrar desde el cliente');
select pruebas.ok(pruebas.niega($$update public.perdidas set estado = 'cerrada'$$),
  'El operador NO modifica pérdidas desde el cliente');
select pruebas.ok(pruebas.cuenta('select 1 from public.usuarios') = 5, 'El operador ve a todos los usuarios');

select pruebas.como(:rosa);
select pruebas.ok(pruebas.cuenta('select 1 from public.usuarios') = 1, 'Rosa ve solo su propio perfil');

\echo '--- Cuenta bloqueada ---'
select pruebas.como(:bloqueado);
select pruebas.ok(pruebas.niega($$insert into public.perdidas (dueno_id, categoria, descripcion, fecha, distrito)
  values (auth.uid(), 'celular', 'x', current_date, 'Ayacucho')$$),
  'Una cuenta bloqueada NO puede registrar pérdidas');
select pruebas.ok(pruebas.cuenta('select id from public.hallazgos') = 0,
  'Una cuenta bloqueada NO ve el catálogo');

\echo '--- Fotos privadas (Storage) ---'
select pruebas.superusuario();
insert into storage.objects (bucket_id, name) values
  ('fotos-originales',  'luis/h1-original.jpg'),
  ('fotos-difuminadas', 'luis/h1-difuminada.jpg');
select pruebas.ok((select count(*) from storage.buckets where id in ('fotos-originales','fotos-difuminadas') and not public) = 2,
  'Los dos buckets existen y son privados');
select pruebas.ok(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and (qual ilike '%fotos-originales%' or qual ilike '%fotos-difuminadas%'
          or with_check ilike '%fotos-originales%' or with_check ilike '%fotos-difuminadas%')) = 0,
  'Ninguna política de Storage abre las fotos a anon/authenticated');
select pruebas.como(:luis);
select pruebas.ok(pruebas.cuenta($$select 1 from storage.objects where bucket_id = 'fotos-originales'$$) = 0,
  'Luis (el hallador) NO ve la foto original desde el cliente');
select pruebas.ok(pruebas.cuenta($$select 1 from storage.objects where bucket_id = 'fotos-difuminadas'$$) = 0,
  'Un usuario NO ve fotos difuminadas desde el cliente (las entrega el servidor)');
select pruebas.anonimo();
select pruebas.ok(pruebas.cuenta('select 1 from storage.objects') = 0, 'Sin sesión: ningún objeto de Storage');

\echo '--- El servidor sí accede a todo ---'
select pruebas.como_servidor();
select pruebas.ok(pruebas.cuenta('select 1 from public.rasgos_ocultos') = 6, 'service_role lee los rasgos ocultos');
select pruebas.ok(pruebas.cuenta('select foto_original_path from public.hallazgos where foto_original_path is not null') >= 3,
  'service_role lee las fotos originales');
select pruebas.ok(pruebas.cuenta($$select 1 from storage.objects where bucket_id = 'fotos-originales'$$) = 1,
  'service_role accede al bucket privado');
insert into public.eventos (accion, distrito) values ('prueba_servidor', 'Ayacucho');
select pruebas.ok(pruebas.cuenta($$select 1 from public.eventos where accion = 'prueba_servidor'$$) = 1,
  'service_role escribe eventos');

\echo '--- Alta de cuenta ---'
select pruebas.superusuario();
insert into auth.users (id, email, phone) values ('00000000-0000-4000-8000-0000000000aa', 'nueva@ejemplo.test', '51988877766');
select pruebas.ok((select celular from public.usuarios where id = '00000000-0000-4000-8000-0000000000aa') = '988877766'
  and (select rol from public.usuarios where id = '00000000-0000-4000-8000-0000000000aa') = 'usuario',
  'Al crear la cuenta se crea su perfil (rol usuario, celular de 9 dígitos)');
insert into auth.users (id, email, phone) values ('00000000-0000-4000-8000-0000000000ab', 'sincel@ejemplo.test', null);
select pruebas.ok((select celular from public.usuarios where id = '00000000-0000-4000-8000-0000000000ab') is null,
  'Una cuenta sin celular igual se registra (celular null)');

rollback;
\echo 'TODAS LAS PRUEBAS PASARON'
