import type { Evento } from "./evento";

export interface AlmacenDeEventos {
  guardar(evento: Evento): Promise<void>;
}
