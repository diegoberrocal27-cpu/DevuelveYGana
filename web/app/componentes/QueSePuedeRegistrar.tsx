import { CATEGORIAS_DE_OBJETO } from "../contenido/inicio";

export function QueSePuedeRegistrar() {
  return (
    <section aria-labelledby="que-registrar" className="bg-papel">
      <div className="mx-auto grid w-full max-w-6xl gap-16 px-6 py-28 sm:px-10 lg:grid-cols-[1fr_1.6fr] lg:py-36">
        <div>
          <h2
            id="que-registrar"
            className="font-titulo text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Qué puedes registrar
          </h2>
          <p className="mt-6 max-w-sm leading-7 text-texto-suave">
            Empezamos con los objetos que más se pierden en la ciudad.
          </p>
        </div>
        <ul className="divide-y divide-linea border-y border-linea">
          {CATEGORIAS_DE_OBJETO.map((categoria) => (
            <li key={categoria.nombre} className="flex items-center gap-6 py-7">
              <span
                aria-hidden="true"
                className="size-4 shrink-0 rounded-full"
                style={{ backgroundColor: categoria.color }}
              />
              <span className="font-titulo text-2xl font-semibold">
                {categoria.nombre}
              </span>
              <span className="ml-auto max-w-xs text-right text-texto-suave">
                {categoria.detalle}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
