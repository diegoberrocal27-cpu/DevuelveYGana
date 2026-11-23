import sharp from "sharp";

export async function crearFotoDeCelular({ ancho = 4000, alto = 3000, textos = ["DNI 45871236", "IMEI 356938035643809"] } = {}) {
  const lineas = textos
    .map((t, i) => `<text x="${ancho * 0.08}" y="${alto * 0.3 + i * alto * 0.12}" font-family="Inter, sans-serif" font-size="${alto * 0.07}" font-weight="700" fill="#101010">${t}</text>`)
    .join("");
  const dibujo = Buffer.from(`
    <svg width="${ancho}" height="${alto}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${ancho * 0.05}" y="${alto * 0.15}" width="${ancho * 0.6}" height="${alto * 0.55}" fill="#f2efe6"/>
      <circle cx="${ancho * 0.8}" cy="${alto * 0.4}" r="${alto * 0.18}" fill="#c98b5a"/>
      ${lineas}
    </svg>`);

  return sharp({
    create: { width: ancho, height: alto, channels: 3, background: "#6b7f6a", noise: { type: "gaussian", mean: 128, sigma: 35 } },
  })
    .composite([{ input: dibujo }])
    .jpeg({ quality: 95 })
    .toBuffer();
}
