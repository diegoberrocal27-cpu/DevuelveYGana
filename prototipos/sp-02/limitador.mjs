export function crearLimitador({ maximo, ventanaMs, ahora = () => Date.now() }) {
  const contadores = new Map();

  return {
    intentar(clave) {
      const instante = ahora();
      let contador = contadores.get(clave);
      if (!contador || instante - contador.desde >= ventanaMs) {
        contador = { desde: instante, usados: 0 };
        contadores.set(clave, contador);
      }
      if (contador.usados >= maximo) {
        return { permitido: false, reintentarEnMs: ventanaMs - (instante - contador.desde) };
      }
      contador.usados += 1;
      return { permitido: true, reintentarEnMs: 0 };
    },
  };
}
