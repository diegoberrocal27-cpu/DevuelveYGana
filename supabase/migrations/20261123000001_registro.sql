-- Exclusiva del servidor. La fila de usuarios serializa envíos e intentos concurrentes.
create table public.codigos_registro (
  usuario uuid primary key references public.usuarios on delete cascade,
  huella text,
  vence timestamptz,
  enviado timestamptz,
  errores integer not null default 0,
  bloqueo timestamptz
);
alter table public.codigos_registro enable row level security;
revoke all on public.codigos_registro from public, anon, authenticated;

create function public.cuenta_habilitada() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select from public.usuarios where id = auth.uid() and verificado and not bloqueado)
$$;
revoke all on function public.cuenta_habilitada() from public, anon;
grant execute on function public.cuenta_habilitada() to authenticated, service_role;
create policy perdida_verificacion on public.perdidas as restrictive for insert to authenticated
  with check (public.cuenta_habilitada());
create policy hallazgo_verificacion on public.hallazgos as restrictive for insert to authenticated
  with check (public.cuenta_habilitada());

create function public.registro_operar(p_usuario uuid, p_accion text, p_celular text,
  p_distrito text, p_huella text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  u public.usuarios;
  c public.codigos_registro;
  t timestamptz;
begin
  select * into strict u from public.usuarios where id=p_usuario for update;
  t := clock_timestamp();
  if u.bloqueado then return jsonb_build_object('estado','suspendida'); end if;
  if p_accion='registrar' and u.celular is not null then
    return jsonb_build_object('estado','duplicado');
  end if;
  if u.verificado then return jsonb_build_object('estado','verificada'); end if;
  select * into c from public.codigos_registro where usuario=p_usuario;
  if c.bloqueo > t then
    return jsonb_build_object('estado','bloqueo','hasta',c.bloqueo);
  end if;
  if p_accion='estado' then
    return jsonb_build_object('estado',case when u.celular is null then 'registro' else 'pendiente' end);
  end if;
  if p_accion='registrar' then
    if p_celular is null or p_celular !~ '^9[0-9]{8}$' or p_distrito is null
      or p_distrito not in ('Ayacucho','San Juan Bautista','Carmen Alto','Jesús Nazareno','Andrés Avelino Cáceres Dorregaray','Otro')
    then return jsonb_build_object('estado','invalido'); end if;
    begin
      update public.usuarios set celular=p_celular,distrito=p_distrito where id=p_usuario;
    exception when unique_violation then return jsonb_build_object('estado','duplicado');
    end;
    u.celular := p_celular;
  end if;
  if u.celular is null then return jsonb_build_object('estado','registro'); end if;
  if p_accion in ('registrar','reenviar') then
    if c.enviado + interval '60 seconds' > t then
      return jsonb_build_object('estado','espera','hasta',c.enviado + interval '60 seconds');
    end if;
    insert into public.codigos_registro as anterior(usuario,huella,vence,enviado)
      values(p_usuario,p_huella,t+interval '5 minutes',t)
    on conflict (usuario) do update set huella=excluded.huella, vence=excluded.vence,
      enviado=t, errores=case when anterior.bloqueo is not null then 0 else anterior.errores end, bloqueo=null;
    return jsonb_build_object('estado','enviar','destino',u.celular);
  elsif p_accion='cancelar' then
    update public.codigos_registro set huella=null where usuario=p_usuario and huella=p_huella;
    return jsonb_build_object('estado','pendiente');
  elsif p_accion='verificar' then
    if c.huella is null or c.vence <= t then return jsonb_build_object('estado','vencido'); end if;
    if c.huella = p_huella then
      update public.usuarios set verificado=true where id=p_usuario;
      delete from public.codigos_registro where usuario=p_usuario;
      return jsonb_build_object('estado','verificada');
    end if;
    if c.errores+1 >= 3 then
      update public.codigos_registro set huella=null, errores=3, bloqueo=t+interval '15 minutes'
        where usuario=p_usuario;
      return jsonb_build_object('estado','bloqueo','hasta',t+interval '15 minutes');
    end if;
    update public.codigos_registro set errores=errores+1 where usuario=p_usuario;
    return jsonb_build_object('estado','incorrecto');
  end if;
  raise exception 'Acción desconocida';
end $$;
revoke all on function public.registro_operar(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.registro_operar(uuid,text,text,text,text) to service_role;

-- Evita iniciar el alta en Auth si el celular ya está ocupado.
create table public.consultas_registro (
  origen text primary key, inicio timestamptz not null, cantidad integer not null
);
alter table public.consultas_registro enable row level security;
revoke all on public.consultas_registro from public, anon, authenticated;

create function public.registro_disponibilidad(p_origen text, p_celular text) returns text
language plpgsql set search_path = '' as $$
declare
  cupo integer;
begin
  delete from public.consultas_registro where inicio < now()-interval '1 hour';
  insert into public.consultas_registro as c values (p_origen,now(),1)
    on conflict (origen) do update set cantidad=least(c.cantidad+1,21)
    returning cantidad into cupo;
  if cupo > 20 then return 'limite'; end if;
  if exists(select from public.usuarios where celular=p_celular) then return 'duplicado'; end if;
  return 'disponible';
end $$;
revoke all on function public.registro_disponibilidad(text,text) from public, anon, authenticated;
grant execute on function public.registro_disponibilidad(text,text) to service_role;
