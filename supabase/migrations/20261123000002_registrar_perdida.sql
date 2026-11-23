-- HU-02: guardar una pérdida con sus rasgos ocultos en un solo paso, y limitar intentos.
-- Solo la usa el servidor (service_role). El navegador no tiene permiso para ejecutarlas.

create table public.limites_de_uso (
  clave    text primary key,
  inicio   timestamptz not null,
  cantidad integer not null
);
alter table public.limites_de_uso enable row level security;
revoke all on public.limites_de_uso from public, anon, authenticated;

-- Cuenta un intento. Devuelve 0 si se permite, o los segundos que faltan para poder volver a intentar.
create function public.consumir_intento(p_clave text, p_maximo integer, p_ventana interval)
returns integer
language plpgsql set search_path = '' as $$
declare
  t timestamptz := clock_timestamp();
  fila public.limites_de_uso;
begin
  delete from public.limites_de_uso where inicio < t - interval '1 day';
  insert into public.limites_de_uso as l (clave, inicio, cantidad)
    values (p_clave, t, 1)
  on conflict (clave) do update set
    inicio   = case when l.inicio + p_ventana <= t then t else l.inicio end,
    cantidad = case when l.inicio + p_ventana <= t then 1 else least(l.cantidad + 1, p_maximo + 1) end
  returning * into fila;
  if fila.cantidad > p_maximo then
    return ceil(extract(epoch from (fila.inicio + p_ventana - t)))::integer;
  end if;
  return 0;
end $$;
revoke all on function public.consumir_intento(text, integer, interval) from public, anon, authenticated;
grant execute on function public.consumir_intento(text, integer, interval) to service_role;

-- p_rasgos: arreglo JSON de objetos {"tipo": "...", "valor": "..."}.
-- Para el DNI, "valor" ya llega como HMAC (lo calcula el servidor; el número nunca llega aquí).
create function public.registrar_perdida(
  p_dueno uuid, p_categoria public.categoria_objeto, p_descripcion text, p_fecha date,
  p_distrito text, p_rasgos jsonb, p_maximo integer
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  u public.usuarios;
  hoy date := (now() at time zone 'America/Lima')::date;
  llenos integer;
  nueva uuid;
begin
  -- La fila del usuario serializa envíos simultáneos, así el límite no se burla.
  select * into u from public.usuarios where id = p_dueno for update;
  if not found or u.bloqueado or not u.verificado then
    return jsonb_build_object('estado', 'no_habilitada');
  end if;

  if p_fecha is null or p_fecha > hoy
    or length(btrim(coalesce(p_descripcion, ''))) < 10
    or p_distrito is null
    or p_distrito not in ('Ayacucho', 'San Juan Bautista', 'Carmen Alto', 'Jesús Nazareno', 'Andrés Avelino Cáceres Dorregaray')
    or p_rasgos is null or jsonb_typeof(p_rasgos) <> 'array'
  then
    return jsonb_build_object('estado', 'invalido');
  end if;

  select count(*) into llenos
  from jsonb_to_recordset(p_rasgos) as r(tipo text, valor text)
  where btrim(coalesce(r.tipo, '')) <> '' and btrim(coalesce(r.valor, '')) <> '';
  if llenos < 2 or llenos <> jsonb_array_length(p_rasgos)
    or (select count(distinct btrim(r.tipo)) from jsonb_to_recordset(p_rasgos) as r(tipo text, valor text)) <> llenos
  then
    return jsonb_build_object('estado', 'invalido');
  end if;

  if (select count(*) from public.perdidas where dueno_id = p_dueno and estado = 'activa') >= p_maximo then
    return jsonb_build_object('estado', 'limite');
  end if;

  insert into public.perdidas (dueno_id, categoria, descripcion, fecha, distrito)
    values (p_dueno, p_categoria, btrim(p_descripcion), p_fecha, p_distrito)
    returning id into nueva;
  insert into public.rasgos_ocultos (perdida_id, tipo, valor_protegido)
    select nueva, btrim(r.tipo), btrim(r.valor)
    from jsonb_to_recordset(p_rasgos) as r(tipo text, valor text);

  return jsonb_build_object('estado', 'creada', 'id', nueva);
end $$;
revoke all on function public.registrar_perdida(uuid, public.categoria_objeto, text, date, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.registrar_perdida(uuid, public.categoria_objeto, text, date, text, jsonb, integer)
  to service_role;
