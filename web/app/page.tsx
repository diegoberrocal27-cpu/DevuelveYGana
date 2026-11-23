import { ComoFunciona } from "./componentes/ComoFunciona";
import { Navegacion } from "./componentes/Navegacion";
import { PieDePagina } from "./componentes/PieDePagina";
import { Portada } from "./componentes/Portada";
import { QueSePuedeRegistrar } from "./componentes/QueSePuedeRegistrar";

export default function Inicio() {
  return (
    <>
      <Navegacion />
      <main className="flex-1">
        <Portada />
        <ComoFunciona />
        <QueSePuedeRegistrar />
      </main>
      <PieDePagina />
    </>
  );
}
