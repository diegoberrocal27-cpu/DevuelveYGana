import { clienteDelServidor } from "@/servidor/supabase-servidor";

/**
 * Cuántas publicaciones (pérdidas + hallazgos) tiene la persona con sesión. Solo devuelve números.
 * Se cuenta en el servidor porque el navegador no puede filtrar por dueño (columnas privadas, T-02).
 */
export async function POST(peticion: Request) {
  const token = peticion.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return Response.json({ estado: "sesion" }, { status: 401 });

  const db = clienteDelServidor();
  if (!db) return Response.json({ estado: "servicio" }, { status: 503 });

  try {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return Response.json({ estado: "sesion" }, { status: 401 });

    const [perdidas, hallazgos] = await Promise.all([
      db.from("perdidas").select("id", { count: "exact", head: true }).eq("dueno_id", data.user.id),
      db.from("hallazgos").select("id", { count: "exact", head: true }).eq("hallador_id", data.user.id),
    ]);
    if (perdidas.error || hallazgos.error) throw new Error("No se pudo contar");

    return Response.json({
      estado: "ok",
      perdidas: perdidas.count ?? 0,
      hallazgos: hallazgos.count ?? 0,
    });
  } catch (causa) {
    console.error(`[actividad] ${causa instanceof Error ? causa.message : "error desconocido"}`);
    return Response.json({ estado: "servicio" }, { status: 503 });
  }
}
