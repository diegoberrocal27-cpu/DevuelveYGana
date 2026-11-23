import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { relojDelSistema } from "@/servidor/compartido/reloj";
import { crearRegistrarEvento, crearAlmacenSupabase } from "@/servidor/eventos";
import { cargarSecretoDeDni } from "@/servidor/perdidas/dni";
import { crearAlmacenDePerdidasSupabase, crearLimiteDeIntentosSupabase } from "@/servidor/perdidas/almacen-supabase";
import { mensajeDeEstado } from "@/servidor/perdidas/mensajes";
import { crearRegistroDePerdidas } from "@/servidor/perdidas/registrar-perdida";

const ESTADO_HTTP: Record<string, number> = {
  creada: 201,
  datos_invalidos: 400,
  formato_invalido: 400,
  sesion: 401,
  no_habilitada: 403,
  limite: 409,
  demasiados_intentos: 429,
};

function variable(nombre: string) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable ${nombre}`);
  return valor;
}

function responder(cuerpo: { estado: string; [dato: string]: unknown }) {
  const mensaje = cuerpo.estado === "creada" ? undefined : mensajeDeEstado(cuerpo.estado, cuerpo.reintentarEnSegundos as number | undefined);
  return Response.json({ ...cuerpo, mensaje }, { status: ESTADO_HTTP[cuerpo.estado] ?? 503 });
}

/** Vercel pone esta cabecera en su infraestructura; fuera de Vercel todos comparten el mismo origen. */
function origenDe(peticion: Request, secreto: string): string {
  const ip = (process.env.VERCEL ? peticion.headers.get("x-vercel-forwarded-for") : null) ?? "local";
  return createHmac("sha256", secreto).update(`origen:${ip}`).digest("hex");
}

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

function rasgosDe(valor: unknown): Record<string, string> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return Object.fromEntries(Object.entries(valor).map(([campo, contenido]) => [campo, texto(contenido)]));
}

export async function POST(peticion: Request) {
  const token = peticion.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return responder({ estado: "sesion" });

  const cuerpo = await peticion.json().catch(() => null);
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return responder({ estado: "formato_invalido" });

  try {
    const db = createClient(variable("NEXT_PUBLIC_SUPABASE_URL"), variable("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user?.email_confirmed_at) return responder({ estado: "sesion" });

    const secreto = variable("DNI_HMAC_SECRET");
    const registro = crearRegistroDePerdidas({
      almacen: crearAlmacenDePerdidasSupabase(db),
      limite: crearLimiteDeIntentosSupabase(db),
      reloj: relojDelSistema,
      secretoDeDni: () => cargarSecretoDeDni({ DNI_HMAC_SECRET: secreto }),
    });
    const resultado = await registro.registrar({
      usuarioId: data.user.id,
      origen: origenDe(peticion, secreto),
      entrada: {
        categoria: texto(cuerpo.categoria),
        descripcion: texto(cuerpo.descripcion),
        fecha: texto(cuerpo.fecha),
        distrito: texto(cuerpo.distrito),
        rasgos: rasgosDe(cuerpo.rasgos),
      },
    });

    if (resultado.estado !== "creada") return responder(resultado);

    const registrarEvento = crearRegistrarEvento({ almacen: crearAlmacenSupabase(db) });
    await registrarEvento("perdida_publicada", data.user.id, resultado.distrito);
    return responder({ estado: "creada", id: resultado.id });
  } catch (error) {
    console.error(`[perdidas] ${error instanceof Error ? error.message : "error desconocido"}`);
    return responder({ estado: "servicio" });
  }
}
