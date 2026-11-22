// SP-02 · Prototipo descartable: el DNI se guarda como HMAC, nunca en claro.
//
// Por qué HMAC y no un hash simple: el DNI tiene 8 dígitos (100 millones de posibilidades), así que
// un SHA-256 sin clave se adivina probando todos. El HMAC usa una clave secreta que vive SOLO en una
// variable de entorno del servidor (nunca en la base de datos ni en el repositorio): sin esa clave,
// quien robe la base de datos no puede probar candidatos.
import { createHmac } from 'node:crypto';

const MIN_SECRETO = 32; // caracteres; generar con: openssl rand -hex 32

export function normalizarDni(dni) {
  const limpio = String(dni ?? '').trim();
  if (!/^\d{8}$/.test(limpio)) throw new RangeError('DNI inválido: deben ser 8 dígitos');
  return limpio;
}

export function cargarSecreto(env = process.env) {
  const secreto = env.DNI_HMAC_SECRET;
  if (!secreto || secreto.length < MIN_SECRETO) {
    // Sin valor por defecto a propósito: si falta la clave, el servidor no debe arrancar a ciegas.
    throw new Error(`DNI_HMAC_SECRET falta o tiene menos de ${MIN_SECRETO} caracteres`);
  }
  return secreto;
}

// Prefijo de dominio ("dni:v1:") para que el mismo secreto no produzca el mismo HMAC en otro uso
// (p. ej. la fecha de emisión) y para poder cambiar de versión más adelante.
function hmac(etiqueta, valor, secreto) {
  return createHmac('sha256', secreto).update(`${etiqueta}:v1:${valor}`).digest('hex');
}

/** HMAC-SHA256 en hexadecimal (64 caracteres). Mismo DNI + misma clave = mismo resultado (sirve para emparejar). */
export function hmacDni(dni, secreto = cargarSecreto()) {
  return hmac('dni', normalizarDni(dni), secreto);
}

/** Segundo rasgo mínimo del DNI (propuesta): fecha de emisión, también protegida con HMAC. Formato AAAA-MM-DD. */
export function hmacFechaEmision(fecha, secreto = cargarSecreto()) {
  const f = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || Number.isNaN(Date.parse(f))) {
    throw new RangeError('Fecha de emisión inválida: use AAAA-MM-DD');
  }
  return hmac('emision', f, secreto);
}
