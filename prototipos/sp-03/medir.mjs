import { performance } from "node:perf_hooks";
import { difuminarFoto } from "./difuminar.mjs";
import { crearFotoDeCelular } from "./foto-de-prueba.mjs";

const REPETICIONES = 10;

const original = await crearFotoDeCelular();
await difuminarFoto(original);

const tiempos = [];
let resultado;
for (let i = 0; i < REPETICIONES; i++) {
  const inicio = performance.now();
  resultado = await difuminarFoto(original);
  tiempos.push(performance.now() - inicio);
}
tiempos.sort((a, b) => a - b);

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
console.log(`original: ${mb(original.length)} MB`);
console.log(`difuminada: ${(resultado.length / 1024).toFixed(1)} KB`);
console.log(`tiempo mediana: ${tiempos[Math.floor(REPETICIONES / 2)].toFixed(0)} ms, peor: ${tiempos.at(-1).toFixed(0)} ms`);
