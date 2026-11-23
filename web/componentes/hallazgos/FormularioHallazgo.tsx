"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { etiquetaDeCategoria } from "@/lib/catalogos";
import { reducirFoto } from "@/lib/reducir-foto";
import { clienteDelNavegador } from "@/lib/supabase-navegador";
import { fechaNoFutura, hayErrores, longitudMaxima, longitudMinima, requerido, validar } from "@/lib/validacion";
import AreaTexto from "../AreaTexto";
import Aviso from "../Aviso";
import Boton, { estilosBoton } from "../Boton";
import CampoFoto from "../CampoFoto";
import CampoTexto from "../CampoTexto";
import Casilla from "../Casilla";
import { formatearDia } from "../TarjetaPublicacion";
import Pasos from "../Pasos";
import SelectorCategoriaVisual from "../SelectorCategoriaVisual";
import SelectorDistrito from "../SelectorDistrito";

type Errores = Partial<Record<"categoria" | "descripcion" | "dia" | "distrito" | "buenaFe" | "foto", string>>;

/** Día de hoy en el celular, en formato AAAA-MM-DD. El servidor lo vuelve a comprobar con la hora de Lima. */
const hoy = () => new Date().toLocaleDateString("en-CA");

const TOTAL = 3;
const TAREA = "Publicar un hallazgo";
const PASO_DE: Record<string, number> = { categoria: 1, distrito: 1, descripcion: 2, dia: 2, foto: 2, buenaFe: 3 };
const SIN_CONEXION = "No hay conexión. Revisa tu internet e intenta de nuevo.";

