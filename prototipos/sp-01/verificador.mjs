import { normalizarCelular } from "./celular.mjs";
import { generarCodigo, protegerCodigo, sonIguales } from "./codigo.mjs";
import { POLITICA_POR_DEFECTO } from "./politica.mjs";

const MINUTO_MS = 60_000;

const rechazo = (motivo, extra = {}) => ({ ok: false, motivo, ...extra });
const minutosHasta = (instante, ahora) => Math.ceil((instante - ahora) / MINUTO_MS);
const segundosHasta = (instante, ahora) => Math.ceil((instante - ahora) / 1000);

export function crearVerificador({ almacen, enviador, reloj, secreto, politica = POLITICA_POR_DEFECTO, sortear }) {
  function estaBloqueado(registro, ahora) {
    return Boolean(registro?.bloqueadoHasta) && registro.bloqueadoHasta > ahora;
  }

  function rechazoPorBloqueo(registro, ahora) {
    return rechazo("bloqueado", { minutosRestantes: minutosHasta(registro.bloqueadoHasta, ahora) });
  }

  async function solicitarCodigo(entrada) {
    const celular = normalizarCelular(entrada);
    if (!celular) return rechazo("celular_invalido");

    const ahora = reloj.ahora();
    const anterior = await almacen.buscar(celular);
    if (estaBloqueado(anterior, ahora)) return rechazoPorBloqueo(anterior, ahora);

    const puedeVolverAPedirEn = (anterior?.enviadoEn ?? -Infinity) + politica.esperaEntreEnviosMs;
    if (ahora < puedeVolverAPedirEn) {
      return rechazo("espera", { segundosRestantes: segundosHasta(puedeVolverAPedirEn, ahora) });
    }

    const codigo = generarCodigo(sortear);
    const venceEn = ahora + politica.vigenciaMs;
    await almacen.guardar(celular, {
      codigoProtegido: protegerCodigo({ codigo, celular, secreto }),
      venceEn,
      enviadoEn: ahora,
      errores: 0,
      bloqueadoHasta: null,
    });

    try {
      await enviador.enviar({ celular, codigo });
    } catch (error) {
      await almacen.borrar(celular);
      throw error;
    }
    return { ok: true, venceEn };
  }

  async function verificarCodigo(entradaCelular, codigoIngresado) {
    const celular = normalizarCelular(entradaCelular);
    if (!celular) return rechazo("celular_invalido");

    const ahora = reloj.ahora();
    const registro = await almacen.buscar(celular);
    if (estaBloqueado(registro, ahora)) return rechazoPorBloqueo(registro, ahora);
    if (!registro || registro.venceEn <= ahora) return rechazo("vencido");

    const ingresado = protegerCodigo({ codigo: String(codigoIngresado ?? "").trim(), celular, secreto });
    if (sonIguales(ingresado, registro.codigoProtegido)) {
      await almacen.borrar(celular);
      return { ok: true };
    }

    const errores = registro.errores + 1;
    if (errores >= politica.maximoDeErrores) {
      const bloqueadoHasta = ahora + politica.bloqueoMs;
      await almacen.guardar(celular, { ...registro, errores, bloqueadoHasta });
      return rechazo("bloqueado", { minutosRestantes: minutosHasta(bloqueadoHasta, ahora) });
    }
    await almacen.guardar(celular, { ...registro, errores });
    return rechazo("incorrecto", { intentosRestantes: politica.maximoDeErrores - errores });
  }

  return { solicitarCodigo, verificarCodigo };
}
