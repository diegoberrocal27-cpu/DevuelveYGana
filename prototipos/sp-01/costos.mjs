export const PRECIO_USD_POR_MENSAJE = { sms: 0.2476, whatsapp: 0.03, correo: 0 };
export const TIPO_DE_CAMBIO = 3.45;
export const MENSAJES_POR_USUARIO = 1.3;
export const PRESUPUESTO_MENSUAL_SOLES = 150;

export function costoPorUsuarioEnSoles(canal, { mensajesPorUsuario = MENSAJES_POR_USUARIO, tipoDeCambio = TIPO_DE_CAMBIO } = {}) {
  return PRECIO_USD_POR_MENSAJE[canal] * mensajesPorUsuario * tipoDeCambio;
}

export function costoMensualEnSoles(canal, usuariosNuevos, opciones) {
  return costoPorUsuarioEnSoles(canal, opciones) * usuariosNuevos;
}

export function usuariosQueEntranEnElPresupuesto(canal, presupuestoEnSoles = PRESUPUESTO_MENSUAL_SOLES, opciones) {
  const costo = costoPorUsuarioEnSoles(canal, opciones);
  return costo === 0 ? Infinity : Math.floor(presupuestoEnSoles / costo);
}
