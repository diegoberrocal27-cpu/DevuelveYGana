import { etiquetaDeCategoria } from "@/lib/catalogos";
import { IconoCategoria } from "./iconosCategoria";

type Props = {
  tipo: "perdida" | "hallazgo";
  categoria: string;
  distrito: string;
  /** Fecha en formato AAAA-MM-DD */
  dia: string;
  /** Día de hoy (AAAA-MM-DD) para escribir "hoy", "ayer" o "hace N días". Sin él se muestra la fecha. */
  hoy?: string;
  estado?: string;
};

/** Convierte "2026-11-20" en "20/11/2026" sin depender de la zona horaria. */
export function formatearDia(dia: string): string {
  const [anio, mes, diaDelMes] = dia.split("-");
  return anio && mes && diaDelMes ? `${diaDelMes}/${mes}/${anio}` : dia;
}

/** "hoy", "ayer", "hace 3 días" (hasta una semana); después, la fecha. */
export function describirDia(dia: string, hoy?: string): string {
  if (!hoy) return formatearDia(dia);
  const dias = Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${dia}T00:00:00Z`)) / 86_400_000);
  if (Number.isNaN(dias) || dias < 0 || dias > 7) return formatearDia(dia);
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/** Tarjeta pública: solo muestra categoría, distrito y día (HU-03). Nunca descripción ni foto. */
export default function TarjetaPublicacion({ tipo, categoria, distrito, dia, hoy, estado }: Props) {
  const esHallazgo = tipo === "hallazgo";

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-borde bg-superficie p-4 shadow-sm">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
          esHallazgo ? "bg-turquesa-claro text-turquesa-oscuro" : "bg-aviso-claro text-aviso"
        }`}
      >
        <IconoCategoria categoria={categoria} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="font-titulo text-lg font-semibold leading-tight">{etiquetaDeCategoria(categoria)}</h3>
        <p className="truncate text-sm text-texto-secundario">
          {esHallazgo ? "Encontrado" : "Perdido"} · {distrito} · {describirDia(dia, hoy)}
        </p>
        <p className={`text-xs font-bold tracking-wider ${esHallazgo ? "text-turquesa-oscuro" : "text-aviso"}`}>
          {esHallazgo ? "HALLAZGO" : "PÉRDIDA"}
          {estado && <span className="ml-2 font-normal tracking-normal text-texto-secundario">{estado}</span>}
        </p>
      </div>
    </article>
  );
}
