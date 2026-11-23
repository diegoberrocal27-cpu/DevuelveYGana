import { CATEGORIAS, DISTRITOS } from "@/lib/catalogos";
import { fechaNoFutura, longitudMaxima, longitudMinima, requerido, validar } from "@/lib/validacion";
import type { DatosHallazgo, ErroresHallazgo } from "./tipos";

export const TIPOS_DE_FOTO = ["image/jpeg", "image/png", "image/webp"] as const;

/** La foto llega reducida desde el celular; 4 MB deja margen bajo el límite de Vercel (4,5 MB) y del bucket (5 MB). */
export const PESO_MAXIMO_FOTO = 4 * 1024 * 1024;

export const DESCRIPCION_MINIMA = 10;
export const DESCRIPCION_MAXIMA = 200;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy en Ayacucho (AAAA-MM-DD), sin depender de la zona horaria del servidor. */
export function fechaDeHoyEnLima(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(ahora);
}

/** Valida en el servidor todo lo que llega del formulario. Devuelve un error por campo. */
export function validarHallazgo(datos: DatosHallazgo, hoy: string): ErroresHallazgo {
  const errores: ErroresHallazgo = validar(
    { categoria: datos.categoria, descripcion: datos.descripcion, dia: datos.dia, distrito: datos.distrito },
    {
      categoria: [requerido("Elige qué objeto encontraste.")],
      descripcion: [
        requerido("Describe brevemente el objeto."),
        longitudMinima(DESCRIPCION_MINIMA),
        longitudMaxima(DESCRIPCION_MAXIMA),
      ],
      dia: [requerido("Indica qué día lo encontraste."), fechaNoFutura(hoy)],
      distrito: [requerido("Elige el distrito donde lo encontraste.")],
    },
  );

  if (!errores.categoria && !CATEGORIAS.some((c) => c.valor === datos.categoria)) {
    errores.categoria = "Elige una categoría de la lista.";
  }
  if (!errores.distrito && !(DISTRITOS as readonly string[]).includes(datos.distrito)) {
    errores.distrito = "Elige un distrito de la lista.";
  }
  if (!errores.dia && !FECHA.test(datos.dia)) {
    errores.dia = "La fecha no es válida.";
  }

  if (!datos.buenaFe) {
    errores.buenaFe = "Para publicar debes aceptar la declaración de buena fe.";
  }

  if (!datos.foto || datos.foto.tamano === 0) {
    errores.foto = "Agrega una foto del objeto.";
  } else if (!(TIPOS_DE_FOTO as readonly string[]).includes(datos.foto.tipo)) {
    errores.foto = "La foto debe ser JPG, PNG o WebP.";
  } else if (datos.foto.tamano > PESO_MAXIMO_FOTO) {
    errores.foto = "La foto pesa más de 4 MB. Prueba con otra.";
  }

  return errores;
}
