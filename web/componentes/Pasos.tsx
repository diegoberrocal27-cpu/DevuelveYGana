import { IconoAtras } from "./iconosCategoria";

type Props = {
  /** Qué se está publicando, p. ej. "Publicar una pérdida". */
  tarea: string;
  paso: number;
  total: number;
  /** Si se pasa, aparece el botón para volver al paso anterior. */
  onAtras?: () => void;
};

/** Encabezado de un formulario por pasos: volver, en qué paso está y cuánto falta. */
export default function Pasos({ tarea, paso, total, onAtras }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-10 items-center gap-2">
        {onAtras && (
          <button
            type="button"
            onClick={onAtras}
            aria-label="Volver al paso anterior"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-marino hover:bg-turquesa-claro focus-visible:outline-2 focus-visible:outline-turquesa"
          >
            <IconoAtras />
          </button>
        )}
        <p className="text-sm font-semibold text-turquesa-oscuro">
          {tarea} <span className="font-normal text-texto-secundario">— paso {paso} de {total}</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`${tarea}: paso ${paso} de ${total}`}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={paso}
        className="h-1.5 overflow-hidden rounded-full bg-borde"
      >
        <div
          className="h-full rounded-full bg-turquesa-oscuro transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${(paso / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
