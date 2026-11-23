import sharp from "sharp";

// Parámetros decididos en el spike SP-03: con 320 px y difuminado 10 no se leen números ni rostros.
export const PARAMETROS_DIFUMINADO = { ancho: 320, difuminado: 10, calidad: 55 };
export const PIXELES_MAXIMOS = 60_000_000;

/**
 * Genera la copia difuminada en el servidor (HU-03, SP-03).
 * - Gira la foto según su orientación y luego elimina los metadatos (ubicación, modelo del celular).
 * - Lanza error si el archivo no es una imagen o supera 60 millones de píxeles.
 */
export async function difuminarFoto(original: Uint8Array): Promise<Uint8Array> {
  const { ancho, difuminado, calidad } = PARAMETROS_DIFUMINADO;
  return sharp(original, { limitInputPixels: PIXELES_MAXIMOS })
    .rotate()
    .resize({ width: ancho, height: ancho, fit: "inside", withoutEnlargement: true })
    .blur(difuminado)
    .jpeg({ quality: calidad, mozjpeg: true })
    .toBuffer();
}
