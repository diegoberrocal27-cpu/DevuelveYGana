"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoEncontre, IconoInicio, IconoPerdi, IconoPerfil } from "./iconos";

const OPCIONES = [
  { ruta: "/", texto: "Inicio", Icono: IconoInicio },
  { ruta: "/perdi", texto: "Perdí", Icono: IconoPerdi },
  { ruta: "/encontre", texto: "Hallé", Icono: IconoEncontre },
  { ruta: "/perfil", texto: "Perfil", Icono: IconoPerfil },
];

export function estaActiva(rutaActual: string, ruta: string): boolean {
  return ruta === "/" ? rutaActual === "/" : rutaActual === ruta || rutaActual.startsWith(`${ruta}/`);
}

export default function MenuInferior() {
  const rutaActual = usePathname() ?? "/";

  return (
    <nav
      aria-label="Menú principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4 md:max-w-3xl">
        {OPCIONES.map(({ ruta, texto, Icono }) => {
          const activa = estaActiva(rutaActual, ruta);
          return (
            <li key={ruta}>
              <Link
                href={ruta}
                aria-current={activa ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-medium ${
                  activa ? "text-turquesa-oscuro" : "text-texto-secundario hover:text-marino"
                }`}
              >
                <Icono />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
