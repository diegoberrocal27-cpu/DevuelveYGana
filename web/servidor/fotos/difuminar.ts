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

// Copia pública de los objetos que no son documentos: nítida, pero reducida y sin metadatos.
export const PARAMETROS_COPIA_PUBLICA = { ancho: 640, calidad: 75 };

/**
 * Copia que verá el público en el catálogo.
 * - DNI: difuminada (SP-03), porque lleva nombre, número y rostro.
 * - Celular, laptop y cartera: nítida, reducida a 640 px y sin metadatos (ubicación GPS, modelo del celular).
 *   La prueba de que el objeto es de alguien son los rasgos ocultos, no la foto.
 */
export async function prepararCopiaPublica(original: Uint8Array, categoria: string): Promise<Uint8Array> {
  if (categoria === "dni") return difuminarFoto(original);
  const { ancho, calidad } = PARAMETROS_COPIA_PUBLICA;
  return sharp(original, { limitInputPixels: PIXELES_MAXIMOS })
    .rotate()
    .resize({ width: ancho, height: ancho, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: calidad, mozjpeg: true })
    .toBuffer();
}
