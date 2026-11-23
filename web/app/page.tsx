import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Aviso from "@/componentes/Aviso";
import Cargando from "@/componentes/Cargando";
import { IconoCategoria } from "@/componentes/iconosCategoria";
import TarjetaPublicacion from "@/componentes/TarjetaPublicacion";
import { CATEGORIAS } from "@/lib/catalogos";
import { leerCatalogo } from "@/servidor/catalogo-publico";
import { fechaDeHoyEnLima } from "@/servidor/hallazgos";

async function Recientes() {
  // Se lee en cada visita para mostrar lo último publicado.
  await connection();
  const hallazgos = await leerCatalogo(3);
  if (!hallazgos) return <Aviso tipo="error">No pudimos cargar las publicaciones. Inténtalo en unos minutos.</Aviso>;
  if (hallazgos.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-borde px-4 py-6 text-center text-sm text-texto-secundario">
        Todavía no hay objetos encontrados. Si encontraste algo, puedes ser la primera persona en publicarlo.
      </p>
    );
  }
  const hoy = fechaDeHoyEnLima();
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {hallazgos.map((h) => (
        <li key={h.id}>
          <TarjetaPublicacion tipo="hallazgo" categoria={h.categoria} distrito={h.distrito} dia={h.dia} hoy={hoy} foto={h.foto} />
        </li>
      ))}
    </ul>
  );
}

/** Flecha de regreso del logo, en grande, como trazo de fondo del panel principal. */
function TrazoDeRegreso() {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="pointer-events-none absolute -right-10 -bottom-12 h-56 w-56 text-turquesa/30"
      fill="none"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M150 60H80a50 50 0 0 0 0 100h40" />
      <path d="m110 25-35 35 35 35" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-2">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.1] font-bold md:text-5xl">Un objeto puede volver a casa.</h1>
          <p className="max-w-prose text-texto-secundario">
            Publica lo que perdiste o encontraste en Huamanga. Es gratis y tus datos no se muestran.
          </p>
        </div>

        <div className="relative isolate overflow-hidden rounded-3xl bg-marino p-6 text-white">
          <TrazoDeRegreso />
          <p className="relative font-titulo text-xl font-semibold">¿Perdiste o encontraste algo?</p>
          <p className="relative mt-1 text-white/75">Publicarlo toma menos de un minuto.</p>
          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <Link
              href="/perdi"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 font-semibold text-marino transition-colors hover:bg-turquesa-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Perdí algo
            </Link>
            <Link
              href="/encontre"
              className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold text-white ring-2 ring-white/60 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Encontré algo
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-categorias">
        <h2 id="titulo-categorias" className="text-lg font-semibold">
          Busca por tipo de objeto
        </h2>
        <ul className="grid grid-cols-4 gap-2">
          {CATEGORIAS.map(({ valor, etiqueta }) => (
            <li key={valor}>
              <Link
                href={`/perdi?categoria=${valor}`}
                className="flex flex-col items-center gap-2 rounded-2xl bg-superficie px-1 py-3 text-center text-xs font-semibold ring-1 ring-borde transition-colors hover:ring-turquesa focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquesa"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-turquesa-claro text-turquesa-oscuro">
                  <IconoCategoria categoria={valor} className="h-6 w-6" />
                </span>
                {valor === "cartera" ? "Cartera" : etiqueta}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-recientes">
        <div className="flex items-baseline justify-between">
          <h2 id="titulo-recientes" className="text-lg font-semibold">
            Encontrados recientemente
          </h2>
          <Link href="/perdi" className="text-sm font-semibold text-turquesa-oscuro hover:underline">
            Ver todos
          </Link>
        </div>
        <Suspense fallback={<Cargando texto="Cargando publicaciones…" />}>
          <Recientes />
        </Suspense>
      </section>
    </div>
  );
}
