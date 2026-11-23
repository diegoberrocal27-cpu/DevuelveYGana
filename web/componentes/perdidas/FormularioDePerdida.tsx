"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { enviarJson } from "@/lib/api";
import { MINIMO_DE_RASGOS, rasgosDeCategoria } from "@/lib/rasgos";
import { clienteDelNavegador } from "@/lib/supabase-navegador";
import { fechaNoFutura, hayErrores, longitudMaxima, longitudMinima, requerido, validar } from "@/lib/validacion";
import AreaTexto from "../AreaTexto";
import Aviso from "../Aviso";
import Boton, { estilosBoton } from "../Boton";
import CampoTexto from "../CampoTexto";
import Pasos from "../Pasos";
import SelectorCategoriaVisual from "../SelectorCategoriaVisual";
import SelectorDistrito from "../SelectorDistrito";

const hoy = () => new Date().toLocaleDateString("en-CA");
const TOTAL = 3;
const TAREA = "Publicar una pérdida";

/** En qué paso se pide cada campo (para volver al paso correcto si el servidor marca un error). */
const PASO_DE: Record<string, number> = { categoria: 1, distrito: 1, descripcion: 2, fecha: 2 };

type Errores = Record<string, string | undefined>;

/** HU-02 en 3 pasos: qué y dónde → cómo es y cuándo → rasgos ocultos. Misma API que antes (/api/perdidas). */
export default function FormularioDePerdida() {
  const [paso, setPaso] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [distrito, setDistrito] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [rasgos, setRasgos] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [registrada, setRegistrada] = useState(false);
  const definiciones = rasgosDeCategoria(categoria);

  function limpiar(campo: string) {
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }

  function validarPaso(numero: number): Errores {
    if (numero === 1) {
      return validar(
        { categoria, distrito },
        { categoria: [requerido("Elige qué objeto perdiste.")], distrito: [requerido("Elige el distrito.")] },
      );
    }
    if (numero === 2) {
      return validar(
        { descripcion, fecha },
        {
          descripcion: [requerido("Describe el objeto."), longitudMinima(10), longitudMaxima(500)],
          fecha: [requerido("Indica el día en que lo perdiste."), fechaNoFutura(hoy())],
        },
      );
    }
    const llenos = definiciones.filter((r) => (rasgos[r.campo] ?? "").trim() !== "");
    return llenos.length < MINIMO_DE_RASGOS
      ? { rasgos: `Llena al menos ${MINIMO_DE_RASGOS} de los ${definiciones.length} rasgos.` }
      : {};
  }

  function avanzar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    const nuevos = validarPaso(paso);
    setErrores(nuevos);
    if (hayErrores(nuevos)) return;
    if (paso < TOTAL) return setPaso(paso + 1);
    void publicar();
  }

  async function publicar() {
    setEnviando(true);
    const { data: sesion } = await clienteDelNavegador()!.auth.getSession();
    if (!sesion.session) {
      setEnviando(false);
      return setMensaje("Tu sesión terminó. Vuelve a entrar desde Perfil.");
    }
    const respuesta = await enviarJson(
      "/api/perdidas",
      {
        categoria,
        descripcion,
        fecha,
        distrito,
        rasgos: Object.fromEntries(definiciones.map((r) => [r.campo, rasgos[r.campo] ?? ""])),
      },
      sesion.session.access_token,
    );
    setEnviando(false);

    if (respuesta.ok) return setRegistrada(true);
    const delServidor = respuesta.datos.errores;
    if (delServidor) {
      setErrores(delServidor);
      // Vuelve al primer paso que tenga un error; los rasgos están en el paso 3.
      const pasos = Object.keys(delServidor).map((campo) => PASO_DE[campo] ?? 3);
      setPaso(Math.min(...pasos));
    }
    setMensaje(delServidor ? "Revisa los campos marcados." : (respuesta.datos.mensaje ?? "No se pudo publicar."));
  }

  if (registrada) {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tipo="exito" titulo="Pérdida publicada">
          Cuando alguien publique algo que coincida, te avisaremos. Tus rasgos ocultos nunca se muestran a nadie.
        </Aviso>
        <Link href="/perdi" className={estilosBoton("primario", true)}>
          Ver lo que otros encontraron
        </Link>
        <Link href="/" className={estilosBoton("secundario", true)}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={avanzar} className="flex flex-col gap-5">
      <Pasos tarea={TAREA} paso={paso} total={TOTAL} onAtras={paso > 1 ? () => setPaso(paso - 1) : undefined} />
      {mensaje && <Aviso tipo="error">{mensaje}</Aviso>}

      {paso === 1 && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight">¿Qué perdiste?</h1>
            <p className="text-texto-secundario">Elige el tipo de objeto y dónde lo perdiste.</p>
          </div>
          <SelectorCategoriaVisual
            etiqueta="Tipo de objeto"
            valor={categoria}
            onCambiar={(valor) => {
              setCategoria(valor);
              setRasgos({});
              limpiar("categoria");
            }}
            error={errores.categoria}
          />
          <SelectorDistrito
            etiqueta="¿En qué distrito?"
            value={distrito}
            onChange={(e) => {
              setDistrito(e.target.value);
              limpiar("distrito");
            }}
            error={errores.distrito}
            required
          />
        </>
      )}

      {paso === 2 && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight">¿Cómo es?</h1>
            <p className="text-texto-secundario">Lo que cualquiera vería a simple vista.</p>
          </div>
          <AreaTexto
            name="descripcion"
            etiqueta="Descríbelo"
            placeholder="Ej.: celular negro con funda azul"
            ayuda="Color, marca o alguna señal. No escribas números de documentos."
            maxLength={500}
            rows={3}
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value);
              limpiar("descripcion");
            }}
            error={errores.descripcion}
            required
          />
          <CampoTexto
            name="fecha"
            type="date"
            max={hoy()}
            etiqueta="¿Cuándo lo perdiste?"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              limpiar("fecha");
            }}
            error={errores.fecha}
            required
          />
        </>
      )}

      {paso === 3 && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight">Detalles que solo tú conoces</h1>
            <p className="text-texto-secundario">
              Sirven para comprobar que es tuyo. Nadie más los ve. Llena al menos {MINIMO_DE_RASGOS} de{" "}
              {definiciones.length}.
            </p>
          </div>
          {errores.rasgos && <Aviso tipo="error">{errores.rasgos}</Aviso>}
          {definiciones.map(({ campo, etiqueta, ayuda }) => (
            <CampoTexto
              key={campo}
              name={campo}
              etiqueta={etiqueta}
              ayuda={ayuda}
              inputMode={campo === "dni" || campo === "imei_ultimos_4" || campo === "cantidad_tarjetas" ? "numeric" : undefined}
              type={campo === "fecha_emision" ? "date" : "text"}
              autoComplete="off"
              value={rasgos[campo] ?? ""}
              onChange={(e) => {
                setRasgos((anteriores) => ({ ...anteriores, [campo]: e.target.value }));
                limpiar(campo);
                limpiar("rasgos");
              }}
              error={errores[campo]}
            />
          ))}
          <p className="rounded-xl bg-turquesa-claro px-4 py-3 text-sm">
            Al publicar, compararemos tu pérdida con lo que otros encuentren y te avisaremos si hay una posible
            coincidencia.
          </p>
        </>
      )}

      <Boton type="submit" anchoCompleto cargando={enviando}>
        {paso < TOTAL ? "Continuar" : "Publicar pérdida"}
      </Boton>
    </form>
  );
}
