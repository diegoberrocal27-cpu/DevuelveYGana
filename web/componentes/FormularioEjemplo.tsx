"use client";

import { useState } from "react";
import { useFormulario } from "@/lib/useFormulario";
import { celularPeruano, longitudMinima, requerido } from "@/lib/validacion";
import AreaTexto from "./AreaTexto";
import Aviso from "./Aviso";
import Boton from "./Boton";
import CampoTexto from "./CampoTexto";
import SelectorCategoria from "./SelectorCategoria";
import SelectorDistrito from "./SelectorDistrito";

const VALORES_INICIALES = { categoria: "", distrito: "", dia: "", descripcion: "", celular: "" };

const REGLAS = {
  categoria: [requerido("Elige la categoría del objeto.")],
  distrito: [requerido("Elige el distrito.")],
  dia: [requerido("Indica el día.")],
  descripcion: [requerido("Describe el objeto."), longitudMinima(10)],
  celular: [celularPeruano()],
};

/** Ejemplo del formulario base: muestra cómo se validan los campos y se ven los errores. */
export default function FormularioEjemplo() {
  const { valores, errores, cambiar, enviar, reiniciar } = useFormulario(VALORES_INICIALES, REGLAS);
  const [enviado, setEnviado] = useState(false);

  return (
    <form
      noValidate
      onSubmit={enviar(() => setEnviado(true))}
      className="flex flex-col gap-4 rounded-2xl border border-borde bg-superficie p-4"
    >
      {enviado && (
        <Aviso tipo="exito" titulo="Formulario válido">
          Así se ve el mensaje cuando todo está correcto.
        </Aviso>
      )}
      <SelectorCategoria value={valores.categoria} onChange={cambiar} error={errores.categoria} required />
      <SelectorDistrito value={valores.distrito} onChange={cambiar} error={errores.distrito} required />
      <CampoTexto
        name="dia"
        type="date"
        etiqueta="Día"
        value={valores.dia}
        onChange={cambiar}
        error={errores.dia}
        required
      />
      <AreaTexto
        name="descripcion"
        etiqueta="Descripción"
        placeholder="Ejemplo: celular negro con funda azul"
        value={valores.descripcion}
        onChange={cambiar}
        error={errores.descripcion}
        required
      />
      <CampoTexto
        name="celular"
        type="tel"
        inputMode="numeric"
        etiqueta="Celular"
        ayuda="Opcional. 9 dígitos, empieza con 9."
        value={valores.celular}
        onChange={cambiar}
        error={errores.celular}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Boton type="submit" anchoCompleto>
          Validar
        </Boton>
        <Boton
          variante="secundario"
          anchoCompleto
          onClick={() => {
            reiniciar();
            setEnviado(false);
          }}
        >
          Limpiar
        </Boton>
      </div>
    </form>
  );
}
