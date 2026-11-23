import Link from "next/link";

type PropiedadesDePantallaPendiente = {
  titulo: string;
  historia: string;
};

export function PantallaPendiente({
  titulo,
  historia,
}: PropiedadesDePantallaPendiente) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="font-titulo text-3xl font-semibold tracking-tight">
        {titulo}
      </h1>
      <p className="leading-7 text-texto-suave">
        Esta pantalla se construye en la historia {historia}.
      </p>
      <Link href="/" className="font-semibold text-turquesa-oscuro underline">
        Volver al inicio
      </Link>
    </main>
  );
}
