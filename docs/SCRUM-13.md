# SCRUM-13 · Registro de objeto perdido

## Activarlo en desarrollo

1. En Supabase de **desarrollo** aplica, en este orden, las migraciones de T-02, `20261123000001_registro.sql` (SCRUM-12) y `20261123000002_registrar_perdida.sql`. La última crea `limites_de_uso`, `consumir_intento` y `registrar_perdida`.
2. Agrega a `web/.env.local` (y a Vercel) la clave que protege el DNI:

```dotenv
DNI_HMAC_SECRET=
```

Genérala una vez por entorno con `openssl rand -hex 32` (mínimo 32 caracteres). No la guardes en la base ni en el repositorio. Sin ella, el registro de un DNI falla con error de servidor.

3. Entra con una cuenta de celular verificado (SCRUM-12) y abre **Perdí algo**.

## Cómo funciona

- El formulario envía `POST /api/perdidas` con el token de la sesión de Supabase. El servidor valida el token, valida los datos y llama a `registrar_perdida`.
- Cada categoría tiene 3 rasgos ocultos y se piden al menos 2. En DNI son obligatorios el número y la fecha de emisión; se guardan solo como HMAC-SHA256, nunca en claro.
- Sin suscripción se permite una pérdida activa (RN-04). Al llegar al máximo responde 409; HU-10 lo ampliará con el parámetro `maximoDePerdidasActivas`.
- Registrar un DNI cuenta como intento: 5 por hora por usuario y 20 por hora por origen. Pasado el límite responde 429.
- `registrar_perdida` bloquea la fila del usuario, así que dos envíos simultáneos no pueden crear dos pérdidas activas.
- Al crear la pérdida se registra el evento `perdida_publicada` (T-04), con el distrito y sin rasgos.

## Respuestas de la API

| Estado | `estado` | Cuándo |
|---|---|---|
| 201 | `creada` | Pérdida registrada |
| 400 | `datos_invalidos` / `formato_invalido` | Campos con error (vienen en `errores`) |
| 401 | `sesion` | Falta el token o no es válido |
| 403 | `no_habilitada` | Cuenta sin celular verificado o bloqueada |
| 409 | `limite` | Ya tiene la pérdida activa permitida |
| 429 | `demasiados_intentos` | Límite de intentos de DNI |
| 503 | `error` | Falla del servidor o de la base |
