import { Marca } from "./Marca";

export function PieDePagina() {
  return (
    <footer className="bg-tinta text-white/75">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-14 sm:px-10 md:flex-row md:items-center md:justify-between">
        <Marca oscura />
        <p className="max-w-md text-sm leading-6">
          Proyecto del curso Innovación Tecnológica, Creatividad y
          Emprendimiento, UNSCH. Ayacucho, Perú.
        </p>
      </div>
    </footer>
  );
}
