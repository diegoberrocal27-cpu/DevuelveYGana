# SP-01: verificación del celular y costo por usuario

Jira: SCRUM-35. Para la historia HU-01 (registro con código de 6 dígitos).

## Decisión

Enviar el código por **WhatsApp** (mensaje de autenticación) y dejar el **correo** como respaldo gratuito.
El SMS queda descartado: un solo mes de SMS se come casi todo el presupuesto.

La decisión es reversible. El prototipo separa el envío en una pieza intercambiable (`enviador`),
así que cambiar de canal no toca las reglas del código.

## Costos

Supuestos: dólar a S/ 3,45 (el real ronda S/ 3,40, así que el cálculo sobra un poco) y 1,3 mensajes por usuario
nuevo (algunos piden el código dos veces). Se calculan con `node prototipos/sp-01/tabla-de-costos.mjs`.

| Canal | Precio por mensaje | Soles por usuario | Usuarios nuevos por mes dentro de S/ 150 |
|---|---|---|---|
| SMS (Twilio, Perú) | US$ 0,2476 | S/ 1,11 | 135 |
| WhatsApp, mensaje de autenticación (Perú) | US$ 0,03 | S/ 0,13 | 1 114 |
| Correo (Resend, plan gratis) | 0 | 0 | sin límite de plata, pero 100 correos por día |

Fuentes: página de precios de SMS de Twilio para Perú; tarifas de WhatsApp Business de Meta vigentes desde el
1 de octubre de 2026 (Perú subió de US$ 0,02 a US$ 0,03 en autenticación); página de precios de Resend.

Lo que cuenta es el total mensual de infraestructura de S/ 150, y ahí ya viven Vercel y Supabase. Por eso
135 usuarios con SMS dejan el presupuesto en cero, y con WhatsApp quedan cientos de soles libres.

## Lo que no se pudo verificar

- **Tiempo de llegada.** No hay cuentas de prueba en ningún proveedor, así que no se midió. Hay que medirlo con
  5 celulares reales de Claro, Movistar, Entel y Bitel antes de cerrar HU-01.
- **Comisión del intermediario.** Supabase solo envía por WhatsApp a través de Twilio, y Twilio cobra su propia
  comisión por mensaje encima de la de Meta. No encontré la cifra vigente; hay que sumarla a la tabla.
- **Permisos de Meta.** WhatsApp pide verificar el negocio y aprobar la plantilla del mensaje. Eso toma días y
  necesita datos de la empresa. Si no se consigue a tiempo, el piloto arranca con correo.
- **Precios y tipo de cambio** cambian cada trimestre; los de esta nota son de noviembre de 2026.

## Prototipo descartable

Carpeta `prototipos/sp-01/`. Se prueba con `node --test prototipos/sp-01/sp01.test.mjs` (18 pruebas).

| Archivo | Responsabilidad |
|---|---|
| `celular.mjs` | Valida el número peruano: 9 dígitos que empiezan con 9 |
| `codigo.mjs` | Genera el código de 6 dígitos y lo guarda protegido (HMAC, nunca en claro) |
| `politica.mjs` | Las reglas: 5 minutos de vigencia, 3 errores, 15 minutos de bloqueo, 60 segundos entre envíos |
| `verificador.mjs` | Pedir y verificar el código, aplicando la política |
| `almacen-en-memoria.mjs`, `enviador-en-memoria.mjs` | Piezas de prueba; en HU-01 se cambian por Supabase y por WhatsApp |
| `costos.mjs`, `tabla-de-costos.mjs` | El cálculo de la tabla de arriba |

Reglas comprobadas con pruebas, y cada regla se rompió a propósito para ver que la prueba falla:

- El código vence a los 5 minutos y se usa una sola vez.
- A los 3 errores se bloquea 15 minutos; en ese tiempo ni siquiera se puede pedir otro código ni sirve el correcto.
- No se puede pedir otro código antes de 60 segundos, para que nadie gaste el presupuesto a base de pedidos repetidos.
- Pedir un código nuevo anula el anterior.
- Si el proveedor falla al enviar, no queda ningún código guardado y el error se avisa.
- Un celular sin código pedido recibe la misma respuesta que uno vencido, así nadie descubre qué números existen.

## Para HU-01

- El límite por IP y por usuario del prototipo SP-02 (`limite-de-intentos.mjs`) se reutiliza delante de "pedir código".
- La política debe vivir en un solo lugar (`politica.mjs`), porque es la que el equipo querrá ajustar.
- Falta decidir si el código lo gestiona Supabase Auth con su gancho de envío o este módulo propio; no se pudo
  probar Supabase real todavía.
