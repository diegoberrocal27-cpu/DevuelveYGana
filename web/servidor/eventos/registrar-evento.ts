import { esAccionDeEvento, type AccionDeEvento } from "./acciones";
import type { AlmacenDeEventos } from "./almacen-de-eventos";
import { EventoInvalido, validarEvento } from "./evento";

export type AnotadorDeErrores = (mensaje: string, causa: unknown) => void;

export type RegistrarEvento = (
  accion: AccionDeEvento,
  usuarioId: string | null,
  distrito: string | null,
) => Promise<void>;

type Dependencias = {
  almacen: AlmacenDeEventos;
  anotarError?: AnotadorDeErrores;
};

function anotarEnConsola(mensaje: string, causa: unknown) {
  const detalle = causa instanceof Error ? causa.message : "causa desconocida";
  console.error(`${mensaje}: ${detalle}`);
}

export function crearRegistrarEvento({
  almacen,
  anotarError = anotarEnConsola,
}: Dependencias): RegistrarEvento {
  return async (accion, usuarioId, distrito) => {
    try {
      if (!esAccionDeEvento(accion)) {
        throw new EventoInvalido("la acción no es una de las acciones registrables");
      }
      await almacen.guardar(validarEvento({ accion, usuarioId, distrito }));
    } catch (causa) {
      const descartado = causa instanceof EventoInvalido;
      anotarError(
        descartado ? "Evento descartado" : `No se pudo registrar el evento ${String(accion)}`,
        causa,
      );
    }
  };
}