/** HU-03 en 3 pasos: qué y dónde → cómo es, cuándo y foto → revisar y declarar buena fe. */
export default function FormularioHallazgo() {
  const [paso, setPaso] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [distrito, setDistrito] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [dia, setDia] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [buenaFe, setBuenaFe] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estado, setEstado] = useState<"llenando" | "preparando" | "publicando" | "publicado">("llenando");

  function limpiar(campo: keyof Errores) {
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }

  function validarPaso(numero: number): Errores {
    if (numero === 1) {
      return validar(
        { categoria, distrito },
        {
          categoria: [requerido("Elige qué objeto encontraste.")],
          distrito: [requerido("Elige el distrito donde lo encontraste.")],
        },
      );
    }
    if (numero === 2) {
      const nuevos: Errores = validar(
        { descripcion, dia },
        {
          descripcion: [requerido("Describe brevemente el objeto."), longitudMinima(10), longitudMaxima(200)],
          dia: [requerido("Indica qué día lo encontraste."), fechaNoFutura(hoy())],
        },
      );
      if (!archivo) nuevos.foto = "Agrega una foto del objeto.";
      return nuevos;
    }
    return buenaFe ? {} : { buenaFe: "Para publicar debes aceptar la declaración de buena fe." };
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
    if (!archivo) return setPaso(2);
    const { data: sesion } = await clienteDelNavegador()!.auth.getSession();
    if (!sesion.session) return setMensaje("Tu sesión terminó. Vuelve a entrar desde Perfil.");

    setEstado("preparando");
    const foto = await reducirFoto(archivo);
    const formulario = new FormData();
    formulario.set("categoria", categoria);
    formulario.set("descripcion", descripcion);
    formulario.set("dia", dia);
    formulario.set("distrito", distrito);
    formulario.set("buenaFe", "si");
    formulario.set("foto", foto, foto.type === "image/jpeg" ? "foto.jpg" : archivo.name);

    setEstado("publicando");
    try {
      const respuesta = await fetch("/api/hallazgos", {
        method: "POST",
        headers: { Authorization: `Bearer ${sesion.session.access_token}` },
        body: formulario,
      });
      const datos: { mensaje?: string; errores?: Errores } = await respuesta.json().catch(() => ({}));
      if (respuesta.ok) return setEstado("publicado");
      if (datos.errores) {
        setErrores(datos.errores);
        setPaso(Math.min(...Object.keys(datos.errores).map((campo) => PASO_DE[campo] ?? 1)));
      }
      setMensaje(datos.mensaje ?? "No se pudo publicar el hallazgo.");
    } catch {
      setMensaje(SIN_CONEXION);
    }
    setEstado("llenando");
  }

  if (estado === "publicado") {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tipo="exito" titulo="Hallazgo publicado">
          Gracias por ayudar. Te avisaremos si alguien lo reclama y demuestra que es suyo. Al público solo le
          mostramos qué es, dónde, cuándo y la foto{categoria === "dni" ? " difuminada" : ""}.
        </Aviso>
        <Link href="/perdi" className={estilosBoton("primario", true)}>
          Ver objetos encontrados
        </Link>
        <Link href="/" className={estilosBoton("secundario", true)}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  const ocupado = estado === "preparando" || estado === "publicando";

  return (
    <form noValidate onSubmit={avanzar} className="flex flex-col gap-5">
      <Pasos tarea={TAREA} paso={paso} total={TOTAL} onAtras={paso > 1 && !ocupado ? () => setPaso(paso - 1) : undefined} />
      {mensaje && <Aviso tipo="error">{mensaje}</Aviso>}

      {paso === 1 && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight">¿Qué encontraste?</h1>
            <p className="text-texto-secundario">Tu ayuda puede devolver algo importante.</p>
          </div>
          <SelectorCategoriaVisual
            etiqueta="Tipo de objeto"
            valor={categoria}
            onCambiar={(valor) => {
              setCategoria(valor);
              limpiar("categoria");
            }}
            error={errores.categoria}
          />
          <SelectorDistrito
            etiqueta="¿En qué distrito lo encontraste?"
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
            <p className="text-texto-secundario">La descripción no se publica: solo la usamos para buscar al dueño.</p>
          </div>
          <AreaTexto
            name="descripcion"
            etiqueta="Descríbelo brevemente"
            placeholder="Ej.: celular negro con funda azul"
            ayuda="No escribas números de documentos, tarjetas ni datos personales."
            maxLength={200}
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
            name="dia"
            type="date"
            etiqueta="¿Qué día lo encontraste?"
            max={hoy()}
            value={dia}
            onChange={(e) => {
              setDia(e.target.value);
              limpiar("dia");
            }}
            error={errores.dia}
            required
          />
          <CampoFoto
            name="foto"
            etiqueta="Foto del objeto"
            ayuda={
              categoria === "dni"
                ? "Como es un DNI, al público le mostraremos la foto difuminada."
                : "Quitamos la ubicación y los datos internos de la foto antes de publicarla."
            }
            archivoElegido={archivo?.name}
            error={errores.foto}
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              limpiar("foto");
            }}
            required
          />
        </>
      )}

      {paso === 3 && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight">Revisa y publica</h1>
            <p className="text-texto-secundario">Así se verá tu publicación para los demás.</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-superficie p-4 text-sm ring-1 ring-borde">
            <dt className="text-texto-secundario">Objeto</dt>
            <dd className="font-semibold">{etiquetaDeCategoria(categoria)}</dd>
            <dt className="text-texto-secundario">Distrito</dt>
            <dd className="font-semibold">{distrito}</dd>
            <dt className="text-texto-secundario">Día</dt>
            <dd className="font-semibold">{formatearDia(dia)}</dd>
            <dt className="text-texto-secundario">Foto</dt>
            <dd className="font-semibold">{categoria === "dni" ? "Se mostrará difuminada" : "Se mostrará nítida"}</dd>
          </dl>
          <Casilla
            name="buenaFe"
            checked={buenaFe}
            onChange={(e) => {
              setBuenaFe(e.target.checked);
              limpiar("buenaFe");
            }}
            error={errores.buenaFe}
          >
            Declaro que encontré este objeto y que lo custodiaré de buena fe, como depositario transitorio, hasta
            entregarlo en un punto seguro.
          </Casilla>
        </>
      )}

      <Boton type="submit" anchoCompleto cargando={ocupado}>
        {estado === "preparando"
          ? "Preparando la foto…"
          : estado === "publicando"
            ? "Publicando…"
            : paso < TOTAL
              ? "Continuar"
              : "Publicar hallazgo"}
      </Boton>
      {paso === TOTAL && <p className="text-center text-sm text-texto-secundario">Publicar es gratis y sin límite.</p>}
    </form>
  );
}
