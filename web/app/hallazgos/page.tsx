import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Aviso from "@/componentes/Aviso";
import { estilosBoton } from "@/componentes/Boton";
import Cargando from "@/componentes/Cargando";
import TarjetaPublicacion from "@/componentes/TarjetaPublicacion";
import { leerCatalogo } from "@/servidor/catalogo-publico";
import { fechaDeHoyEnLima } from "@/servidor/hallazgos";

export const metadata: Metadata = {
  title: "Objetos encontrados · DevuelveyGana",
};

async function ListaDeHallazgos() {
  // El catálogo se lee en cada visita para mostrar siempre lo último publicado.
  await connection();
  const hallazgos = await leerCatalogo();

  if (!hallazgos) {
    return <Aviso tipo="error">No pudimos cargar los objetos encontrados. Inténtalo en unos minutos.</Aviso>;
  }
  if (hallazgos.length === 0) {
    return <Aviso tipo="info">Todavía no hay objetos encontrados publicados.</Aviso>;
  }
  const hoy = fechaDeHoyEnLima();

  return (
    <ul className="flex flex-col gap-3">
      {hallazgos.map((hallazgo) => (
        <li key={hallazgo.id}>
          <TarjetaPublicacion
            tipo="hallazgo"
            categoria={hallazgo.categoria}
            distrito={hallazgo.distrito}
            dia={hallazgo.dia}
            hoy={hoy}
          />
        </li>
      ))}
    </ul>
  );
}

/** Catálogo público de hallazgos (HU-03). Solo categoría, distrito y día; los filtros llegan con HU-12. */
export default function PaginaHallazgos() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Objetos encontrados</h1>
        <p className="text-texto-secundario">
          Por seguridad solo mostramos qué objeto es, el distrito y el día. Si es tuyo, publica tu pérdida y te
          avisaremos si coincide.
        </p>
      </div>
      <Link href="/perdi" className={estilosBoton("secundario", true)}>
        Perdí algo
      </Link>
      <Suspense fallback={<Cargando texto="Cargando hallazgos…" />}>
        <ListaDeHallazgos />
      </Suspense>
    </div>
  );
}
