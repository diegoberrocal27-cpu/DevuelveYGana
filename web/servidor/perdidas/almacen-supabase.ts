import type { AlmacenDePerdidas, LimiteDeIntentos, ResultadoDelAlmacen } from "./puertos";

type RespuestaDeRpc = { data: unknown; error: { code?: string } | null };

export interface ClienteConRpc {
  rpc(funcion: string, argumentos: Record<string, unknown>): PromiseLike<RespuestaDeRpc>;
}

async function llamar(cliente: ClienteConRpc, funcion: string, argumentos: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await cliente.rpc(funcion, argumentos);
  if (error) throw new Error(`Falló ${funcion} (código ${error.code ?? "desconocido"})`);
  return data;
}

export function crearAlmacenDePerdidasSupabase(cliente: ClienteConRpc): AlmacenDePerdidas {
  return {
    async registrar(duenoId, datos, maximoDePerdidasActivas) {
      const respuesta = (await llamar(cliente, "registrar_perdida", {
        p_dueno: duenoId,
        p_categoria: datos.categoria,
        p_descripcion: datos.descripcion,
        p_fecha: datos.fecha,
        p_distrito: datos.distrito,
        p_rasgos: datos.rasgos,
        p_maximo: maximoDePerdidasActivas,
      })) as ResultadoDelAlmacen | null;
      if (!respuesta || typeof respuesta.estado !== "string") throw new Error("Respuesta inesperada de registrar_perdida");
      return respuesta;
    },
  };
}

export function crearLimiteDeIntentosSupabase(cliente: ClienteConRpc): LimiteDeIntentos {
  return {
    async consumir(clave, maximo, ventanaEnSegundos) {
      const espera = await llamar(cliente, "consumir_intento", {
        p_clave: clave,
        p_maximo: maximo,
        p_ventana: `${ventanaEnSegundos} seconds`,
      });
      if (typeof espera !== "number") throw new Error("Respuesta inesperada de consumir_intento");
      return espera;
    },
  };
}
