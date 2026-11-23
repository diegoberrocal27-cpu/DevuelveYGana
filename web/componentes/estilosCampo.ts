// Estilos comunes de los campos del formulario (texto, área de texto y selector).

export const estiloEtiqueta = "text-sm font-semibold text-marino";

export function estiloControl(conError: boolean): string {
  return (
    "min-h-12 w-full rounded-xl border bg-superficie px-4 py-3 text-base text-marino " +
    "placeholder:text-texto-secundario/70 focus:outline-2 focus:outline-offset-1 " +
    (conError ? "border-error focus:outline-error" : "border-borde focus:outline-turquesa")
  );
}

export const estiloAyuda = "text-sm text-texto-secundario";
export const estiloError = "text-sm font-medium text-error";
