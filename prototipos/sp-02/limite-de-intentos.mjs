import { crearLimitador } from "./limitador.mjs";

export function crearLimiteDeIntentos({ maxPorUsuario = 5, maxPorIp = 20, ventanaMs = 3_600_000 } = {}) {
  const porUsuario = crearLimitador({ maximo: maxPorUsuario, ventanaMs });
  const porIp = crearLimitador({ maximo: maxPorIp, ventanaMs });

  return {
    intentar({ usuario, ip }) {
      const delUsuario = porUsuario.intentar(`usuario:${usuario}`);
      const delIp = porIp.intentar(`ip:${ip}`);
      const permitido = delUsuario.permitido && delIp.permitido;
      const esperaMs = Math.max(delUsuario.reintentarEnMs, delIp.reintentarEnMs);
      return { permitido, reintentarEnSegundos: Math.ceil(esperaMs / 1000) };
    },
  };
}
