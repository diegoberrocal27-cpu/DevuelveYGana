type Props = {
  texto?: string;
};

/** Pantalla o bloque de carga. */
export default function Cargando({ texto = "Cargando…" }: Props) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-10 text-texto-secundario">
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-turquesa-claro border-t-turquesa"
      />
      <p>{texto}</p>
    </div>
  );
}
