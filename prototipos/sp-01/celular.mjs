const FORMATO_CELULAR = /^9\d{8}$/;

export function normalizarCelular(entrada) {
  const limpio = String(entrada ?? "").replace(/[\s-]/g, "");
  return FORMATO_CELULAR.test(limpio) ? limpio : null;
}
