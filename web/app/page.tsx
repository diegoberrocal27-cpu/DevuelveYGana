import Link from "next/link";
import { estilosBoton } from "@/componentes/Boton";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold leading-tight">Recupera lo que perdiste. Devuelve lo que encontraste.</h1>
        <p className="text-texto-secundario">
          Publica tu objeto perdido o el que encontraste. Te avisamos si hay coincidencia y la entrega se hace en un
          punto seguro.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/perdi" className={estilosBoton("primario", true)}>
          Perdí algo
        </Link>
        <Link href="/encontre" className={estilosBoton("secundario", true)}>
          Encontré algo
        </Link>
        <Link href="/hallazgos" className="py-2 text-center font-semibold text-turquesa-oscuro underline-offset-4 hover:underline">
          Ver objetos encontrados
        </Link>
      </div>
    </div>
  );
}
