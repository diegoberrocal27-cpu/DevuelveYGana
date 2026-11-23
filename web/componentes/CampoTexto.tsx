import type { InputHTMLAttributes } from "react";
import { estiloAyuda, estiloControl, estiloError, estiloEtiqueta } from "./estilosCampo";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
};

export default function CampoTexto({ name, id, etiqueta, error, ayuda, required, ...resto }: Props) {
  const idCampo = id ?? name;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className={estiloEtiqueta}>
        {etiqueta}
        {required && <span className="text-error"> *</span>}
      </label>
      <input
        id={idCampo}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        className={estiloControl(Boolean(error))}
        {...resto}
      />
      {ayuda && (
        <p id={idAyuda} className={estiloAyuda}>
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className={estiloError}>
          {error}
        </p>
      )}
    </div>
  );
}
