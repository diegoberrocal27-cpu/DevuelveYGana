export type RespuestaDeApi<Datos> = { ok: boolean; estado: number; datos: Datos };

type DatosDeError = { mensaje?: string; errores?: Record<string, string> };

const SIN_CONEXION = { mensaje: "No hay conexión. Revisa tu internet e intenta de nuevo." };

export async function enviarJson<Datos = Record<string, unknown>>(
  ruta: string,
  cuerpo: unknown,
  token: string,
): Promise<RespuestaDeApi<Datos & DatosDeError>> {
  try {
    const respuesta = await fetch(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(cuerpo),
    });
    const datos = await respuesta.json().catch(() => ({}));
    return { ok: respuesta.ok, estado: respuesta.status, datos };
  } catch {
    return { ok: false, estado: 0, datos: SIN_CONEXION as Datos & DatosDeError };
  }
}
