export const ACCIONES_DE_EVENTO = [
  "registro",
  "verificacion_celular",
  "perdida_publicada",
  "hallazgo_publicado",
] as const;

export type AccionDeEvento = (typeof ACCIONES_DE_EVENTO)[number];

export function esAccionDeEvento(valor: string): valor is AccionDeEvento {
  return (ACCIONES_DE_EVENTO as readonly string[]).includes(valor);
}
