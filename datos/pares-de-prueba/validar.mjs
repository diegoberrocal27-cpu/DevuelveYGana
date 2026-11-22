import { readFileSync } from "node:fs";
import { crearVecindad, validarPares } from "./validador.mjs";

function leerJson(nombre) {
  return JSON.parse(readFileSync(new URL(nombre, import.meta.url), "utf8"));
}

const pares = leerJson("pares.json");
const { vecinos } = leerJson("distritos.json");
const errores = validarPares(pares, crearVecindad(vecinos));

if (errores.length > 0) {
  console.error(errores.join("\n"));
  process.exit(1);
}

const correctos = pares.filter((par) => par.etiqueta === "correcto").length;
console.log(`Correcto: ${pares.length} pares (${correctos} correctos y ${pares.length - correctos} incorrectos)`);
