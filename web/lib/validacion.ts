// Reglas de validación reutilizables. Cada regla devuelve un mensaje de error en español o null si el valor es válido.

export type Regla = (valor: string) => string | null;

export const requerido =
  (mensaje = "Este campo es obligatorio."): Regla =>
  (valor) =>
    valor.trim() === "" ? mensaje : null;

export const longitudMinima =
  (minimo: number, mensaje?: string): Regla =>
  (valor) =>
    valor.trim() !== "" && valor.trim().length < minimo
      ? (mensaje ?? `Escribe al menos ${minimo} caracteres.`)
      : null;

export const longitudMaxima =
  (maximo: number, mensaje?: string): Regla =>
  (valor) =>
    valor.trim().length > maximo ? (mensaje ?? `Escribe como máximo ${maximo} caracteres.`) : null;

export const celularPeruano =
  (mensaje = "Ingresa un celular de 9 dígitos que empiece con 9."): Regla =>
  (valor) =>
    valor.trim() !== "" && !/^9\d{8}$/.test(valor.trim()) ? mensaje : null;

export const correo =
  (mensaje = "Ingresa un correo válido."): Regla =>
  (valor) =>
    valor.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) ? mensaje : null;

export const fechaNoFutura =
  (hoy: string, mensaje = "La fecha no puede ser posterior a hoy."): Regla =>
  (valor) =>
    valor !== "" && valor > hoy ? mensaje : null;

export type Errores<Campo extends string> = Partial<Record<Campo, string>>;

/** Aplica las reglas de cada campo y devuelve el primer error de cada uno. */
export function validar<Campo extends string>(
  valores: Record<Campo, string>,
  reglas: Partial<Record<Campo, Regla[]>>,
): Errores<Campo> {
  const errores: Errores<Campo> = {};
  for (const campo of Object.keys(reglas) as Campo[]) {
    for (const regla of reglas[campo] ?? []) {
      const error = regla(valores[campo] ?? "");
      if (error) {
        errores[campo] = error;
        break;
      }
    }
  }
  return errores;
}

export function hayErrores<Campo extends string>(errores: Errores<Campo>): boolean {
  return Object.values(errores).some(Boolean);
}
