import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Aviso from "@/componentes/Aviso";
import Cargando from "@/componentes/Cargando";
import CatalogoHallazgos from "@/componentes/hallazgos/CatalogoHallazgos";
import { IconoMas } from "@/componentes/iconosCategoria";
import { leerCatalogo } from "@/servidor/catalogo-publico";
import { fechaDeHoyEnLima } from "@/servidor/hallazgos";

export const metadata: Metadata = {
  title: "Perdí algo · DevuelveyGana",
};

async function Catalogo() {
  // Se lee en cada visita para mostrar lo último que se encontró.
  await connection();
  const hallazgos = await leerCatalogo();
  if (!hallazgos) {
    return <Aviso tipo="error">No pudimos cargar lo que otros encontraron. Inténtalo en unos minutos.</Aviso>;
  }
  return <CatalogoHallazgos hallazgos={hallazgos} hoy={fechaDeHoyEnLima()} />;
}

/**
 * Perdí algo: primero mira si alguien ya lo encontró; si no está, publica la pérdida (HU-02).
 * Las pérdidas de otros nunca se muestran: son privadas.
 */
export default function PaginaPerdi() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold leading-tight">¿Ya lo encontró alguien?</h1>
        <p className="text-texto-secundario">
          Revisa lo que otros encontraron. Mostramos qué es, dónde, cuándo y una foto; la de los DNI, difuminada.
        </p>
      </div>

      <Suspense fallback={<Cargando texto="Buscando objetos encontrados…" />}>
        <Catalogo />
      </Suspense>

      <section className="flex flex-col gap-3 rounded-3xl bg-marino p-5 text-white">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">¿No está aquí?</h2>
          <p className="text-white/80">
            Publica tu pérdida gratis. Cuando alguien encuentre algo parecido, te avisaremos.
          </p>
        </div>
        <Link
          href="/perdi/publicar"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-marino transition-colors hover:bg-turquesa-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <IconoMas /> Publicar mi pérdida
        </Link>
      </section>
    </div>
  );
}
