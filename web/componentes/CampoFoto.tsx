"use client";

import { useState, type InputHTMLAttributes, type Ref } from "react";
import { estiloAyuda, estiloError, estiloEtiqueta } from "./estilosCampo";
import { IconoCamara } from "./iconosCategoria";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "accept"> & {
  name: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  ref?: Ref<HTMLInputElement>;
  /** Nombre del archivo ya elegido (por ejemplo, al volver a este paso). */
  archivoElegido?: string;
};

/** Campo para elegir una foto (cámara o galería) y ver el nombre del archivo elegido. */
export default function CampoFoto({
  name,
  id,
  etiqueta,
  error,
  ayuda,
  required,
  onChange,
  ref,
  archivoElegido = "",
  ...resto
}: Props) {
  const idCampo = id ?? name;
  const [nombre, setNombre] = useState(archivoElegido);
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <span className={estiloEtiqueta}>
        {etiqueta}
        {required && <span className="text-error"> *</span>}
      </span>
      <label
        htmlFor={idCampo}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed bg-turquesa-claro/40 p-4 text-center text-sm ${
          error ? "border-error" : "border-borde hover:border-turquesa"
        }`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-turquesa-claro text-turquesa-oscuro">
          <IconoCamara />
        </span>
        <span className="font-semibold text-turquesa-oscuro">{nombre ? "Cambiar foto" : "Tomar o elegir una foto"}</span>
        <span className="max-w-full truncate text-texto-secundario">{nombre || "JPG, PNG o WebP"}</span>
      </label>
      <input
        ref={ref}
        id={idCampo}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        className="sr-only"
        onChange={(evento) => {
          setNombre(evento.target.files?.[0]?.name ?? "");
          onChange?.(evento);
        }}
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
