import { PASOS_DE_DEVOLUCION } from "../contenido/inicio";

export function ComoFunciona() {
  return (
    <section
      aria-labelledby="como-funciona"
      className="mx-auto w-full max-w-6xl px-6 py-28 sm:px-10 lg:py-36"
    >
      <h2
        id="como-funciona"
        className="max-w-xl font-titulo text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        Así funciona
      </h2>
      <ol className="mt-16 grid gap-14 lg:grid-cols-3 lg:gap-12">
        {PASOS_DE_DEVOLUCION.map((paso, indice) => (
          <li key={paso.titulo} className="border-t-2 border-turquesa pt-6">
            <p className="font-titulo text-sm font-semibold text-turquesa-oscuro">
              Paso {indice + 1}
            </p>
            <h3 className="mt-3 font-titulo text-xl font-semibold leading-snug">
              {paso.titulo}
            </h3>
            <p className="mt-4 max-w-sm leading-7 text-texto-suave">
              {paso.descripcion}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
