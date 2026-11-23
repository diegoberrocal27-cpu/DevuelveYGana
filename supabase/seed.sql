-- Datos de prueba para desarrollar sin datos reales. Todo es inventado.
-- Se corre con `supabase db reset` (o a mano como superusuario). Contraseña de todas las cuentas: Prueba123!
-- UUIDs fijos para que las pruebas y el equipo los puedan referenciar.

insert into auth.users (id, instance_id, aud, role, email, phone, encrypted_password,
                        email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       v.email, v.phone, extensions.crypt('Prueba123!', extensions.gen_salt('bf')),
       now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
from (values
  ('00000000-0000-4000-8000-000000000001', 'admin@ejemplo.test',     '51900000001'),
  ('00000000-0000-4000-8000-000000000002', 'operador@ejemplo.test',  '51900000002'),
  ('00000000-0000-4000-8000-000000000003', 'rosa@ejemplo.test',      '51900000003'),
  ('00000000-0000-4000-8000-000000000004', 'luis@ejemplo.test',      '51900000004'),
  ('00000000-0000-4000-8000-000000000005', 'bloqueado@ejemplo.test', '51900000005')
) as v(id, email, phone)
on conflict (id) do nothing;
-- (el trigger al_crear_cuenta ya creó la fila en public.usuarios de cada una)

update public.usuarios set rol = 'admin',    verificado = true, distrito = 'Ayacucho'            where id = '00000000-0000-4000-8000-000000000001';
update public.usuarios set rol = 'operador', verificado = true, distrito = 'Ayacucho'            where id = '00000000-0000-4000-8000-000000000002';
update public.usuarios set                   verificado = true, distrito = 'San Juan Bautista'   where id = '00000000-0000-4000-8000-000000000003';
update public.usuarios set                   verificado = true, distrito = 'Carmen Alto'         where id = '00000000-0000-4000-8000-000000000004';
update public.usuarios set                   verificado = true, bloqueado = true                 where id = '00000000-0000-4000-8000-000000000005';

-- Pérdidas: Rosa perdió un celular y una cartera; Luis perdió una laptop.
insert into public.perdidas (id, dueno_id, categoria, descripcion, marca, color, latitud, longitud, fecha, distrito) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'celular', 'Celular con la pantalla rayada en una esquina', 'Samsung', 'azul',  -13.158800, -74.223900, current_date - 2, 'Ayacucho'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'cartera', 'Cartera de cuero con cierre dorado',            null,      'marrón', -13.160100, -74.219500, current_date - 5, 'San Juan Bautista'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 'laptop',  'Laptop con calcomanías en la tapa',              'Lenovo',  'gris',   -13.152000, -74.226000, current_date - 1, 'Carmen Alto');

-- Rasgos ocultos (3 campos por categoría, mínimo 2 llenos; HU-02).
insert into public.rasgos_ocultos (perdida_id, tipo, valor_protegido) values
  ('10000000-0000-4000-8000-000000000001', 'fondo_pantalla',  'foto de un perro labrador'),
  ('10000000-0000-4000-8000-000000000001', 'imei_ultimos_4',  '4821'),
  ('10000000-0000-4000-8000-000000000002', 'contenido',       'un carné de biblioteca y un llavero de llama'),
  ('10000000-0000-4000-8000-000000000002', 'cantidad_tarjetas', '3'),
  ('10000000-0000-4000-8000-000000000003', 'serie',           'SN-DEMO-0001'),
  ('10000000-0000-4000-8000-000000000003', 'calcomanias',     'una de cohete y una de un gato');

-- Hallazgos: Luis encontró un celular y una cartera; Rosa encontró un DNI (el HMAC de ejemplo es falso).
insert into public.hallazgos (id, hallador_id, categoria, descripcion, marca, color, latitud, longitud, dia, distrito,
                              foto_original_path, foto_difuminada_path, dni_hmac, buena_fe_aceptada, estado) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'celular', 'Celular azul encontrado en el paradero', 'Samsung', 'azul',
     -13.158000, -74.224000, current_date - 1, 'Ayacucho', 'luis/h1-original.jpg', 'luis/h1-difuminada.jpg', null, true, 'publicado'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004', 'cartera', 'Cartera marrón en la plaza', null, 'marrón',
     -13.160000, -74.220000, current_date - 3, 'San Juan Bautista', 'luis/h2-original.jpg', 'luis/h2-difuminada.jpg', null, true, 'publicado'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'dni', 'DNI encontrado en una banca', null, null,
     null, null, current_date, 'Ayacucho', 'rosa/h3-original.jpg', 'rosa/h3-difuminada.jpg',
     'f00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeed', true, 'publicado');

-- Eventos de ejemplo (solo acción, distrito, fecha y usuario).
insert into public.eventos (accion, distrito, usuario_id) values
  ('registro',            'Ayacucho',          '00000000-0000-4000-8000-000000000003'),
  ('verificacion_celular','Ayacucho',          '00000000-0000-4000-8000-000000000003'),
  ('perdida_publicada',   'Ayacucho',          '00000000-0000-4000-8000-000000000003'),
  ('hallazgo_publicado',  'Carmen Alto',       '00000000-0000-4000-8000-000000000004');
