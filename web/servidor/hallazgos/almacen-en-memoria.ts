import type { AlmacenDeFotos, AlmacenDeHallazgos, BucketDeFotos, HallazgoNuevo } from "./tipos";

type HallazgoGuardado = HallazgoNuevo & { estado: "publicado"; creadoEn: number };

/**
 * Almacenes en memoria: para las pruebas y para probar la pantalla mientras no esté
 * conectado Supabase. Se pierde todo al reiniciar el servidor.
 */
export function crearAlmacenesEnMemoria() {
  const hallazgos: HallazgoGuardado[] = [];
  const archivos = new Map<string, { contenido: Uint8Array; tipo: string }>();
  let contador = 0;

  const almacen: AlmacenDeHallazgos & { todos(): HallazgoGuardado[] } = {
    async guardar(hallazgo) {
      hallazgos.push({ ...hallazgo, estado: "publicado", creadoEn: contador++ });
    },
    async listarPublicados() {
      return hallazgos
        .filter((h) => h.estado === "publicado")
        .sort((a, b) => b.creadoEn - a.creadoEn)
        .map(({ id, categoria, distrito, dia }) => ({ id, categoria, distrito, dia }));
    },
    todos: () => hallazgos,
  };

  const fotos: AlmacenDeFotos & { archivos: typeof archivos } = {
    async subir(bucket: BucketDeFotos, ruta, contenido, tipo) {
      archivos.set(`${bucket}/${ruta}`, { contenido, tipo });
    },
    async borrar(bucket: BucketDeFotos, ruta) {
      archivos.delete(`${bucket}/${ruta}`);
    },
    archivos,
  };

  return { hallazgos: almacen, fotos };
}
