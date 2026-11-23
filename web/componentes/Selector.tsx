import type { SelectHTMLAttributes } from "react";
import { estiloAyuda, estiloControl, estiloError, estiloEtiqueta } from "./estilosCampo";

export type Opcion = { valor: string; etiqueta: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  etiqueta: string;
  opciones: readonly Opcion[];
  textoVacio?: string;
  error?: string;
  ayuda?: string;
};

export default function Selector({
  name,
  id,
  etiqueta,
  opciones,
  textoVacio = "Selecciona una opción",
  error,
  ayuda,
  required,
  ...resto
}: Props) {
  const idCampo = id ?? name;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className={estiloEtiqueta}>
        {etiqueta}
        {required && <span className="text-error"> *</span>}
      </label>
      <select
        id={idCampo}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        className={estiloControl(Boolean(error))}
        {...resto}
      >
        <option value="">{textoVacio}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
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
