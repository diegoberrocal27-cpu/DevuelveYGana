import type { AccionDeEvento } from "./acciones";

export type Evento = {
  accion: AccionDeEvento;
  usuarioId: string | null;
  distrito: string | null;
};

export class EventoInvalido extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARECE_DATO_PERSONAL = /\d{8,}|@/;
const LARGO_MAXIMO_DEL_DISTRITO = 80;

export function normalizarDistrito(distrito: string | null): string | null {
  const limpio = distrito?.trim() ?? "";
  return limpio === "" ? null : limpio;
}

export function validarEvento(evento: Evento): Evento {
  const distrito = normalizarDistrito(evento.distrito);

  if (evento.usuarioId !== null && !UUID.test(evento.usuarioId)) {
    throw new EventoInvalido("el usuario no tiene formato de identificador");
  }
  if (distrito !== null && distrito.length > LARGO_MAXIMO_DEL_DISTRITO) {
    throw new EventoInvalido("el distrito es demasiado largo");
  }
  if (distrito !== null && PARECE_DATO_PERSONAL.test(distrito)) {
    throw new EventoInvalido("el distrito parece contener un dato personal");
  }
  return { accion: evento.accion, usuarioId: evento.usuarioId, distrito };
}
