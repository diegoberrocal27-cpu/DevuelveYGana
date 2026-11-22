# SP-02 · Rasgos ocultos y DNI protegidos (SCRUM-36)

**Pregunta:** ¿cómo guardamos los rasgos ocultos y el DNI para que ninguna vista pública los devuelva?

**Decisión:** los rasgos ocultos viven en `rasgos_ocultos` y solo los lee el dueño y el servidor (RLS de T-02). El número de DNI **nunca se guarda en claro**: se guarda un **HMAC-SHA256 con una clave secreta del servidor**. Las respuestas públicas de la API salen de una **lista blanca de campos**, y los intentos con DNI tienen **límite por usuario y por IP**.

El prototipo (descartable) está en `prototipos/sp-02/`.

## 1. Rasgos por categoría (HU-02: 3 campos, se exigen al menos 2)

| Categoría | Rasgos ocultos (`tipo`) |
|---|---|
| celular | `fondo_pantalla`, `imei_ultimos_4`, `detalle_fisico` |
| laptop | `serie`, `calcomanias`, `fondo_pantalla` |
| cartera | `contenido`, `detalle_fisico`, `cantidad_tarjetas` |
| DNI | `dni_hmac`, `fecha_emision_hmac` (**propuesta, confirmar con el equipo**) |

**DNI.** Se identifica por su número, así que no tiene rasgos propios. Propongo dos rasgos mínimos, ambos solo como HMAC: el **número** y la **fecha de emisión** (también protegida, porque tiene pocas combinaciones y se adivinaría igual).

Ojo con una limitación de fondo: quien encuentra un DNI o una cartera **puede leer todo lo que está impreso**. Para esas categorías, los rasgos ocultos prueban menos que en un celular. La coincidencia fuerte del DNI es el número (HMAC).

## 2. Decisión del HMAC

- **Qué se guarda:** `HMAC-SHA256(clave, "dni:v1:" + número)` en hexadecimal (64 caracteres). Se guarda en `rasgos_ocultos` (`tipo = 'dni_hmac'`) para la pérdida y en `hallazgos.dni_hmac` para el hallazgo. Emparejar es comparar los dos valores por igualdad, **sin ver el número**.
- **Dónde vive la clave:** variable de entorno `DNI_HMAC_SECRET` en el servidor (Vercel), de 32 caracteres o más (`openssl rand -hex 32`). **Nunca** en la base de datos ni en el repositorio. Si falta o es corta, el servidor no arranca (sin valor por defecto). Un valor distinto en desarrollo y en producción.
- **Por qué no un hash simple:** el DNI tiene 8 dígitos, o sea 100 millones de posibilidades. Medido aquí: **≈1,2 millones de SHA-256 por segundo en un solo núcleo; los 100 millones se prueban en ≈82 segundos**. Con una tarjeta gráfica sería mucho más rápido. Con HMAC, quien robe la base de datos sin la clave no puede probar candidatos. La prueba automática lo demuestra: con SHA-256 simple recupera el DNI; con el HMAC, no.
- **Consecuencias que hay que aceptar:** si se pierde la clave, no hay forma de emparejar DNI viejos; y como el número no se guarda, **cambiar la clave obliga a pedir el DNI otra vez**. El prefijo `v1` deja la puerta abierta a cambiar de versión.

## 3. Que la API pública no filtre datos

- **Lista blanca:** el catálogo de hallazgos devuelve solo `id`, `categoria`, `distrito`, `dia`, `estado`; la lista de pérdidas, solo `id`, `categoria`, `distrito`, `fecha`, `estado`. Se arma eligiendo campos, no quitando los sensibles, para que un campo nuevo no salga por accidente.
- **Sin "oráculo":** publicar un hallazgo de DNI responde **exactamente igual** haya o no una pérdida coincidente. La coincidencia solo genera una alerta interna al dueño (HU-04: categoría, distrito y día). Así nadie puede usar la API para averiguar qué DNI están registrados.
- **Errores genéricos:** un DNI inválido da `datos inválidos` y no repite lo recibido.
- **Límite de intentos:** 5 intentos con DNI por hora y por usuario, y 20 por hora y por IP (**valores iniciales, a calibrar**). Cada intento cuenta, sea válido o no. El prototipo guarda los contadores en memoria; **en producción deben estar en un lugar compartido** (una tabla de Supabase o Redis/KV), porque cada instancia de Vercel tiene su propia memoria.

## 4. Pruebas

| Qué | Dónde | Resultado |
|---|---|---|
| HMAC, rasgos, limitador y API pública (sin sesión) | `node --test prototipos/sp-02/sp02.test.mjs` | 17 de 17 |
| El DNI no se filtra por la base de datos (reglas RLS de T-02) | `prototipos/sp-02/rls_dni.sql` | 9 de 9 |

Las dos suites se comprobaron también rompiendo la seguridad a propósito (catálogo que expone la descripción, respuesta que revela la coincidencia, sin límite de intentos, hash simple, permiso de lectura de `dni_hmac`, política que abre los rasgos al operador): cada sabotaje hizo fallar la prueba correspondiente.

**Lo que NO está probado todavía:**
- **Las rutas reales de la API.** Hoy no existen rutas de Next.js; el prototipo es una API de mentira con los mismos criterios. La prueba hay que **repetirla contra las rutas reales** cuando se construya HU-02 (pedir la lista pública sin sesión y comprobar que no sale ningún rasgo ni DNI).
- **Un Supabase real.** `rls_dni.sql` se corrió en un PostgreSQL común con el esquema de T-02 y un imitador de `auth` y `storage`, no en Supabase.

## 5. Para quien construya HU-02 y HU-04

1. Calcular el HMAC **solo en el servidor** (`hmacDni`) y guardar el resultado; el número no se registra ni en logs.
2. Para emparejar, agregar una migración nueva con un índice parcial: `create index on public.rasgos_ocultos (valor_protegido) where tipo = 'dni_hmac';`.
3. Aplicar el límite de intentos en toda ruta que reciba un DNI, y devolver siempre la misma respuesta con o sin coincidencia.

## Cómo correr

```bash
node --test prototipos/sp-02/sp02.test.mjs          # Node 20 o superior; no instala nada
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prototipos/sp-02/rls_dni.sql   # requiere T-02 y su seed
```
