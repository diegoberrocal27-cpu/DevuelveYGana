import sharp from "sharp";

export const ANCHO_MAXIMO = 320;
export const NIVEL_DIFUMINADO = 10;
export const CALIDAD_JPEG = 55;
export const PIXELES_MAXIMOS = 60_000_000;

export async function difuminarFoto(original) {
  return sharp(original, { limitInputPixels: PIXELES_MAXIMOS })
    .rotate()
    .resize({ width: ANCHO_MAXIMO, height: ANCHO_MAXIMO, fit: "inside", withoutEnlargement: true })
    .blur(NIVEL_DIFUMINADO)
    .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
    .toBuffer();
}
