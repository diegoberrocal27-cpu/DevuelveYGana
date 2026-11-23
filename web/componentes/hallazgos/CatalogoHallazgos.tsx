"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CATEGORIAS, DISTRITOS } from "@/lib/catalogos";
import type { HallazgoPublico } from "@/servidor/hallazgos";
import Boton from "../Boton";
import { estiloControl } from "../estilosCampo";
import TarjetaPublicacion from "../TarjetaPublicacion";

const POR_TANDA = 6;
const FILTROS = [{ valor: "", etiqueta: "Todos" }, ...CATEGORIAS];

/**
 * Lista de lo que otros encontraron, filtrable por categoría y distrito.
 * Los filtros trabajan sobre los datos públicos ya recibidos (los filtros completos llegan con HU-12).
 */
export default function CatalogoHallazgos({ hallazgos, hoy }: { hallazgos: HallazgoPublico[]; hoy: string }) {
  const parametros = useSearchParams();
  const inicial = parametros.get("categoria") ?? "";
  const [categoria, setCategoria] = useState(CATEGORIAS.some((c) => c.valor === inicial) ? inicial : "");
  const [distrito, setDistrito] = useState("");
  const [visibles, setVisibles] = useState(POR_TANDA);

  const filtrados = hallazgos.filter(
    (h) => (!categoria || h.categoria === categoria) && (!distrito || h.distrito === distrito),
  );

  function elegirCategoria(valor: string) {
    setCategoria(valor);
    setVisibles(POR_TANDA);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por categoría">
        {FILTROS.map(({ valor, etiqueta }) => {
          const activo = categoria === valor;
          return (
            <button
              key={valor || "todos"}
              type="button"
              aria-pressed={activo}
              onClick={() => elegirCategoria(valor)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquesa ${
                activo
                  ? "bg-marino text-white"
                  : "bg-superficie text-marino ring-1 ring-borde hover:ring-turquesa"
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-texto-secundario" aria-live="polite">
          {filtrados.length === 1 ? "1 objeto" : `${filtrados.length} objetos`}
        </p>
        <label className="sr-only" htmlFor="filtro-distrito">
          Distrito
        </label>
        <select
          id="filtro-distrito"
          value={distrito}
          onChange={(e) => {
            setDistrito(e.target.value);
            setVisibles(POR_TANDA);
          }}
          className={`${estiloControl(false)} min-h-10! w-auto max-w-[60%] py-2! text-sm`}
        >
          <option value="">Todos los distritos</option>
          {DISTRITOS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-borde px-4 py-8 text-center">
          <p className="font-semibold">Nadie ha publicado algo así todavía.</p>
          <p className="text-sm text-texto-secundario">Publica tu pérdida y te avisaremos cuando aparezca.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtrados.slice(0, visibles).map((h) => (
            <li key={h.id}>
              <TarjetaPublicacion
                tipo="hallazgo"
                categoria={h.categoria}
                distrito={h.distrito}
                dia={h.dia}
                hoy={hoy}
                foto={h.foto}
              />
            </li>
          ))}
        </ul>
      )}

      {filtrados.length > visibles && (
        <Boton variante="secundario" anchoCompleto onClick={() => setVisibles((n) => n + POR_TANDA)}>
          Ver más
        </Boton>
      )}
    </div>
  );
}
