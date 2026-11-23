import type { Metadata } from "next";
import type { ReactNode } from "react";
import Aviso from "@/componentes/Aviso";
import Boton from "@/componentes/Boton";
import Cargando from "@/componentes/Cargando";
import FormularioEjemplo from "@/componentes/FormularioEjemplo";
import TarjetaPublicacion from "@/componentes/TarjetaPublicacion";

export const metadata: Metadata = {
  title: "Componentes · DevuelveyGana",
};

const COLORES = [
  { nombre: "Marino", clase: "bg-marino", codigo: "#172839" },
  { nombre: "Turquesa", clase: "bg-turquesa", codigo: "#10A8A0" },
  { nombre: "Turquesa oscuro", clase: "bg-turquesa-oscuro", codigo: "#0B7A75" },
  { nombre: "Turquesa claro", clase: "bg-turquesa-claro", codigo: "#E6F6F5" },
  { nombre: "Error", clase: "bg-error", codigo: "#B91C1C" },
  { nombre: "Éxito", clase: "bg-exito", codigo: "#15803D" },
  { nombre: "Aviso", clase: "bg-aviso", codigo: "#B45309" },
  { nombre: "Fondo", clase: "bg-fondo", codigo: "#F5F7F9" },
];

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

/** Página de ejemplo de la T-03: todos los componentes comunes funcionando. */
export default function PaginaComponentes() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Componentes</h1>
        <p className="text-texto-secundario">Guía visual de DevuelveyGana (T-03). Úsalos en lugar de crear estilos nuevos.</p>
      </div>

      <Seccion titulo="Colores">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORES.map((color) => (
            <li key={color.nombre} className="flex items-center gap-3">
              <span className={`h-10 w-10 shrink-0 rounded-lg border border-borde ${color.clase}`} />
              <span className="text-sm">
                <span className="block font-semibold">{color.nombre}</span>
                <span className="text-texto-secundario">{color.codigo}</span>
              </span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Tipografía">
        <p className="font-titulo text-2xl font-bold">Poppins para títulos</p>
        <p>Inter para el texto. Tamaño base de 16 px para que se lea bien en el celular.</p>
        <p className="text-sm text-texto-secundario">Texto pequeño de 14 px para ayudas y fechas.</p>
      </Seccion>

      <Seccion titulo="Botones">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Boton>Principal</Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="peligro">Peligro</Boton>
          <Boton cargando>Guardando</Boton>
          <Boton disabled>Deshabilitado</Boton>
        </div>
      </Seccion>

      <Seccion titulo="Avisos">
        <Aviso tipo="exito" titulo="Publicado">
          Tu hallazgo se publicó correctamente.
        </Aviso>
        <Aviso tipo="error" titulo="No se pudo guardar">
          Revisa tu conexión e inténtalo otra vez.
        </Aviso>
        <Aviso tipo="aviso">Tu publicación vence en 3 días.</Aviso>
        <Aviso tipo="info">El público solo ve la categoría, el distrito y el día.</Aviso>
      </Seccion>

      <Seccion titulo="Tarjetas de publicación">
        <div className="grid gap-3 sm:grid-cols-2">
          <TarjetaPublicacion tipo="hallazgo" categoria="celular" distrito="Ayacucho" dia="2026-11-20" estado="Publicado" />
          <TarjetaPublicacion tipo="perdida" categoria="dni" distrito="Carmen Alto" dia="2026-11-18" estado="Activa" />
        </div>
      </Seccion>

      <Seccion titulo="Pantalla de carga">
        <div className="rounded-2xl border border-borde bg-superficie">
          <Cargando texto="Buscando coincidencias…" />
        </div>
      </Seccion>

      <Seccion titulo="Formulario base">
        <p className="text-sm text-texto-secundario">
          Presiona «Validar» sin llenar nada para ver los mensajes de error.
        </p>
        <FormularioEjemplo />
      </Seccion>
    </div>
  );
}
