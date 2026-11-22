import sharp from "sharp";

export const PARAMETROS_POR_DEFECTO = { ancho: 320, difuminado: 10, calidad: 55 };
export const PIXELES_MAXIMOS = 60_000_000;

export async function difuminarFoto(original, { ancho, difuminado, calidad } = PARAMETROS_POR_DEFECTO) {
  let foto = sharp(original, { limitInputPixels: PIXELES_MAXIMOS })
    .rotate()
    .resize({ width: ancho, height: ancho, fit: "inside", withoutEnlargement: true });
  if (difuminado > 0) foto = foto.blur(difuminado);
  return foto.jpeg({ quality: calidad, mozjpeg: true }).toBuffer();
}
