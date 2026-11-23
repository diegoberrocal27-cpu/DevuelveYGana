const MENSAJES: Record<string, string> = {
  datos_invalidos: "Revisa los campos marcados.",
  no_habilitada: "Verifica tu celular para poder publicar.",
  limite: "Ya tienes una pérdida activa. Ciérrala o espera a que venza para registrar otra.",
  sesion: "Entra con tu cuenta para continuar.",
  formato_invalido: "No se pudo leer lo que enviaste.",
  servicio: "El servicio no está disponible. Vuelve a intentarlo en unos minutos.",
};

export function mensajeDeEstado(estado: string, reintentarEnSegundos?: number): string {
  if (estado === "demasiados_intentos") {
    const minutos = Math.max(1, Math.ceil((reintentarEnSegundos ?? 0) / 60));
    return `Hiciste demasiados intentos con DNI. Vuelve a probar en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
  }
  return MENSAJES[estado] ?? "No se pudo completar la acción.";
}
