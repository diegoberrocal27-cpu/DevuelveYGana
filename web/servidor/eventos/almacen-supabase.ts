import type { AlmacenDeEventos } from "./almacen-de-eventos";
import type { Evento } from "./evento";

type RespuestaDeInsercion = { error: { code?: string } | null };

export interface ClienteQueInserta {
  from(tabla: string): {
    insert(fila: Record<string, unknown>): PromiseLike<RespuestaDeInsercion>;
  };
}

export function crearAlmacenSupabase(cliente: ClienteQueInserta): AlmacenDeEventos {
  return {
    async guardar({ accion, usuarioId, distrito }: Evento) {
      const { error } = await cliente
        .from("eventos")
        .insert({ accion, usuario_id: usuarioId, distrito });
      if (error) {
        throw new Error(`No se pudo insertar en eventos (código ${error.code ?? "desconocido"})`);
      }
    },
  };
}
