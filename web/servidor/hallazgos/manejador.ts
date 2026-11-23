import type { ResultadoPublicacion } from "./publicar-hallazgo";
import type { DatosHallazgo, ErroresHallazgo, UsuarioActual } from "./tipos";

/**
 * Lógica HTTP de `POST /api/hallazgos` (HU-03), separada de Next y de Supabase para poder probarla.
 * Sigue las mismas respuestas que `POST /api/perdidas` (HU-02).
 */
type Dependencias = {
  /** Devuelve la persona dueña del token, o null si el token no es válido o el correo no está confirmado. */
  autenticar: (token: string) => Promise<UsuarioActual | null>;
  publicar: (usuario: UsuarioActual, datos: DatosHallazgo) => Promise<ResultadoPublicacion>;
  anotarError?: (mensaje: string, causa: unknown) => void;
};

export type RespuestaHallazgo =
  | { estado: "publicado"; id: string }
  | { estado: "datos_invalidos"; errores: ErroresHallazgo; mensaje: string }
  | { estado: "sesion" | "no_habilitada" | "suspendida" | "formato_invalido" | "servicio"; mensaje: string };

const MENSAJES = {
  sesion: "Tu sesión terminó. Vuelve a entrar desde Mi perfil.",
  no_habilitada: "Verifica tu celular antes de publicar.",
  suspendida: "Tu cuenta está suspendida y no puede publicar.",
  formato_invalido: "No pudimos leer el formulario. Inténtalo otra vez.",
  servicio: "No se pudo publicar el hallazgo. Inténtalo otra vez en unos minutos.",
  datos_invalidos: "Revisa los campos marcados.",
} as const;

function responder(cuerpo: RespuestaHallazgo, status: number) {
  return Response.json(cuerpo, { status });
}

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** Convierte el formulario multipart en los datos del caso de uso. La foto llega como archivo. */
export async function leerFormulario(formulario: FormData): Promise<DatosHallazgo> {
  const archivo = formulario.get("foto");
  const foto =
    archivo instanceof Blob && archivo.size > 0
      ? { contenido: new Uint8Array(await archivo.arrayBuffer()), tipo: archivo.type, tamano: archivo.size }
      : null;
  return {
    categoria: texto(formulario, "categoria"),
    descripcion: texto(formulario, "descripcion"),
    dia: texto(formulario, "dia"),
    distrito: texto(formulario, "distrito"),
    buenaFe: texto(formulario, "buenaFe") === "si",
    foto,
  };
}

function anotarEnConsola(mensaje: string, causa: unknown) {
  console.error(`[hallazgos] ${mensaje}: ${causa instanceof Error ? causa.message : "causa desconocida"}`);
}

export function crearManejadorDeHallazgos({ autenticar, publicar, anotarError = anotarEnConsola }: Dependencias) {
  return async function manejar(peticion: Request): Promise<Response> {
    const token = peticion.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return responder({ estado: "sesion", mensaje: MENSAJES.sesion }, 401);

    let usuario: UsuarioActual | null;
    try {
      usuario = await autenticar(token);
    } catch (causa) {
      anotarError("No se pudo comprobar la sesión", causa);
      return responder({ estado: "servicio", mensaje: MENSAJES.servicio }, 503);
    }
    if (!usuario) return responder({ estado: "sesion", mensaje: MENSAJES.sesion }, 401);
    if (usuario.bloqueado) return responder({ estado: "suspendida", mensaje: MENSAJES.suspendida }, 403);
    if (!usuario.verificado) return responder({ estado: "no_habilitada", mensaje: MENSAJES.no_habilitada }, 403);

    const formulario = await peticion.formData().catch(() => null);
    if (!formulario) return responder({ estado: "formato_invalido", mensaje: MENSAJES.formato_invalido }, 400);

    let resultado: ResultadoPublicacion;
    try {
      resultado = await publicar(usuario, await leerFormulario(formulario));
    } catch (causa) {
      anotarError("Falló la publicación", causa);
      return responder({ estado: "servicio", mensaje: MENSAJES.servicio }, 503);
    }

    if (resultado.ok) return responder({ estado: "publicado", id: resultado.id }, 201);

    // Un error "general" sin errores de campos es una falla del servidor (Storage o base de datos).
    const { general, ...deCampos } = resultado.errores;
    if (Object.keys(deCampos).length === 0) {
      return responder({ estado: "servicio", mensaje: general ?? MENSAJES.servicio }, 503);
    }
    return responder({ estado: "datos_invalidos", errores: deCampos, mensaje: MENSAJES.datos_invalidos }, 400);
  };
}
