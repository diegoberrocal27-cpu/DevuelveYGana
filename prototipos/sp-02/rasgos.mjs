export const MINIMO_RASGOS = 2;

export const RASGOS_POR_CATEGORIA = {
  celular: ["fondo_pantalla", "imei_ultimos_4", "detalle_fisico"],
  laptop: ["serie", "calcomanias", "fondo_pantalla"],
  cartera: ["contenido", "detalle_fisico", "cantidad_tarjetas"],
  dni: ["dni_hmac", "fecha_emision_hmac"],
};

export function validarRasgos(categoria, rasgos) {
  const permitidos = RASGOS_POR_CATEGORIA[categoria];
  if (!permitidos) return { ok: false, errores: [`categoría desconocida: ${categoria}`] };

  const errores = [];
  const llenos = [];
  for (const [tipo, valor] of Object.entries(rasgos ?? {})) {
    if (!permitidos.includes(tipo)) errores.push(`rasgo no permitido para ${categoria}: ${tipo}`);
    else if (String(valor ?? "").trim() !== "") llenos.push(tipo);
  }
  if (llenos.length < MINIMO_RASGOS) {
    errores.push(`faltan rasgos: se exigen al menos ${MINIMO_RASGOS} de ${permitidos.length} (llenos: ${llenos.length})`);
  }
  return { ok: errores.length === 0, errores };
}
