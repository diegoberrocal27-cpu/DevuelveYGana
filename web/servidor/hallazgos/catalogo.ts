import type { AlmacenDeHallazgos, HallazgoPublico } from "./tipos";

/**
 * Catálogo público (HU-03). Se arma con una lista blanca: aunque el almacén devolviera
 * más campos, al público solo salen id, categoría, distrito y día. Nunca fotos.
 */
export function crearListarCatalogo(almacen: AlmacenDeHallazgos) {
  return async function listarCatalogo(): Promise<HallazgoPublico[]> {
    const hallazgos = await almacen.listarPublicados();
    return hallazgos.map(({ id, categoria, distrito, dia }) => ({ id, categoria, distrito, dia }));
  };
}
