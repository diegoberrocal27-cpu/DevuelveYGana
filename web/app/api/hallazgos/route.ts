import type { SupabaseClient } from "@supabase/supabase-js";
import { crearAlmacenSupabase, crearRegistrarEvento } from "@/servidor/eventos";
import { prepararCopiaPublica } from "@/servidor/fotos/difuminar";
import {
  crearAlmacenDeFotosSupabase,
  crearAlmacenDeHallazgosSupabase,
  crearPublicarHallazgo,
  type ClienteSupabaseServidor,
  type UsuarioActual,
} from "@/servidor/hallazgos";
import { crearManejadorDeHallazgos } from "@/servidor/hallazgos/manejador";
import { clienteDelServidor } from "@/servidor/supabase-servidor";

/** Comprueba el token de la sesión (HU-01) y lee si la cuenta está verificada o bloqueada. */
async function usuarioDelToken(db: SupabaseClient, token: string): Promise<UsuarioActual | null> {
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email_confirmed_at) return null;

  const { data: fila, error: errorDeFila } = await db
    .from("usuarios")
    .select("verificado, bloqueado")
    .eq("id", data.user.id)
    .maybeSingle();
  if (errorDeFila) throw new Error(`No se pudo leer el usuario (código ${errorDeFila.code})`);
  if (!fila) return null;
  return { id: data.user.id, verificado: fila.verificado === true, bloqueado: fila.bloqueado === true };
}

/** HU-03: publicar un objeto encontrado. Recibe multipart/form-data con la foto. */
export async function POST(peticion: Request) {
  const db = clienteDelServidor();
  if (!db) {
    console.error("[hallazgos] Falta configurar Supabase en web/.env.local");
    return Response.json({ estado: "servicio", mensaje: "El servicio no está configurado." }, { status: 503 });
  }

  // El cliente real cumple la forma mínima que usan los adaptadores.
  const cliente = db as unknown as ClienteSupabaseServidor;
  const registrarEvento = crearRegistrarEvento({ almacen: crearAlmacenSupabase(db) });

  const manejar = crearManejadorDeHallazgos({
    autenticar: (token) => usuarioDelToken(db, token),
    publicar: crearPublicarHallazgo({
      almacen: crearAlmacenDeHallazgosSupabase(cliente),
      fotos: crearAlmacenDeFotosSupabase(cliente),
      difuminar: prepararCopiaPublica,
      anotarEvento: (accion, usuarioId, distrito) => registrarEvento(accion, usuarioId, distrito),
    }),
  });
  return manejar(peticion);
}
