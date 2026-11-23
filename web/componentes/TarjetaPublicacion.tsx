import { etiquetaDeCategoria } from "@/lib/catalogos";
import { IconoCategoria, IconoReloj, IconoUbicacion } from "./iconosCategoria";

type Props = {
  tipo: "perdida" | "hallazgo";
  categoria: string;
  distrito: string;
  /** Fecha en formato AAAA-MM-DD */
  dia: string;
  /** Día de hoy (AAAA-MM-DD) para escribir "hoy", "ayer" o "hace N días". Sin él se muestra la fecha. */
  hoy?: string;
  /** URL temporal de la copia pública (difuminada si es DNI; nunca la original). */
  foto?: string;
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

/**
 * Tarjeta pública: categoría, distrito, día y, si hay, la foto pública (los DNI, difuminados).
 * Nunca la descripción: quien reclame debe probar con los rasgos ocultos que el objeto es suyo.
 */
export default function TarjetaPublicacion({ tipo, categoria, distrito, dia, hoy, foto, estado }: Props) {
  const esHallazgo = tipo === "hallazgo";
  const nombre = etiquetaDeCategoria(categoria);
  const dicho = describirDia(dia, hoy);
  const cuando = /^\d/.test(dicho) ? `el ${dicho}` : dicho;

  return (
    <article className="flex items-center gap-4 rounded-2xl bg-superficie p-3 ring-1 ring-borde">
      <div
        className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
          esHallazgo ? "bg-turquesa-claro text-turquesa-oscuro" : "bg-aviso-claro text-aviso"
        }`}
      >
        {foto ? (
          // Copia preparada en el servidor (sin metadatos; DNI difuminado); URL firmada que vence en una hora.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={categoria === "dni" ? "Foto difuminada de un DNI" : `Foto: ${nombre}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <IconoCategoria categoria={categoria} className="h-8 w-8" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-titulo text-base font-semibold">{nombre}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
              esHallazgo ? "bg-turquesa-claro text-turquesa-oscuro" : "bg-aviso-claro text-aviso"
            }`}
          >
            {esHallazgo ? "Encontrado" : "Perdido"}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-texto-secundario">
          <IconoUbicacion className="h-4 w-4 shrink-0" />
          <span className="truncate">{distrito}</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-texto-secundario">
          <IconoReloj className="h-4 w-4 shrink-0" />
          {esHallazgo ? "Encontrado" : "Perdido"} {cuando}
          {estado && <span className="ml-1">({estado})</span>}
        </p>
      </div>
    </article>
  );
}
