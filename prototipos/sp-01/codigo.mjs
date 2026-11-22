import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const LARGO_CODIGO = 6;

export function generarCodigo(sortear = randomInt) {
  return String(sortear(0, 10 ** LARGO_CODIGO)).padStart(LARGO_CODIGO, "0");
}

export function protegerCodigo({ codigo, celular, secreto }) {
  return createHmac("sha256", secreto).update(`codigo:v1:${celular}:${codigo}`).digest("hex");
}

export function sonIguales(protegidoA, protegidoB) {
  const a = Buffer.from(protegidoA, "hex");
  const b = Buffer.from(protegidoB, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
