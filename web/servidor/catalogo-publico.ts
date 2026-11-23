import {
  crearAlmacenDeHallazgosSupabase,
  crearListarCatalogo,
  type ClienteSupabaseServidor,
  type HallazgoPublico,
} from "./hallazgos";
import { clienteDelServidor } from "./supabase-servidor";

/**
 * Lee el catálogo público de hallazgos en el servidor (solo id, categoría, distrito y día).
 * Devuelve null si Supabase no está configurado o no responde. Lo usan Inicio y /hallazgos.
 */
export async function leerCatalogo(limite?: number): Promise<HallazgoPublico[] | null> {
  const db = clienteDelServidor();
  if (!db) return null;
  try {
    const hallazgos = await crearListarCatalogo(crearAlmacenDeHallazgosSupabase(db as unknown as ClienteSupabaseServidor))();
    return limite ? hallazgos.slice(0, limite) : hallazgos;
  } catch (causa) {
    console.error(`[hallazgos] ${causa instanceof Error ? causa.message : "No se pudo leer el catálogo"}`);
    return null;
  }
}
