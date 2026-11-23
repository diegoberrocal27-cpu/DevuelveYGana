import type { Metadata } from "next";
import PantallaPerdi from "@/componentes/perdidas/PantallaPerdi";

export const metadata: Metadata = {
  title: "Perdí algo · DevuelveyGana",
};

/** HU-02: registrar un objeto perdido. */
export default function Pagina() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight">¿Perdiste algo?</h1>
        <p className="text-texto-secundario">No te preocupes, te ayudamos a encontrarlo.</p>
      </div>
      <p className="w-fit rounded-full bg-turquesa-claro px-3 py-1 text-sm font-semibold text-turquesa-oscuro">
        ✦ Publicar es gratis
      </p>
      <PantallaPerdi />
    </div>
  );
}
