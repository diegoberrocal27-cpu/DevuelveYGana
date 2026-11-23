# Esquema de base de datos (T-02 · SCRUM-31)

Base de datos en Supabase (PostgreSQL). Todo está en `supabase/migrations/` y se corre desde cero con `supabase db reset` (migraciones + `supabase/seed.sql`).

## Cómo está protegido (léelo primero)

- El **navegador** usa los roles `anon` (sin sesión) y `authenticated` (con sesión). Tienen lo mínimo.
- El **servidor** (rutas de Next.js) usa la clave `service_role`, que se salta RLS. Esa clave vive **solo en variables de entorno del servidor**, nunca en el repositorio ni en el navegador.
- Dos capas: permisos por **columna** (`GRANT`) y reglas por **fila** (RLS). Lo sensible no tiene permiso de columna para el navegador, así que ni un `select` directo lo devuelve.
- Regla práctica para el equipo: **no hagas `select *` sobre `hallazgos` desde el cliente** (se deniega a propósito). Para el catálogo usa la vista `hallazgos_publicos`.

## Tablas

### `usuarios`
| Campo | Notas |
|---|---|
| `id` | = `auth.users.id`; el perfil se crea solo al registrarse (trigger) |
| `celular` | 9 dígitos, empieza con 9; único |
| `correo` | único |
| `distrito` | texto |
| `verificado` | celular verificado (HU-01) |
| `rol` | `usuario`, `operador` o `admin` |
| `bloqueado` | una cuenta bloqueada no publica ni ve el catálogo |

### `perdidas`
`id`, `dueno_id`, `categoria` (`celular`, `laptop`, `cartera`, `dni`), `descripcion`, `marca`, `color`, `latitud`, `longitud`, `fecha`, `distrito`, `estado` (`activa`, `emparejada`, `en_entrega`, `cerrada`, `vencida`), `creado_en`, `actualizado_en`.

### `rasgos_ocultos`
`id`, `perdida_id`, `tipo`, `valor_protegido`, `creado_en`. Un registro por rasgo (3 campos por categoría, mínimo 2 llenos según HU-02). Para el DNI, `tipo = 'dni_hmac'` y `valor_protegido` guarda el HMAC, nunca el número.

### `hallazgos`
`id`, `hallador_id`, `categoria`, `descripcion`, `marca`, `color`, `latitud`, `longitud`, `dia`, `distrito`, `foto_original_path`, `foto_difuminada_path`, `dni_hmac`, `buena_fe_aceptada`, `estado` (`publicado`, `emparejado`, `en_entrega`, `cerrado`, `vencido`), `creado_en`, `actualizado_en`.

### `eventos`
`id`, `accion`, `distrito`, `fecha`, `usuario_id`. Solo escribe el servidor (T-04 con `registrarEvento`). No guardar DNI, rasgos ni fotos.

### Vista `hallazgos_publicos`
`id`, `categoria`, `distrito`, `dia`, `estado`, `creado_en`. Es el catálogo público del R1 (HU-03: solo categoría, distrito y día).

### Almacenamiento (Storage)
Buckets privados `fotos-originales` y `fotos-difuminadas` (máx. 5 MB; jpeg, png, webp). Sin políticas para el navegador: solo el servidor sube y lee. El dueño emparejado recibe la copia difuminada por una URL firmada de corta duración que genera el servidor.

## Quién puede leer y escribir qué (desde el navegador)

| Tabla / dato | Sin sesión | Usuario con sesión | Operador | Admin | Servidor |
|---|---|---|---|---|---|
| `usuarios` (perfil) | nada | solo el suyo; edita solo `distrito` | todos (lee) | todos (lee) | todo |
| `usuarios.rol / verificado / bloqueado` | nada | lee el suyo; **no** modifica | lee | lee | modifica |
| `perdidas` | nada | las suyas; crea; edita y borra mientras estén `activa` (sin tocar `estado`) | todas (lee) | todas (lee) | todo |
| `rasgos_ocultos` | nada | **solo los de sus pérdidas** | **nada** | **nada** | todo |
| `hallazgos` (categoría, distrito, día, estado) | nada | los `publicado` + los suyos; crea con buena fe marcada | todos (lee) | todos (lee) | todo |
| `hallazgos` descripción, marca, color, coordenadas, hallador, fotos, `dni_hmac` | nada | **nada (ni el propio hallador)** | **nada** | **nada** | todo |
| `eventos` | nada | nada | lee | lee | lee y escribe |
| `fotos-originales` / `fotos-difuminadas` | nada | nada | nada | nada | todo |

## Decisiones que tomé (confírmenlas en el equipo)

1. **Rasgos ocultos: operador y admin tampoco los leen** desde el cliente. La tarea dice "solo el dueño y el servidor"; lo apliqué literal.
2. **Todo cambio de estado, rol, verificación o bloqueo lo hace el servidor.** Así nadie se marca verificado ni cierra una pérdida por su cuenta. Si quieren que el admin bloquee desde el panel (HU-17), lo hace por una ruta del servidor.
3. **El público solo ve categoría, distrito y día** (HU-03). La descripción de un hallazgo y las coordenadas no salen al navegador; el servidor las usa para el emparejamiento (HU-04).
4. **Agregué a `perdidas` y `hallazgos` los campos `marca`, `color`, `latitud` y `longitud`**, que la lista de T-02 no menciona pero HU-04 necesita para el puntaje (marca, color, lugar). También `dni_hmac` y `buena_fe_aceptada` en `hallazgos` (HU-04 punto 5 y RN-17). Son nulos cuando no aplican.
5. **`eventos` es solo escritura del servidor** para que nadie falsee las métricas del piloto (HU-18).
6. **Pendiente de otras historias, a propósito:** una sola pérdida activa sin suscripción (RN-04) depende de la suscripción (HU-10); el HMAC del DNI y sus pruebas, de SP-02.

## Cómo agregar tablas después (pagos, suscripciones, QR)

Crea una migración nueva en `supabase/migrations/` (nombre con fecha, por ejemplo `20261201000001_pagos.sql`). No edites las existentes. Cada tabla nueva: `enable row level security`, `revoke all ... from anon, authenticated` y solo los `grant` y políticas que necesite.

## Cómo probar

**En Supabase real:** `supabase db reset` y luego corre `supabase/tests/rls.sql` contra la base local (`psql`).

**En un PostgreSQL común y vacío** (sin Supabase; usa un simulador que imita auth y storage):
```bash
DATABASE_URL=postgres://usuario@localhost:5432/base_vacia ./supabase/tests/correr_pruebas.sh
```
Corre las migraciones desde cero, el seed y 52 comprobaciones de seguridad; luego agrega una migración de ejemplo (pagos) y las repite. Cada línea sale como `OK: ...` o aborta con `FALLÓ: ...`.

## Datos de prueba

`supabase/seed.sql`, todo inventado. Contraseña de todas las cuentas: `Prueba123!`.

| Cuenta | Rol |
|---|---|
| admin@ejemplo.test | admin |
| operador@ejemplo.test | operador |
| rosa@ejemplo.test | usuario (perdió un celular y una cartera; halló un DNI) |
| luis@ejemplo.test | usuario (perdió una laptop; halló un celular y una cartera) |
| bloqueado@ejemplo.test | usuario bloqueado |
