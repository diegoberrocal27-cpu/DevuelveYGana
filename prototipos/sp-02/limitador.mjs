// SP-02 · Limitador de intentos (rate limiting) de ventana fija.
// Sirve para que nadie pruebe DNI uno por uno. Prototipo EN MEMORIA: en Vercel cada instancia del
// servidor tiene su propia memoria, así que en producción el contador debe vivir en un lugar
// compartido (una tabla de Supabase o un almacén tipo Redis/KV).

export function crearLimitador({ maximo, ventanaMs, ahora = () => Date.now() }) {
  const contadores = new Map(); // clave -> { desde, usados }
  return {
    /** Devuelve { permitido, restantes, reintentarEnMs }. */
    intentar(clave) {
      const t = ahora();
      let c = contadores.get(clave);
      if (!c || t - c.desde >= ventanaMs) {
        c = { desde: t, usados: 0 };
        contadores.set(clave, c);
      }
      if (c.usados >= maximo) {
        return { permitido: false, restantes: 0, reintentarEnMs: ventanaMs - (t - c.desde) };
      }
      c.usados += 1;
      return { permitido: true, restantes: maximo - c.usados, reintentarEnMs: 0 };
    },
  };
}
