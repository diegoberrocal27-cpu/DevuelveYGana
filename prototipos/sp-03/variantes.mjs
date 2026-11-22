import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { crearFotoDeCelular } from "./foto-de-prueba.mjs";

const carpeta = process.argv[2];
const combinaciones = [
  [640, 0],
  [640, 4],
  [640, 8],
  [640, 14],
  [640, 20],
  [320, 0],
  [320, 6],
  [320, 10],
  [320, 14],
];

await mkdir(carpeta, { recursive: true });
await writeFile(`${carpeta}/texto.jpg`, await crearFotoDeCelular());

for (const nombre of ["texto", "cara"]) {
  const original = await readFile(`${carpeta}/${nombre}.jpg`);
  for (const [ancho, nivel] of combinaciones) {
    let imagen = sharp(original).rotate().resize({ width: ancho, withoutEnlargement: true });
    if (nivel > 0) imagen = imagen.blur(nivel);
    const resultado = await imagen.jpeg({ quality: 55, mozjpeg: true }).toBuffer();
    await writeFile(`${carpeta}/${nombre}-${ancho}-${nivel}.jpg`, resultado);
  }
}
