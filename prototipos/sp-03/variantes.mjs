import { mkdir, readFile, writeFile } from "node:fs/promises";
import { difuminarFoto } from "./difuminar.mjs";
import { crearFotoDeCelular } from "./foto-de-prueba.mjs";

const CALIDAD = 55;
const COMBINACIONES = [
  [640, 0], [640, 4], [640, 8], [640, 14], [640, 20],
  [320, 0], [320, 6], [320, 10], [320, 14],
];

const carpeta = process.argv[2];
await mkdir(carpeta, { recursive: true });
await writeFile(`${carpeta}/texto.jpg`, await crearFotoDeCelular());

for (const nombre of ["texto", "cara"]) {
  const original = await readFile(`${carpeta}/${nombre}.jpg`);
  for (const [ancho, difuminado] of COMBINACIONES) {
    const copia = await difuminarFoto(original, { ancho, difuminado, calidad: CALIDAD });
    await writeFile(`${carpeta}/${nombre}-${ancho}-${difuminado}.jpg`, copia);
  }
}
