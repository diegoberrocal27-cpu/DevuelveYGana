import type { AlmacenDeFotos, AlmacenDeHallazgos, HallazgoPublico } from "./tipos";

/**
 * Adaptadores de Supabase para HU-03. Necesitan el cliente del SERVIDOR (clave service_role).
 * Nunca usar el cliente del navegador: la descripción y la foto original son privadas.
 *
 * Se describe solo lo que se usa del cliente, igual que en T-04, para no depender de cómo se cree.
 */
type ErrorSupabase = { message?: string; code?: string } | null;

type FilaPublica = { id: string; categoria: string; distrito: string; dia: string; foto_difuminada_path: string | null };

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
        ): PromiseLike<{ data: FilaPublica[] | null; error: ErrorSupabase }>;
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
      createSignedUrls(
        rutas: string[],
        segundos: number,
      ): PromiseLike<{ data: { path: string | null; signedUrl: string | null }[] | null; error: ErrorSupabase }>;
    };
  };
}

/** Las URLs de las fotos difuminadas vencen a la hora: no sirven para copiarlas y compartirlas. */
const SEGUNDOS_URL_FOTO = 3600;

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
      // Lista blanca: solo se piden las columnas públicas y la ruta de la copia difuminada.
      const { data, error } = await cliente
        .from("hallazgos")
        .select("id, categoria, distrito, dia, foto_difuminada_path")
        .eq("estado", "publicado")
        .order("creado_en", { ascending: false });
      if (error) throw fallo("No se pudo leer el catálogo", error);
      const filas = data ?? [];

      // Enlaces temporales a las copias difuminadas. Si fallan, el catálogo se muestra igual, sin fotos.
      const rutas = filas.map((f) => f.foto_difuminada_path).filter((r): r is string => Boolean(r));
      const enlaces = new Map<string, string>();
      if (rutas.length > 0) {
        const firmadas = await cliente.storage.from("fotos-difuminadas").createSignedUrls(rutas, SEGUNDOS_URL_FOTO);
        for (const { path, signedUrl } of firmadas.data ?? []) {
          if (path && signedUrl) enlaces.set(path, signedUrl);
        }
      }

      return filas.map((f): HallazgoPublico => {
        const foto = f.foto_difuminada_path ? enlaces.get(f.foto_difuminada_path) : undefined;
        const base = { id: f.id, categoria: f.categoria, distrito: f.distrito, dia: f.dia };
        return foto ? { ...base, foto } : base;
      });
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
