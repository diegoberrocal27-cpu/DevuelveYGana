import type { Categoria } from "./catalogos";

export const MINIMO_DE_RASGOS = 2;

export type DefinicionDeRasgo = { campo: string; etiqueta: string; ayuda?: string };

export const RASGOS_POR_CATEGORIA: Record<Categoria, readonly DefinicionDeRasgo[]> = {
  celular: [
    { campo: "fondo_pantalla", etiqueta: "Fondo de pantalla", ayuda: "Describe la imagen que tiene." },
    { campo: "imei_ultimos_4", etiqueta: "Últimos 4 dígitos del IMEI", ayuda: "Marca *#06# para verlo." },
    { campo: "detalle_fisico", etiqueta: "Un detalle físico", ayuda: "Rayones, funda, golpes." },
  ],
  laptop: [
    { campo: "serie", etiqueta: "Número de serie" },
    { campo: "calcomanias", etiqueta: "Calcomanías", ayuda: "Cuáles tiene y dónde." },
    { campo: "fondo_pantalla", etiqueta: "Fondo de pantalla" },
  ],
  cartera: [
    { campo: "contenido", etiqueta: "Contenido", ayuda: "Qué llevaba dentro." },
    { campo: "detalle_fisico", etiqueta: "Un detalle físico", ayuda: "Marca, desgaste, cierre." },
    { campo: "cantidad_tarjetas", etiqueta: "Cantidad de tarjetas" },
  ],
  dni: [
    { campo: "dni", etiqueta: "Número de DNI", ayuda: "8 dígitos. Se guarda protegido." },
    { campo: "fecha_emision", etiqueta: "Fecha de emisión", ayuda: "Está impresa en el DNI." },
  ],
};

export function rasgosDeCategoria(categoria: string): readonly DefinicionDeRasgo[] {
  return RASGOS_POR_CATEGORIA[categoria as Categoria] ?? [];
}
