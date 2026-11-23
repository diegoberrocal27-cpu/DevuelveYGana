import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Aviso from "@/componentes/Aviso";
import { estilosBoton } from "@/componentes/Boton";
import Cargando from "@/componentes/Cargando";
import { IconoUbicacion } from "@/componentes/iconosCategoria";
import TarjetaPublicacion from "@/componentes/TarjetaPublicacion";
import { leerCatalogo } from "@/servidor/catalogo-publico";
import { fechaDeHoyEnLima } from "@/servidor/hallazgos";

async function LoUltimo() {
  // Se lee en cada visita para mostrar lo último publicado.
  await connection();
  const hallazgos = await leerCatalogo(5);
  if (!hallazgos) return <Aviso tipo="error">No pudimos cargar las publicaciones. Inténtalo en unos minutos.</Aviso>;
  if (hallazgos.length === 0) {
    return <Aviso tipo="info">Aún no hay objetos encontrados. ¡El primero puede ser el tuyo!</Aviso>;
  }
  const hoy = fechaDeHoyEnLima();
  return (
    <ul className="flex flex-col gap-3">
      {hallazgos.map((h) => (
        <li key={h.id}>
          <TarjetaPublicacion tipo="hallazgo" categoria={h.categoria} distrito={h.distrito} dia={h.dia} hoy={hoy} />
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-turquesa-oscuro">¡Hola!</p>
        <h1 className="text-3xl font-bold leading-tight">Hagamos que vuelva a casa.</h1>
        <p className="text-texto-secundario">Encuentra o devuelve algo en tu comunidad.</p>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-turquesa-oscuro to-marino p-6 text-white shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-titulo text-xl font-semibold">Un pequeño gesto</p>
            <p className="text-white/80">puede cambiar el día de alguien.</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
            <IconoUbicacion />
          </div>
        </div>
        <p className="mt-6 text-xs font-semibold tracking-widest text-white/70">COMUNIDAD QUE AYUDA · 100% GRATIS</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/perdi" className={estilosBoton("primario", true)}>
          Perdí algo
        </Link>
        <Link href="/encontre" className={estilosBoton("secundario", true)}>
          Encontré algo
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Lo último en tu comunidad</h2>
          <Link href="/hallazgos" className="text-sm font-semibold text-turquesa-oscuro hover:underline">
            Ver todo
          </Link>
        </div>
        <Suspense fallback={<Cargando texto="Cargando publicaciones…" />}>
          <LoUltimo />
        </Suspense>
      </section>

      <p className="text-center text-sm text-texto-secundario">Cada publicación acerca un reencuentro.</p>
    </div>
  );
}
