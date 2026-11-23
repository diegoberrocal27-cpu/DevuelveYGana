# Registro de eventos (T-04)

`registrarEvento` anota en la tabla `eventos` las acciones clave del piloto. Solo se usa desde el servidor.

## Cómo llamarla

```ts
await registrarEvento("perdida_publicada", usuario.id, perdida.distrito);
```

| Parámetro | Valor |
|---|---|
| `accion` | Una de `registro`, `verificacion_celular`, `perdida_publicada`, `hallazgo_publicado` |
| `usuarioId` | El `id` del usuario (UUID) o `null` |
| `distrito` | Nombre del distrito o `null` |

La fecha y hora la pone la base de datos.

## Qué garantiza

- Nunca lanza error: si el registro falla, la acción del usuario sigue y el error se anota con `console.error`.
- El evento guarda solo acción, usuario, distrito y fecha.
- Si el usuario no tiene formato de identificador, o el distrito parece un DNI, un correo o un texto largo, el evento se descarta y se anota un aviso que no repite ese dato.

## Cómo se conecta (una sola vez)

Cuando exista el cliente de Supabase del servidor (HU-01), con la llave de servicio, se crea la función una vez:

```ts
import { crearAlmacenSupabase, crearRegistrarEvento } from "@/servidor/eventos";

export const registrarEvento = crearRegistrarEvento({
  almacen: crearAlmacenSupabase(clienteDeServidor),
});
```

La tabla `eventos` solo la escribe el servidor (ver `docs/esquema.md` de T-02), por eso hace falta la llave de servicio y nunca el cliente del navegador.

## Cómo agregar una acción nueva

Añadirla a `ACCIONES_DE_EVENTO` en `acciones.ts`. Nada más cambia.

## Pruebas

```
cd web
npm test
```
