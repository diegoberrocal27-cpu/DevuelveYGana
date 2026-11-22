-- T-02 · Migración 2 de 4: perdidas, rasgos_ocultos, hallazgos, eventos.
-- Las tablas de pagos, suscripciones y QR se agregan después con migraciones nuevas
-- (no tocan estas tablas, solo apuntan a ellas con claves foráneas).

-- ---------------------------------------------------------------------------
-- Pérdidas
-- ---------------------------------------------------------------------------
create table public.perdidas (
  id             uuid primary key default gen_random_uuid(),
  dueno_id       uuid not null references public.usuarios (id) on delete cascade,
  categoria      public.categoria_objeto not null,
  descripcion    text not null check (length(btrim(descripcion)) > 0),
  marca          text,                                   -- para el puntaje de HU-04 (null si no aplica)
  color          text,
  latitud        numeric(9, 6) check (latitud  between -90  and 90),
  longitud       numeric(9, 6) check (longitud between -180 and 180),
  fecha          date not null,                          -- fecha de la pérdida
  distrito       text not null,
  estado         public.estado_perdida not null default 'activa',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index perdidas_dueno_idx     on public.perdidas (dueno_id);
create index perdidas_busqueda_idx  on public.perdidas (categoria, estado);

create trigger perdidas_actualizado
  before update on public.perdidas
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Rasgos ocultos (solo los lee el dueño y el servidor)
-- tipo: p. ej. 'fondo_pantalla', 'imei_ultimos_4', 'detalle_fisico', 'serie',
--       'calcomanias', 'contenido', 'cantidad_tarjetas' o 'dni_hmac'.
-- valor_protegido: para el DNI es el HMAC en hexadecimal, nunca el número (HU-02 / SP-02).
-- ---------------------------------------------------------------------------
create table public.rasgos_ocultos (
  id               uuid primary key default gen_random_uuid(),
  perdida_id       uuid not null references public.perdidas (id) on delete cascade,
  tipo             text not null check (length(btrim(tipo)) > 0),
  valor_protegido  text not null check (length(btrim(valor_protegido)) > 0),
  creado_en        timestamptz not null default now()
);

create index rasgos_ocultos_perdida_idx on public.rasgos_ocultos (perdida_id);

-- ---------------------------------------------------------------------------
-- Hallazgos
-- Público (HU-03): solo categoría, distrito y día. Todo lo demás lo maneja el servidor.
-- ---------------------------------------------------------------------------
create table public.hallazgos (
  id                    uuid primary key default gen_random_uuid(),
  hallador_id           uuid not null references public.usuarios (id) on delete cascade,
  categoria             public.categoria_objeto not null,
  descripcion           text not null check (length(btrim(descripcion)) > 0),
  marca                 text,
  color                 text,
  latitud               numeric(9, 6) check (latitud  between -90  and 90),
  longitud              numeric(9, 6) check (longitud between -180 and 180),
  dia                   date not null,                   -- día del hallazgo
  distrito              text not null,
  foto_original_path    text,                            -- bucket privado; solo el servidor
  foto_difuminada_path  text,                            -- la entrega el servidor al dueño emparejado
  dni_hmac              text,                            -- HMAC del DNI hallado (emparejamiento directo, HU-04)
  buena_fe_aceptada     boolean not null default false,  -- declaración de depositario transitorio (RN-17)
  estado                public.estado_hallazgo not null default 'publicado',
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create index hallazgos_busqueda_idx on public.hallazgos (categoria, estado);
create index hallazgos_hallador_idx on public.hallazgos (hallador_id);

create trigger hallazgos_actualizado
  before update on public.hallazgos
  for each row execute function public.tocar_actualizado_en();

-- Vista pública para el catálogo: solo categoría, distrito y día (más id y estado).
-- security_invoker: respeta las reglas RLS y los permisos de quien consulta.
create view public.hallazgos_publicos
  with (security_invoker = true) as
select id, categoria, distrito, dia, estado, creado_en
from public.hallazgos;

-- ---------------------------------------------------------------------------
-- Eventos (T-04 y HU-18). Solo acción, distrito, fecha y usuario: nada sensible.
-- ---------------------------------------------------------------------------
create table public.eventos (
  id          bigint generated always as identity primary key,
  accion      text not null check (length(btrim(accion)) > 0),
  distrito    text,
  fecha       timestamptz not null default now(),
  usuario_id  uuid references public.usuarios (id) on delete set null
);

create index eventos_accion_fecha_idx on public.eventos (accion, fecha);

comment on table public.eventos is 'Registro append-only para medir el piloto. No guardar DNI, rasgos ocultos ni fotos.';
