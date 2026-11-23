"use client";

import Link from "next/link";
import { useState } from "react";
import { enviarJson } from "@/lib/api";
import { clienteDelNavegador } from "@/lib/supabase-navegador";
import { rasgosDeCategoria, MINIMO_DE_RASGOS } from "@/lib/rasgos";
import { useFormulario } from "@/lib/useFormulario";
import { fechaNoFutura, longitudMaxima, longitudMinima, requerido, type Regla } from "@/lib/validacion";
import AreaTexto from "../AreaTexto";
import Aviso from "../Aviso";
import { estilosBoton } from "../Boton";
import Boton from "../Boton";
import CampoTexto from "../CampoTexto";
import SelectorCategoria from "../SelectorCategoria";
import SelectorDistrito from "../SelectorDistrito";

const hoy = () => new Date().toLocaleDateString("en-CA");
const prefijo = (campo: string) => `rasgo_${campo}`;

const VALORES_INICIALES: Record<string, string> = {
  categoria: "",
  descripcion: "",
  fecha: "",
  distrito: "",
  rasgos: "",
};

export default function FormularioDePerdida() {
  const [categoria, setCategoria] = useState("");
  const [registrada, setRegistrada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const rasgos = rasgosDeCategoria(categoria);

  const reglas: Record<string, Regla[]> = {
    categoria: [requerido("Elige la categoría del objeto.")],
    descripcion: [requerido("Describe el objeto."), longitudMinima(10), longitudMaxima(500)],
    fecha: [requerido("Indica el día en que lo perdiste."), fechaNoFutura(hoy())],
    distrito: [requerido("Elige el distrito.")],
    rasgos: [
      (_, todos) => {
        const llenos = rasgos.filter((r) => (todos?.[prefijo(r.campo)] ?? "").trim() !== "");
        return llenos.length < MINIMO_DE_RASGOS
          ? `Llena al menos ${MINIMO_DE_RASGOS} de los ${rasgos.length} rasgos ocultos.`
          : null;
      },
    ],
  };
  const { valores, errores, cambiar, enviar, fijarErrores, reiniciar } = useFormulario(VALORES_INICIALES, reglas);

  function alCambiar(evento: Parameters<typeof cambiar>[0]) {
    if (evento.target.name === "categoria") setCategoria(evento.target.value);
    cambiar(evento);
  }

  async function registrar(datos: Record<string, string>) {
    setEnviando(true);
    setMensaje(null);
    const { data: sesion } = await clienteDelNavegador()!.auth.getSession();
    if (!sesion.session) {
      setEnviando(false);
      return setMensaje("Tu sesión terminó. Vuelve a entrar desde Mi perfil.");
    }
    const respuesta = await enviarJson("/api/perdidas", {
      categoria: datos.categoria,
      descripcion: datos.descripcion,
      fecha: datos.fecha,
      distrito: datos.distrito,
      rasgos: Object.fromEntries(rasgos.map((r) => [r.campo, datos[prefijo(r.campo)] ?? ""])),
    }, sesion.session.access_token);
    setEnviando(false);

    if (respuesta.ok) {
      reiniciar();
      setCategoria("");
      return setRegistrada(true);
    }
    if (respuesta.datos.errores) {
      const delServidor = Object.fromEntries(
        Object.entries(respuesta.datos.errores).map(([campo, texto]) => [rasgos.some((r) => r.campo === campo) ? prefijo(campo) : campo, texto]),
      );
      fijarErrores(delServidor);
    }
    setMensaje(respuesta.datos.errores ? "Revisa los campos marcados." : (respuesta.datos.mensaje ?? "No se pudo guardar."));
  }

  if (registrada) {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tipo="exito" titulo="Pérdida registrada">
          Te avisaremos cuando alguien publique algo que coincida. Tus rasgos ocultos nunca se muestran a nadie.
        </Aviso>
        <Link href="/" className={estilosBoton("secundario", true)}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={enviar(registrar)} className="flex flex-col gap-4">
      {mensaje && <Aviso tipo="error">{mensaje}</Aviso>}
      <SelectorCategoria etiqueta="¿Qué objeto perdiste?" value={valores.categoria} onChange={alCambiar} error={errores.categoria} required />
      <AreaTexto
        name="descripcion"
        etiqueta="Descríbelo con detalle"
        placeholder="Ej.: celular negro con funda azul"
        ayuda="Incluye color, marca o alguna señal."
        value={valores.descripcion}
        onChange={cambiar}
        error={errores.descripcion}
        required
      />
      <CampoTexto
        name="fecha"
        type="date"
        max={hoy()}
        etiqueta="¿Cuándo lo perdiste?"
        value={valores.fecha}
        onChange={cambiar}
        error={errores.fecha}
        required
      />
      <SelectorDistrito etiqueta="¿Dónde lo perdiste?" value={valores.distrito} onChange={cambiar} error={errores.distrito} required />

      {rasgos.length > 0 && (
        <fieldset className="flex flex-col gap-4 rounded-2xl border border-borde bg-superficie p-4">
          <legend className="px-1 font-semibold">Rasgos ocultos</legend>
          <p className="text-sm text-texto-secundario">
            Solo tú los ves. Sirven para comprobar que el objeto es tuyo. Llena al menos {MINIMO_DE_RASGOS} de {rasgos.length}.
          </p>
          {errores.rasgos && <Aviso tipo="error">{errores.rasgos}</Aviso>}
          {rasgos.map(({ campo, etiqueta, ayuda }) => (
            <CampoTexto
              key={campo}
              name={prefijo(campo)}
              etiqueta={etiqueta}
              ayuda={ayuda}
              inputMode={campo === "dni" || campo === "imei_ultimos_4" || campo === "cantidad_tarjetas" ? "numeric" : undefined}
              type={campo === "fecha_emision" ? "date" : "text"}
              autoComplete="off"
              value={valores[prefijo(campo)] ?? ""}
              onChange={cambiar}
              error={errores[prefijo(campo)]}
            />
          ))}
        </fieldset>
      )}

      <Boton type="submit" anchoCompleto cargando={enviando}>
        Registrar pérdida
      </Boton>
      <p className="text-center text-sm text-texto-secundario">Tus datos se mantienen protegidos.</p>
    </form>
  );
}
