// SP-02 · Rasgos ocultos por categoría (según HU-02: 3 campos por categoría, se exigen al menos 2).
// Para el DNI el número se guarda como HMAC (ver dni-hmac.mjs); sus 2 rasgos mínimos son una propuesta.

export const RASGOS_POR_CATEGORIA = {
  celular: ['fondo_pantalla', 'imei_ultimos_4', 'detalle_fisico'],
  laptop:  ['serie', 'calcomanias', 'fondo_pantalla'],
  cartera: ['contenido', 'detalle_fisico', 'cantidad_tarjetas'],
  // DNI: el objeto se identifica por su número, así que no tiene "rasgos propios" como los demás.
  // Sus dos rasgos mínimos (los dos se guardan solo como HMAC):
  dni:     ['dni_hmac', 'fecha_emision_hmac'],
};

export const MINIMO_RASGOS = 2;

/**
 * Valida los rasgos que llegan del formulario. Devuelve { ok, errores }.
 * `rasgos` es un objeto { tipo: valor }.
 */
export function validarRasgos(categoria, rasgos) {
  const permitidos = RASGOS_POR_CATEGORIA[categoria];
  if (!permitidos) return { ok: false, errores: [`categoría desconocida: ${categoria}`] };
  const errores = [];
  const llenos = [];
  for (const [tipo, valor] of Object.entries(rasgos ?? {})) {
    if (!permitidos.includes(tipo)) errores.push(`rasgo no permitido para ${categoria}: ${tipo}`);
    else if (String(valor ?? '').trim() !== '') llenos.push(tipo);
  }
  if (llenos.length < MINIMO_RASGOS) {
    errores.push(`faltan rasgos: se exigen al menos ${MINIMO_RASGOS} de ${permitidos.length} (llenos: ${llenos.length})`);
  }
  return { ok: errores.length === 0, errores };
}
