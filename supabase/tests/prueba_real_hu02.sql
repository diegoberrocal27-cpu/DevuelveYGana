do $$
declare
  r text := E'\n';
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
  ras jsonb := '[{"tipo":"fondo_pantalla","valor":"Foto de un perro"},{"tipo":"imei_ultimos_4","valor":"4821"}]';
  res jsonb; n integer; t0 timestamptz; ms numeric; i integer; ult integer;
  hoy date := (now() at time zone 'America/Lima')::date;
begin
  insert into auth.users(id, email, email_confirmed_at) values (u1,'a@prueba.test',now()),(u2,'b@prueba.test',now()),(u3,'c@prueba.test',now());
  update public.usuarios set verificado = true where id in (u1, u3);
  r := r || format('01 cuentas creadas por el trigger: %s de 3', (select count(*) from public.usuarios where id in (u1,u2,u3))) || E'\n';

  r := r || format('02 RLS en limites_de_uso: %s', (select relrowsecurity from pg_class where oid = 'public.limites_de_uso'::regclass)) || E'\n';
  r := r || format('03 anon/authenticated pueden ejecutar registrar_perdida: %s / %s (esperado false/false); service_role: %s',
    has_function_privilege('anon','public.registrar_perdida(uuid,public.categoria_objeto,text,date,text,jsonb,integer)','execute'),
    has_function_privilege('authenticated','public.registrar_perdida(uuid,public.categoria_objeto,text,date,text,jsonb,integer)','execute'),
    has_function_privilege('service_role','public.registrar_perdida(uuid,public.categoria_objeto,text,date,text,jsonb,integer)','execute')) || E'\n';
  r := r || format('04 anon/authenticated pueden ejecutar consumir_intento: %s / %s (esperado false/false)',
    has_function_privilege('anon','public.consumir_intento(text,integer,interval)','execute'),
    has_function_privilege('authenticated','public.consumir_intento(text,integer,interval)','execute')) || E'\n';

  set local role service_role;
  t0 := clock_timestamp();
  res := public.registrar_perdida(u1,'celular','Celular negro con funda azul',hoy,'Ayacucho',ras,1);
  ms := extract(epoch from clock_timestamp() - t0) * 1000;
  r := r || format('05 verificada registra: %s (tiempo en la base: %s ms)', res->>'estado', round(ms,1)) || E'\n';
  res := public.registrar_perdida(u1,'celular','Otro celular distinto',hoy,'Ayacucho',ras,1);
  r := r || format('06 segunda perdida activa: %s (esperado limite)', res->>'estado') || E'\n';
  res := public.registrar_perdida(u2,'celular','Celular negro con funda azul',hoy,'Ayacucho',ras,1);
  r := r || format('07 cuenta sin verificar: %s (esperado no_habilitada)', res->>'estado') || E'\n';
  res := public.registrar_perdida(u3,'celular','Celular negro con funda azul',hoy,'Ayacucho','[{"tipo":"imei_ultimos_4","valor":"4821"}]',1);
  r := r || format('08 un solo rasgo: %s (esperado invalido)', res->>'estado') || E'\n';
  res := public.registrar_perdida(u3,'celular','Celular negro con funda azul',hoy+1,'Ayacucho',ras,1);
  r := r || format('09 fecha futura: %s (esperado invalido)', res->>'estado') || E'\n';
  res := public.registrar_perdida(u3,'celular','Celular negro con funda azul',hoy,'Lima',ras,1);
  r := r || format('10 distrito fuera de la lista: %s (esperado invalido)', res->>'estado') || E'\n';
  ult := 0;
  for i in 1..6 loop ult := public.consumir_intento('prueba:dni', 5, interval '1 hour'); end loop;
  r := r || format('11 intento 6 de 5 en la ventana: espera %s s (esperado mayor que 0)', ult) || E'\n';
  reset role;

  r := r || format('12 rasgos guardados de la perdida de u1: %s (esperado 2)', (select count(*) from public.rasgos_ocultos ro join public.perdidas p on p.id = ro.perdida_id where p.dueno_id = u1)) || E'\n';

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  begin
    perform public.registrar_perdida(u1,'celular','Celular negro con funda azul',hoy,'Ayacucho',ras,99);
    r := r || E'13 authenticated ejecuta registrar_perdida: PERMITIDO (MAL)\n';
  exception when insufficient_privilege then r := r || E'13 authenticated ejecuta registrar_perdida: denegado (bien)\n'; end;
  begin
    select count(*) into n from public.limites_de_uso;
    r := r || format(E'14 authenticated lee limites_de_uso: PERMITIDO %s filas (MAL)\n', n);
  exception when insufficient_privilege then r := r || E'14 authenticated lee limites_de_uso: denegado (bien)\n'; end;
  begin
    select count(*) into n from public.rasgos_ocultos;
    r := r || format(E'15 authenticated lee rasgos_ocultos propios: %s fila(s) (esperado 2 de su propia perdida; ninguna ajena)\n', n);
  exception when insufficient_privilege then r := r || E'15 authenticated lee rasgos_ocultos: denegado\n'; end;
  reset role;

  set local role anon;
  begin
    select count(*) into n from public.rasgos_ocultos;
    r := r || format(E'16 anon lee rasgos_ocultos: %s filas (esperado 0 o denegado)\n', n);
  exception when insufficient_privilege then r := r || E'16 anon lee rasgos_ocultos: denegado (bien)\n'; end;
  begin
    select count(*) into n from public.perdidas;
    r := r || format(E'17 anon lee perdidas: %s filas (esperado 0 o denegado)\n', n);
  exception when insufficient_privilege then r := r || E'17 anon lee perdidas: denegado (bien)\n'; end;
  reset role;

  raise exception 'RESULTADOS%', r;
end $$;
