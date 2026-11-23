import { randomUUID } from "node:crypto";
import { hmacDni } from "./dni-hmac.mjs";

const respuesta = (estado, cuerpo, cabeceras = {}) => ({ estado, cuerpo, cabeceras });
const DATOS_INVALIDOS = () => respuesta(400, { error: "datos inválidos" });

export function crearPublicadorDeHallazgos({ almacen, limiteDeIntentos, secreto }) {
  function calcularDniHmac(datos) {
    try {
      return hmacDni(datos.dni, secreto);
    } catch (error) {
      if (error instanceof RangeError) return null;
      throw error;
    }
  }

  function avisarCoincidencias(hallazgo) {
    for (const perdida of almacen.buscarPerdidasPorDniHmac(hallazgo.dni_hmac)) {
      almacen.guardarAlerta({ para: perdida.dueno, categoria: "dni", distrito: hallazgo.distrito, dia: hallazgo.dia });
    }
  }

  return function publicar({ usuario, ip, datos }) {
    if (!usuario) return respuesta(401, { error: "requiere sesión" });

    const esDni = datos.categoria === "dni";
    if (esDni) {
      const limite = limiteDeIntentos.intentar({ usuario, ip });
      if (!limite.permitido) {
        return respuesta(429, { error: "demasiados intentos" }, { "retry-after": String(limite.reintentarEnSegundos) });
      }
    }

    const dniHmac = esDni ? calcularDniHmac(datos) : null;
    if (esDni && !dniHmac) return DATOS_INVALIDOS();
    if (!datos.categoria || !datos.distrito || !datos.dia) return DATOS_INVALIDOS();

    const hallazgo = {
      id: randomUUID(),
      hallador: usuario,
      categoria: datos.categoria,
      descripcion: datos.descripcion ?? "",
      distrito: datos.distrito,
      dia: datos.dia,
      estado: "publicado",
      dni_hmac: dniHmac,
    };
    almacen.guardarHallazgo(hallazgo);
    if (dniHmac) avisarCoincidencias(hallazgo);

    return respuesta(201, { id: hallazgo.id, estado: hallazgo.estado });
  };
}
