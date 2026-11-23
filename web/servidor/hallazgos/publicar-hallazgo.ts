import { randomUUID } from "node:crypto";
import type { Categoria } from "@/lib/catalogos";
import { hayErrores } from "@/lib/validacion";
import type {
  AlmacenDeFotos,
  AlmacenDeHallazgos,
  AnotarEvento,
  DatosHallazgo,
  Difuminar,
  ErroresHallazgo,
  UsuarioActual,
} from "./tipos";
import { fechaDeHoyEnLima, validarHallazgo } from "./validar-hallazgo";

export type ResultadoPublicacion = { ok: true; id: string } | { ok: false; errores: ErroresHallazgo };

type Dependencias = {
  almacen: AlmacenDeHallazgos;
  fotos: AlmacenDeFotos;
  difuminar: Difuminar;
  anotarEvento: AnotarEvento;
  generarId?: () => string;
  hoy?: () => string;
  anotarError?: (mensaje: string, causa: unknown) => void;
};

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const ERROR_GENERAL = "No se pudo publicar el hallazgo. Inténtalo otra vez.";

function anotarEnConsola(mensaje: string, causa: unknown) {
  console.error(`${mensaje}: ${causa instanceof Error ? causa.message : "causa desconocida"}`);
}

/**
 * HU-03: publicar un hallazgo.
 * Guarda la foto original en privado, genera la copia difuminada en el servidor y deja el hallazgo
 * publicado para que HU-04 lo compare. Gratis y sin límite de publicaciones.
 */
export function crearPublicarHallazgo({
  almacen,
  fotos,
  difuminar,
  anotarEvento,
  generarId = randomUUID,
  hoy = () => fechaDeHoyEnLima(),
  anotarError = anotarEnConsola,
}: Dependencias) {
  return async function publicarHallazgo(
    usuario: UsuarioActual | null,
    datos: DatosHallazgo,
  ): Promise<ResultadoPublicacion> {
    if (!usuario) return { ok: false, errores: { general: "Inicia sesión para publicar un hallazgo." } };
    if (usuario.bloqueado) return { ok: false, errores: { general: "Tu cuenta está bloqueada y no puede publicar." } };
    if (!usuario.verificado) {
      return { ok: false, errores: { general: "Verifica tu celular antes de publicar." } };
    }

    const errores = validarHallazgo(datos, hoy());
    if (hayErrores(errores) || !datos.foto) return { ok: false, errores };
    const foto = datos.foto;

    // 1. Difuminar antes de guardar nada: si el archivo no es una imagen, no queda ningún rastro.
    let copia: Uint8Array;
    try {
      copia = await difuminar(foto.contenido);
    } catch {
      return { ok: false, errores: { foto: "No pudimos leer la foto. Prueba con otra imagen (JPG, PNG o WebP)." } };
    }

    // 2. Las rutas se arman con el id del hallazgo, nunca con el nombre del archivo (SP-03).
    const id = generarId();
    const rutaOriginal = `${id}/original.${EXTENSION[foto.tipo]}`;
    const rutaDifuminada = `${id}/difuminada.jpg`;

    try {
      await fotos.subir("fotos-originales", rutaOriginal, foto.contenido, foto.tipo);
    } catch (causa) {
      anotarError("No se pudo subir la foto original", causa);
      return { ok: false, errores: { general: ERROR_GENERAL } };
    }

    // 3. Primero la original y después la copia. Si falla la copia, no se publica (SP-03).
    try {
      await fotos.subir("fotos-difuminadas", rutaDifuminada, copia, "image/jpeg");
    } catch (causa) {
      anotarError("No se pudo subir la copia difuminada", causa);
      await borrarSinFallar(fotos, [["fotos-originales", rutaOriginal]], anotarError);
      return { ok: false, errores: { general: ERROR_GENERAL } };
    }

    try {
      await almacen.guardar({
        id,
        halladorId: usuario.id,
        categoria: datos.categoria as Categoria,
        descripcion: datos.descripcion.trim(),
        dia: datos.dia,
        distrito: datos.distrito,
        fotoOriginalPath: rutaOriginal,
        fotoDifuminadaPath: rutaDifuminada,
        buenaFeAceptada: true,
      });
    } catch (causa) {
      anotarError("No se pudo guardar el hallazgo", causa);
      await borrarSinFallar(
        fotos,
        [
          ["fotos-originales", rutaOriginal],
          ["fotos-difuminadas", rutaDifuminada],
        ],
        anotarError,
      );
      return { ok: false, errores: { general: ERROR_GENERAL } };
    }

    // 4. Métrica del piloto (T-04). Nunca hace fallar la publicación.
    try {
      await anotarEvento("hallazgo_publicado", usuario.id, datos.distrito);
    } catch (causa) {
      anotarError("No se pudo anotar el evento", causa);
    }

    return { ok: true, id };
  };
}

async function borrarSinFallar(
  fotos: AlmacenDeFotos,
  archivos: [Parameters<AlmacenDeFotos["borrar"]>[0], string][],
  anotarError: (mensaje: string, causa: unknown) => void,
) {
  for (const [bucket, ruta] of archivos) {
    try {
      await fotos.borrar(bucket, ruta);
    } catch (causa) {
      anotarError(`No se pudo borrar ${bucket}/${ruta}`, causa);
    }
  }
}
