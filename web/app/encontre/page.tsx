import type { Metadata } from "next";
import PantallaEncontre from "@/componentes/hallazgos/PantallaEncontre";

export const metadata: Metadata = {
  title: "Encontré algo · DevuelveyGana",
};

/** HU-03: publicar un objeto encontrado. */
export default function PaginaEncontre() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight">¿Encontraste algo?</h1>
        <p className="text-texto-secundario">Tu ayuda puede devolver una sonrisa.</p>
      </div>
      <div className="rounded-xl bg-turquesa-claro px-4 py-3 text-sm">
        <p className="font-semibold text-turquesa-oscuro">Gracias por ayudar a tu comunidad</p>
        <p className="text-texto-secundario">No mostraremos tus datos ni la foto al público.</p>
      </div>
      <PantallaEncontre />
    </div>
  );
}
