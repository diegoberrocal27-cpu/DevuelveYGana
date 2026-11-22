import { createHmac } from "node:crypto";

const LARGO_MINIMO_SECRETO = 32;

export function normalizarDni(dni) {
  const limpio = String(dni ?? "").trim();
  if (!/^\d{8}$/.test(limpio)) throw new RangeError("DNI inválido: deben ser 8 dígitos");
  return limpio;
}

export function cargarSecreto(entorno = process.env) {
  const secreto = entorno.DNI_HMAC_SECRET;
  if (!secreto || secreto.length < LARGO_MINIMO_SECRETO) {
    throw new Error(`DNI_HMAC_SECRET falta o tiene menos de ${LARGO_MINIMO_SECRETO} caracteres`);
  }
  return secreto;
}

function calcularHmac(dominio, valor, secreto) {
  return createHmac("sha256", secreto).update(`${dominio}:v1:${valor}`).digest("hex");
}

export function hmacDni(dni, secreto) {
  return calcularHmac("dni", normalizarDni(dni), secreto);
}

export function hmacFechaEmision(fecha, secreto) {
  const limpia = String(fecha ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpia) || Number.isNaN(Date.parse(limpia))) {
    throw new RangeError("Fecha de emisión inválida: use AAAA-MM-DD");
  }
  return calcularHmac("emision", limpia, secreto);
}
