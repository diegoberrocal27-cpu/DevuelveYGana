import Aviso from "@/componentes/Aviso";

export default function Pagina() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Encontré algo</h1>
      <Aviso tipo="info" titulo="En construcción">
        Esta pantalla llega con la HU-03 (registro de hallazgo).
      </Aviso>
    </div>
  );
}
