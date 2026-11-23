import type { Metadata } from "next";
import PantallaEncontre from "@/componentes/hallazgos/PantallaEncontre";

export const metadata: Metadata = {
  title: "Encontré algo · DevuelveyGana",
};

/** HU-03: publicar un objeto encontrado, en 3 pasos. */
export default function PaginaEncontre() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <PantallaEncontre />
    </div>
  );
}
