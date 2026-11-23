import type { AlmacenDeFotos, AlmacenDeHallazgos, HallazgoPublico } from "./tipos";

/**
 * Adaptadores de Supabase para HU-03. Necesitan el cliente del SERVIDOR (clave service_role),
 * que llega con HU-01. Nunca usar el cliente del navegador: las fotos y la descripción son privadas.
 *
 * Se describe solo lo que se usa del cliente, igual que en T-04, para no depender de cómo se cree.
 */
type ErrorSupabase = { message?: string; code?: string } | null;

export interface ClienteSupabaseServidor {
  from(tabla: string): {
    insert(fila: Record<string, unknown>): PromiseLike<{ error: ErrorSupabase }>;
    select(columnas: string): {
      eq(
        columna: string,
        valor: string,
      ): {
        order(
          columna: string,
          opciones: { ascending: boolean },
        ): PromiseLike<{ data: HallazgoPublico[] | null; error: ErrorSupabase }>;
      };
    };
  };
  storage: {
    from(bucket: string): {
      upload(
        ruta: string,
        contenido: Uint8Array,
        opciones: { contentType: string; upsert: boolean },
      ): PromiseLike<{ error: ErrorSupabase }>;
      remove(rutas: string[]): PromiseLike<{ error: ErrorSupabase }>;
    };
  };
}

function fallo(accion: string, error: NonNullable<ErrorSupabase>): Error {
  return new Error(`${accion} (código ${error.code ?? "desconocido"})`);
}

export function crearAlmacenDeHallazgosSupabase(cliente: ClienteSupabaseServidor): AlmacenDeHallazgos {
  return {
    async guardar(h) {
      const { error } = await cliente.from("hallazgos").insert({
        id: h.id,
        hallador_id: h.halladorId,
        categoria: h.categoria,
        descripcion: h.descripcion,
        dia: h.dia,
        distrito: h.distrito,
        foto_original_path: h.fotoOriginalPath,
        foto_difuminada_path: h.fotoDifuminadaPath,
        buena_fe_aceptada: h.buenaFeAceptada,
      });
      if (error) throw fallo("No se pudo insertar en hallazgos", error);
    },
    async listarPublicados() {
      // Lista blanca: solo se piden las columnas públicas.
      const { data, error } = await cliente
        .from("hallazgos")
        .select("id, categoria, distrito, dia")
        .eq("estado", "publicado")
        .order("creado_en", { ascending: false });
      if (error) throw fallo("No se pudo leer el catálogo", error);
      return data ?? [];
    },
  };
}

export function crearAlmacenDeFotosSupabase(cliente: ClienteSupabaseServidor): AlmacenDeFotos {
  return {
    async subir(bucket, ruta, contenido, tipo) {
      const { error } = await cliente.storage.from(bucket).upload(ruta, contenido, { contentType: tipo, upsert: false });
      if (error) throw fallo(`No se pudo subir a ${bucket}`, error);
    },
    async borrar(bucket, ruta) {
      const { error } = await cliente.storage.from(bucket).remove([ruta]);
      if (error) throw fallo(`No se pudo borrar de ${bucket}`, error);
    },
  };
}
