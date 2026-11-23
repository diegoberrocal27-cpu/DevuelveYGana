import PantallaPerdi from "@/componentes/perdidas/PantallaPerdi";

export default function Pagina() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Perdí algo</h1>
      <PantallaPerdi />
    </div>
  );
}
