import type { Reloj } from "./reloj";

const DESFASE_LIMA_MS = -5 * 60 * 60 * 1000;

/** Día actual en Lima (AAAA-MM-DD), que es donde se usa la aplicación. */
export function hoyEnLima(reloj: Reloj): string {
  return new Date(reloj.ahora() + DESFASE_LIMA_MS).toISOString().slice(0, 10);
}

export function esFechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && new Date(`${fecha}T00:00:00Z`).toISOString().startsWith(fecha);
}
