import type { InputHTMLAttributes, ReactNode } from "react";
import { estiloError } from "./estilosCampo";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  name: string;
  children: ReactNode;
  error?: string;
};

/** Casilla de verificación con su texto y su error (por ejemplo, la declaración de buena fe). */
export default function Casilla({ name, id, children, error, ...resto }: Props) {
  const idCampo = id ?? name;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={idCampo}
        className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-superficie p-4 text-sm ${
          error ? "border-error" : "border-borde"
        }`}
      >
        <input
          id={idCampo}
          name={name}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={idError}
          className="mt-0.5 h-5 w-5 shrink-0 accent-turquesa-oscuro"
          {...resto}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={idError} className={estiloError}>
          {error}
        </p>
      )}
    </div>
  );
}
