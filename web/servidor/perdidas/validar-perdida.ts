import { CATEGORIAS, DISTRITOS, type Categoria } from "@/lib/catalogos";
import { MINIMO_DE_RASGOS, rasgosDeCategoria } from "@/lib/rasgos";
import { hayErrores, longitudMaxima, longitudMinima, requerido, validar, type Errores } from "@/lib/validacion";
import { esFechaValida } from "../compartido/fechas";
import { hmacDni, hmacFechaEmision } from "./dni";
import type { DatosDePerdida, RasgoParaGuardar } from "./puertos";

export type EntradaDePerdida = {
  categoria: string;
  descripcion: string;
  fecha: string;
  distrito: string;
  rasgos: Record<string, string>;
};

export type ResultadoDeValidacion =
  | { ok: true; datos: DatosDePerdida }
  | { ok: false; errores: Errores<string> };

const FORMATO_DNI = /^\d{8}$/;
const FORMATO_IMEI = /^\d{4}$/;
const FORMATO_CANTIDAD = /^\d{1,2}$/;
const MAXIMO_POR_RASGO = 200;

const esCategoria = (valor: string): valor is Categoria => CATEGORIAS.some((c) => c.valor === valor);
const estaLleno = (valor: string | undefined) => (valor ?? "").trim() !== "";

function validarRasgos(categoria: Categoria, rasgos: Record<string, string>, hoy: string): Errores<string> {
  const definidos = rasgosDeCategoria(categoria);
  const llenos = definidos.filter((r) => estaLleno(rasgos[r.campo]));
  const errores: Errores<string> = {};

  if (llenos.length < MINIMO_DE_RASGOS) {
    errores.rasgos = `Llena al menos ${MINIMO_DE_RASGOS} de los ${definidos.length} rasgos ocultos.`;
  }

  for (const { campo } of llenos) {
    const valor = rasgos[campo].trim();
    if (valor.length > MAXIMO_POR_RASGO) errores[campo] = `Escribe como máximo ${MAXIMO_POR_RASGO} caracteres.`;
    else if (campo === "dni" && !FORMATO_DNI.test(valor)) errores[campo] = "Ingresa los 8 dígitos del DNI.";
    else if (campo === "imei_ultimos_4" && !FORMATO_IMEI.test(valor)) errores[campo] = "Ingresa solo 4 dígitos.";
    else if (campo === "cantidad_tarjetas" && !FORMATO_CANTIDAD.test(valor)) errores[campo] = "Ingresa un número.";
    else if (campo === "fecha_emision" && (!esFechaValida(valor) || valor > hoy)) {
      errores[campo] = "Ingresa una fecha de emisión válida.";
    }
  }
  return errores;
}

function validarCampos(entrada: EntradaDePerdida, hoy: string): Errores<string> {
  const { categoria, descripcion, fecha, distrito } = entrada;
  const errores: Errores<string> = validar(
    { categoria, descripcion, fecha, distrito },
    {
      categoria: [requerido("Elige la categoría del objeto.")],
      descripcion: [requerido("Describe el objeto."), longitudMinima(10), longitudMaxima(500)],
      fecha: [requerido("Indica el día en que lo perdiste.")],
      distrito: [requerido("Elige el distrito.")],
    },
  );

  if (!errores.categoria && !esCategoria(categoria)) errores.categoria = "Elige una categoría de la lista.";
  if (!errores.distrito && !(DISTRITOS as readonly string[]).includes(distrito)) {
    errores.distrito = "Elige un distrito de la lista.";
  }
  if (!errores.fecha && (!esFechaValida(fecha) || fecha > hoy)) {
    errores.fecha = "Ingresa una fecha válida que no sea posterior a hoy.";
  }
  if (esCategoria(categoria)) Object.assign(errores, validarRasgos(categoria, entrada.rasgos, hoy));
  return errores;
}

/** El número de DNI y su fecha de emisión se convierten en HMAC aquí, antes de salir hacia la base. */
function protegerRasgos(categoria: Categoria, rasgos: Record<string, string>, secretoDeDni: () => string): RasgoParaGuardar[] {
  return rasgosDeCategoria(categoria)
    .filter((r) => estaLleno(rasgos[r.campo]))
    .map(({ campo }) => {
      const valor = rasgos[campo].trim();
      if (campo === "dni") return { tipo: "dni_hmac", valor: hmacDni(valor, secretoDeDni()) };
      if (campo === "fecha_emision") return { tipo: "fecha_emision_hmac", valor: hmacFechaEmision(valor, secretoDeDni()) };
      return { tipo: campo, valor };
    });
}

export function validarPerdida(
  entrada: EntradaDePerdida,
  contexto: { hoy: string; secretoDeDni: () => string },
): ResultadoDeValidacion {
  const errores = validarCampos(entrada, contexto.hoy);
  if (hayErrores(errores)) return { ok: false, errores };

  return {
    ok: true,
    datos: {
      categoria: entrada.categoria,
      descripcion: entrada.descripcion.trim(),
      fecha: entrada.fecha,
      distrito: entrada.distrito,
      rasgos: protegerRasgos(entrada.categoria as Categoria, entrada.rasgos, contexto.secretoDeDni),
    },
  };
}
