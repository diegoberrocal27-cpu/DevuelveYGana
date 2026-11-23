import type { ButtonHTMLAttributes } from "react";

export type VarianteBoton = "primario" | "secundario" | "peligro";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquesa " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variantes: Record<VarianteBoton, string> = {
  primario: "bg-turquesa-oscuro text-white hover:bg-marino",
  secundario: "border-2 border-marino bg-superficie text-marino hover:bg-turquesa-claro",
  peligro: "bg-error text-white hover:bg-marino",
};

/** Clases del botón; sirven también para dar forma de botón a un enlace (<Link>). */
export function estilosBoton(variante: VarianteBoton = "primario", anchoCompleto = false): string {
  return `${base} ${variantes[variante]} ${anchoCompleto ? "w-full" : ""}`.trim();
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  anchoCompleto?: boolean;
  cargando?: boolean;
};

export default function Boton({
  variante = "primario",
  anchoCompleto = false,
  cargando = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...resto
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${estilosBoton(variante, anchoCompleto)} ${className}`.trim()}
      {...resto}
    >
      {cargando && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
