import type { Metadata } from "next";
import PantallaPerdi from "@/componentes/perdidas/PantallaPerdi";

export const metadata: Metadata = {
  title: "Publicar una pérdida · DevuelveyGana",
};

/** HU-02: registrar un objeto perdido, en 3 pasos. */
export default function PaginaPublicarPerdida() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <PantallaPerdi />
    </div>
  );
}
