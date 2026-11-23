import type { Metadata } from "next";
import PantallaEncontre from "@/componentes/hallazgos/PantallaEncontre";

export const metadata: Metadata = {
  title: "Encontré algo · DevuelveyGana",
};

/** HU-03: publicar un objeto encontrado. */
export default function PaginaEncontre() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Encontré algo</h1>
        <p className="text-texto-secundario">
          Publícalo gratis. Buscaremos al dueño sin mostrar tus datos ni la foto al público.
        </p>
      </div>
      <PantallaEncontre />
    </div>
  );
}
