import { createHmac } from "node:crypto";

const LARGO_MINIMO_SECRETO = 32;

export function cargarSecretoDeDni(entorno: Record<string, string | undefined> = process.env): string {
  const secreto = entorno.DNI_HMAC_SECRET;
  if (!secreto || secreto.length < LARGO_MINIMO_SECRETO) {
    throw new Error(`DNI_HMAC_SECRET falta o tiene menos de ${LARGO_MINIMO_SECRETO} caracteres`);
  }
  return secreto;
}

function calcularHmac(dominio: string, valor: string, secreto: string): string {
  return createHmac("sha256", secreto).update(`${dominio}:v1:${valor}`).digest("hex");
}

export const hmacDni = (dni: string, secreto: string) => calcularHmac("dni", dni, secreto);
export const hmacFechaEmision = (fecha: string, secreto: string) => calcularHmac("emision", fecha, secreto);
