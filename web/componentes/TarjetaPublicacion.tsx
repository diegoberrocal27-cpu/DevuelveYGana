import { etiquetaDeCategoria } from "@/lib/catalogos";

type Props = {
  tipo: "perdida" | "hallazgo";
  categoria: string;
  distrito: string;
  /** Fecha en formato AAAA-MM-DD */
  dia: string;
  estado?: string;
};

/** Convierte "2026-11-20" en "20/11/2026" sin depender de la zona horaria. */
export function formatearDia(dia: string): string {
  const [anio, mes, diaDelMes] = dia.split("-");
  return anio && mes && diaDelMes ? `${diaDelMes}/${mes}/${anio}` : dia;
}

/** Tarjeta pública: solo muestra categoría, distrito y día (HU-03). */
export default function TarjetaPublicacion({ tipo, categoria, distrito, dia, estado }: Props) {
  const esHallazgo = tipo === "hallazgo";

  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            esHallazgo ? "bg-turquesa-claro text-turquesa-oscuro" : "bg-aviso-claro text-aviso"
          }`}
        >
          {esHallazgo ? "Encontrado" : "Perdido"}
        </span>
        {estado && <span className="text-xs text-texto-secundario">{estado}</span>}
      </div>
      <h3 className="text-lg font-semibold">{etiquetaDeCategoria(categoria)}</h3>
      <p className="text-sm text-texto-secundario">
        {distrito} · {formatearDia(dia)}
      </p>
    </article>
  );
}
