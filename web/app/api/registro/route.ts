import { createClient } from "@supabase/supabase-js";
import { createHmac, randomInt } from "node:crypto";
import { DISTRITOS } from "@/lib/catalogos";

const distritos: readonly string[] = [...DISTRITOS, "Otro"];
const acciones = ["disponible", "estado", "registrar", "verificar", "reenviar"];

function variable(nombre: string) {
  const valor = process.env[nombre];
  if (!valor) throw new Error("Configuración pendiente");
  return valor;
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];

  const datos = await request.json().catch(() => null);
  if (!datos || !acciones.includes(datos.accion)) return Response.json({ estado: "invalido" }, { status: 400 });
  try {
    const db = createClient(variable("NEXT_PUBLIC_SUPABASE_URL"), variable("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } });
    if (["disponible", "registrar"].includes(datos.accion) && (typeof datos.celular !== "string" ||
      !/^9\d{8}$/.test(datos.celular) || !distritos.includes(datos.distrito))) {
      return Response.json({ estado: "invalido" }, { status: 400 });
    }
    if (datos.accion === "disponible") {
      if (typeof datos.correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
        return Response.json({ estado: "invalido" }, { status: 400 });
      }
      // Vercel establece esta cabecera en su infraestructura. Fuera de Vercel se comparte el cupo.
      const ip = (process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") : null) ?? "local";
      const origen = createHmac("sha256", variable("OTP_SECRET")).update("ip:" + ip).digest("hex");
      const { data, error } = await db.rpc("registro_disponibilidad", { p_origen: origen, p_celular: datos.celular });
      if (error) throw new Error("No se pudo comprobar el celular");
      return Response.json({ estado: data });
    }
    if (!token) return Response.json({ estado: "sesion" }, { status: 401 });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user?.email_confirmed_at || !user.email) return Response.json({ estado: "sesion" }, { status: 401 });
    if (datos.accion === "verificar" && (typeof datos.codigo !== "string" || !/^\d{6}$/.test(datos.codigo))) {
      return Response.json({ estado: "invalido" }, { status: 400 });
    }
    const envio = ["registrar", "reenviar"].includes(datos.accion);
    const codigo = envio ? String(randomInt(1000000)).padStart(6, "0") : datos.codigo;
    const huella = codigo ? createHmac("sha256", variable("OTP_SECRET")).update(user.id + ":" + codigo).digest("hex") : null;

    async function operar(accion: string) {
      const { data, error } = await db.rpc("registro_operar", {
        p_usuario: user!.id, p_accion: accion, p_huella: huella,
        p_celular: datos.celular ?? null, p_distrito: datos.distrito ?? null,
      });
      if (error) throw new Error("Error de registro");
      return data as { estado: string; hasta?: string; destino?: string };
    }
    const resultado = await operar(datos.accion);
    if (resultado.estado !== "enviar") return Response.json(resultado);
    // Solo en desarrollo y sin Twilio configurado: el código se muestra en la terminal del servidor.
    if (process.env.NODE_ENV !== "production" && !process.env.TWILIO_ACCOUNT_SID) {
      console.info(`[registro] Código para ${resultado.destino}: ${codigo} (modo desarrollo, sin WhatsApp)`);
      return Response.json({ estado: "enviado" });
    }
    try {
      const sid = variable("TWILIO_ACCOUNT_SID");
      const respuesta = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(sid) + "/Messages.json", {
        method: "POST", signal: AbortSignal.timeout(12000),
        headers: { Authorization: "Basic " + Buffer.from(sid + ":" + variable("TWILIO_AUTH_TOKEN")).toString("base64") },
        body: new URLSearchParams({ From: variable("TWILIO_WHATSAPP_FROM"), To: "whatsapp:+51" + resultado.destino,
          ContentSid: variable("TWILIO_CONTENT_SID"), ContentVariables: JSON.stringify({ "1": codigo }) }),
      });
      if (!respuesta.ok) throw new Error("Envío fallido");
    } catch {
      await operar("cancelar");
      return Response.json({ estado: "falloEnvio" }, { status: 503 });
    }
    return Response.json({ estado: "enviado" });
  } catch {
    return Response.json({ estado: "servicio" }, { status: 503 });
  }
}
