import Link from "next/link";
import { SimboloDePin } from "./Marca";

export function Portada() {
  return (
    <section className="bg-linear-to-br from-tinta via-azul to-turquesa-oscuro text-white">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 pb-28 pt-20 sm:px-10 lg:grid-cols-[1.4fr_1fr] lg:pb-36 lg:pt-28">
        <div>
          <h1 className="max-w-2xl font-titulo text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
            Lo que perdiste puede volver a tus manos
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-white/85">
            Registra documentos y objetos extraviados en Ayacucho, o publica los
            que encontraste, y te ayudamos a devolverlos a su dueño.
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              href="/perdi"
              className="rounded-full bg-white px-8 py-4 font-semibold text-tinta transition-colors hover:bg-turquesa"
            >
              Perdí algo
            </Link>
            <Link
              href="/encontre"
              className="rounded-full border border-white/60 px-8 py-4 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Encontré algo
            </Link>
          </div>
        </div>
        <div className="mx-auto flex size-64 items-center justify-center rounded-full bg-white sm:size-80">
          <SimboloDePin className="h-40 sm:h-52" />
        </div>
      </div>
    </section>
  );
}
