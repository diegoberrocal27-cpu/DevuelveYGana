-- T-02 · Migración 3 de 4: permisos por columna y seguridad por fila (RLS).
--
-- Principio: el navegador (roles anon y authenticated) tiene lo mínimo. Todo lo sensible
-- (rasgos, fotos, DNI, coordenadas, cambios de estado/rol) pasa por el servidor con la clave
-- service_role, que se salta RLS y vive solo en variables de entorno del servidor.
--
-- Dos capas:
--   1) GRANT por columna  -> qué columnas puede tocar el rol.
--   2) Políticas RLS      -> qué filas puede ver o modificar cada persona.

-- ---------------------------------------------------------------------------
-- Punto de partida: quitar todo a anon / authenticated
-- ---------------------------------------------------------------------------
revoke all on table public.usuarios, public.perdidas, public.rasgos_ocultos,
                    public.hallazgos, public.eventos, public.hallazgos_publicos
  from public, anon, authenticated;
revoke all on sequence public.eventos_id_seq from public, anon, authenticated;

alter table public.usuarios       enable row level security;
alter table public.perdidas       enable row level security;
alter table public.rasgos_ocultos enable row level security;
alter table public.hallazgos      enable row level security;
alter table public.eventos        enable row level security;

-- ---------------------------------------------------------------------------
-- usuarios
--   Cada persona ve y edita lo suyo (solo el distrito). Operador y admin ven a todos.
--   rol, verificado y bloqueado: únicamente el servidor.
-- ---------------------------------------------------------------------------
grant select on public.usuarios to authenticated;
grant update (distrito) on public.usuarios to authenticated;

create policy usuarios_ver on public.usuarios
  for select to authenticated
  using (id = auth.uid() or public.es_operador_o_admin());

create policy usuarios_editar_lo_propio on public.usuarios
  for update to authenticated
  using (id = auth.uid() and public.usuario_activo())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- perdidas
--   Las ve su dueño y el equipo (operador/admin). Nadie más.
--   Crear: solo a nombre propio y con cuenta no bloqueada.
--   Editar/borrar: solo el dueño y solo mientras está 'activa'. El estado lo cambia el servidor.
-- ---------------------------------------------------------------------------
grant select on public.perdidas to authenticated;
grant insert (dueno_id, categoria, descripcion, marca, color, latitud, longitud, fecha, distrito)
  on public.perdidas to authenticated;
grant update (descripcion, marca, color, latitud, longitud, fecha, distrito)
  on public.perdidas to authenticated;
grant delete on public.perdidas to authenticated;

create policy perdidas_ver on public.perdidas
  for select to authenticated
  using (dueno_id = auth.uid() or public.es_operador_o_admin());

create policy perdidas_crear on public.perdidas
  for insert to authenticated
  with check (dueno_id = auth.uid() and public.usuario_activo());

create policy perdidas_editar on public.perdidas
  for update to authenticated
  using (dueno_id = auth.uid() and estado = 'activa' and public.usuario_activo())
  with check (dueno_id = auth.uid());

create policy perdidas_borrar on public.perdidas
  for delete to authenticated
  using (dueno_id = auth.uid() and estado = 'activa' and public.usuario_activo());

-- ---------------------------------------------------------------------------
-- rasgos_ocultos
--   SOLO el dueño de la pérdida (y el servidor). Ni operador ni admin los leen desde el cliente.
-- ---------------------------------------------------------------------------
grant select on public.rasgos_ocultos to authenticated;
grant insert (perdida_id, tipo, valor_protegido) on public.rasgos_ocultos to authenticated;
grant update (tipo, valor_protegido) on public.rasgos_ocultos to authenticated;
grant delete on public.rasgos_ocultos to authenticated;

create policy rasgos_ver_solo_dueno on public.rasgos_ocultos
  for select to authenticated
  using (exists (
    select 1 from public.perdidas p
    where p.id = rasgos_ocultos.perdida_id and p.dueno_id = auth.uid()
  ));

create policy rasgos_crear_solo_dueno on public.rasgos_ocultos
  for insert to authenticated
  with check (public.usuario_activo() and exists (
    select 1 from public.perdidas p
    where p.id = rasgos_ocultos.perdida_id and p.dueno_id = auth.uid() and p.estado = 'activa'
  ));

create policy rasgos_editar_solo_dueno on public.rasgos_ocultos
  for update to authenticated
  using (public.usuario_activo() and exists (
    select 1 from public.perdidas p
    where p.id = rasgos_ocultos.perdida_id and p.dueno_id = auth.uid() and p.estado = 'activa'
  ))
  with check (exists (
    select 1 from public.perdidas p
    where p.id = rasgos_ocultos.perdida_id and p.dueno_id = auth.uid()
  ));

create policy rasgos_borrar_solo_dueno on public.rasgos_ocultos
  for delete to authenticated
  using (public.usuario_activo() and exists (
    select 1 from public.perdidas p
    where p.id = rasgos_ocultos.perdida_id and p.dueno_id = auth.uid() and p.estado = 'activa'
  ));

-- ---------------------------------------------------------------------------
-- hallazgos
--   Columnas legibles desde el cliente: id, categoria, distrito, dia, estado, creado_en.
--   NO legibles (ni siquiera para el hallador): descripcion, marca, color, coordenadas,
--   hallador_id, fotos, dni_hmac, buena_fe_aceptada. Las usa el servidor.
--   Filas: el catálogo muestra los 'publicado'; el hallador ve además los suyos; el equipo ve todo.
--   Crear: solo a nombre propio, sin bloqueo y con la declaración de buena fe marcada (RN-17).
--   Las rutas de foto y dni_hmac las escribe el servidor (el cliente no tiene permiso).
-- ---------------------------------------------------------------------------
grant select (id, categoria, distrito, dia, estado, creado_en) on public.hallazgos to authenticated;
grant insert (hallador_id, categoria, descripcion, marca, color, latitud, longitud, dia, distrito, buena_fe_aceptada)
  on public.hallazgos to authenticated;
grant update (descripcion, marca, color, latitud, longitud, dia, distrito)
  on public.hallazgos to authenticated;
grant delete on public.hallazgos to authenticated;
grant select on public.hallazgos_publicos to authenticated;

create policy hallazgos_ver on public.hallazgos
  for select to authenticated
  using (
    public.es_operador_o_admin()
    or hallador_id = auth.uid()
    or (estado = 'publicado' and public.usuario_activo())
  );

create policy hallazgos_crear on public.hallazgos
  for insert to authenticated
  with check (hallador_id = auth.uid() and public.usuario_activo() and buena_fe_aceptada);

create policy hallazgos_editar on public.hallazgos
  for update to authenticated
  using (hallador_id = auth.uid() and estado = 'publicado' and public.usuario_activo())
  with check (hallador_id = auth.uid());

create policy hallazgos_borrar on public.hallazgos
  for delete to authenticated
  using (hallador_id = auth.uid() and estado = 'publicado' and public.usuario_activo());

-- ---------------------------------------------------------------------------
-- eventos
--   Append-only y escritos solo por el servidor (así nadie falsea las métricas del piloto).
--   Lectura: operador y admin.
-- ---------------------------------------------------------------------------
grant select on public.eventos to authenticated;

create policy eventos_ver on public.eventos
  for select to authenticated
  using (public.es_operador_o_admin());
