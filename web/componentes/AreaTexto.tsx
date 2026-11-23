import type { TextareaHTMLAttributes } from "react";
import { estiloAyuda, estiloControl, estiloError, estiloEtiqueta } from "./estilosCampo";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
};

export default function AreaTexto({ name, id, etiqueta, error, ayuda, required, rows = 4, ...resto }: Props) {
  const idCampo = id ?? name;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className={estiloEtiqueta}>
        {etiqueta}
        {required && <span className="text-error"> *</span>}
      </label>
      <textarea
        id={idCampo}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        className={`${estiloControl(Boolean(error))} resize-y`}
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
