import type { Categoria } from "@/lib/catalogos";

/** Quien publica. Lo entrega la sesión de HU-01. */
export type UsuarioActual = {
  id: string;
  verificado: boolean;
  bloqueado: boolean;
};

export type FotoSubida = {
  contenido: Uint8Array;
  tipo: string;
  tamano: number;
};

/** Lo que llega del formulario «Encontré algo». */
export type DatosHallazgo = {
  categoria: string;
  descripcion: string;
  dia: string;
  distrito: string;
  buenaFe: boolean;
  foto: FotoSubida | null;
};

export type CampoHallazgo = "categoria" | "descripcion" | "dia" | "distrito" | "buenaFe" | "foto";

export type ErroresHallazgo = Partial<Record<CampoHallazgo | "general", string>>;

/** Fila que se guarda en la tabla `hallazgos` (T-02). */
export type HallazgoNuevo = {
  id: string;
  halladorId: string;
  categoria: Categoria;
  descripcion: string;
  dia: string;
  distrito: string;
  fotoOriginalPath: string;
  fotoDifuminadaPath: string;
  buenaFeAceptada: true;
};

/** Lo único que ve el público: categoría, distrito y día (más el id). */
export type HallazgoPublico = {
  id: string;
  categoria: string;
  distrito: string;
  dia: string;
};

export interface AlmacenDeHallazgos {
  guardar(hallazgo: HallazgoNuevo): Promise<void>;
  listarPublicados(): Promise<HallazgoPublico[]>;
}

export type BucketDeFotos = "fotos-originales" | "fotos-difuminadas";

export interface AlmacenDeFotos {
  subir(bucket: BucketDeFotos, ruta: string, contenido: Uint8Array, tipo: string): Promise<void>;
  borrar(bucket: BucketDeFotos, ruta: string): Promise<void>;
}

/** Genera la copia difuminada (SP-03). Lanza error si el archivo no es una imagen. */
export type Difuminar = (original: Uint8Array) => Promise<Uint8Array>;

/**
 * Anota el evento del piloto. Tiene la misma forma que `registrarEvento` de T-04,
 * así que cuando T-04 esté en main se conecta sin cambiar nada aquí.
 */
export type AnotarEvento = (accion: "hallazgo_publicado", usuarioId: string, distrito: string) => Promise<void>;
