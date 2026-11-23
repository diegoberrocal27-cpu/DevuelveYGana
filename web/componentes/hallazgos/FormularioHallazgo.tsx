"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { reducirFoto } from "@/lib/reducir-foto";
import { clienteDelNavegador } from "@/lib/supabase-navegador";
import { fechaNoFutura, hayErrores, longitudMaxima, longitudMinima, requerido, validar } from "@/lib/validacion";
import AreaTexto from "../AreaTexto";
import Aviso from "../Aviso";
import Boton, { estilosBoton } from "../Boton";
import CampoFoto from "../CampoFoto";
import CampoTexto from "../CampoTexto";
import Casilla from "../Casilla";
import SelectorCategoria from "../SelectorCategoria";
import SelectorDistrito from "../SelectorDistrito";

type Valores = { categoria: string; descripcion: string; dia: string; distrito: string };
type Errores = Partial<Record<keyof Valores | "buenaFe" | "foto", string>>;

const VACIO: Valores = { categoria: "", descripcion: "", dia: "", distrito: "" };

/** Día de hoy en el celular, en formato AAAA-MM-DD. El servidor lo vuelve a comprobar con la hora de Lima. */
const hoy = () => new Date().toLocaleDateString("en-CA");

const SIN_CONEXION = "No hay conexión. Revisa tu internet e intenta de nuevo.";

export default function FormularioHallazgo() {
  const [valores, setValores] = useState<Valores>(VACIO);
  const [buenaFe, setBuenaFe] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [paso, setPaso] = useState<"llenando" | "preparando" | "publicando" | "publicado">("llenando");
  const campoFoto = useRef<HTMLInputElement>(null);

  if (paso === "publicado") {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tipo="exito" titulo="¡Hallazgo publicado!">
          Te avisaremos si alguien lo reclama. El público solo ve la categoría, el distrito y el día; tu foto queda
          privada.
        </Aviso>
        <Link href="/hallazgos" className={estilosBoton("primario", true)}>
          Ver objetos encontrados
        </Link>
        <Link href="/" className={estilosBoton("secundario", true)}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  function cambiar(evento: { target: { name: string; value: string } }) {
    const { name, value } = evento.target;
    setValores((anteriores) => ({ ...anteriores, [name]: value }));
    setErrores((anteriores) => ({ ...anteriores, [name]: undefined }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    const archivo = campoFoto.current?.files?.[0];

    const nuevos: Errores = validar(valores, {
      categoria: [requerido("Elige qué objeto encontraste.")],
      descripcion: [requerido("Describe brevemente el objeto."), longitudMinima(10), longitudMaxima(200)],
      dia: [requerido("Indica qué día lo encontraste."), fechaNoFutura(hoy())],
      distrito: [requerido("Elige el distrito donde lo encontraste.")],
    });
    if (!buenaFe) nuevos.buenaFe = "Para publicar debes aceptar la declaración de buena fe.";
    if (!archivo) nuevos.foto = "Agrega una foto del objeto.";
    setErrores(nuevos);
    if (hayErrores(nuevos) || !archivo) return;

    const { data: sesion } = await clienteDelNavegador()!.auth.getSession();
    if (!sesion.session) return setMensaje("Tu sesión terminó. Vuelve a entrar desde Mi perfil.");

    setPaso("preparando");
    const foto = await reducirFoto(archivo);

    const formulario = new FormData();
    for (const [campo, valor] of Object.entries(valores)) formulario.set(campo, valor);
    formulario.set("buenaFe", "si");
    formulario.set("foto", foto, foto.type === "image/jpeg" ? "foto.jpg" : archivo.name);

    setPaso("publicando");
    try {
      const respuesta = await fetch("/api/hallazgos", {
        method: "POST",
        headers: { Authorization: `Bearer ${sesion.session.access_token}` },
        body: formulario,
      });
      const datos: { estado?: string; mensaje?: string; errores?: Errores } = await respuesta.json().catch(() => ({}));
      if (respuesta.ok) return setPaso("publicado");
      if (datos.errores) setErrores(datos.errores);
      setMensaje(datos.mensaje ?? "No se pudo publicar el hallazgo.");
    } catch {
      setMensaje(SIN_CONEXION);
    }
    setPaso("llenando");
  }

  const ocupado = paso === "preparando" || paso === "publicando";

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      {mensaje && <Aviso tipo="error">{mensaje}</Aviso>}

      <SelectorCategoria value={valores.categoria} onChange={cambiar} error={errores.categoria} required />
      <AreaTexto
        name="descripcion"
        etiqueta="Descripción corta"
        placeholder="Ejemplo: celular negro con funda azul"
        ayuda="No escribas números de documentos, tarjetas ni datos personales."
        maxLength={200}
        rows={3}
        value={valores.descripcion}
        onChange={cambiar}
        error={errores.descripcion}
        required
      />
      <CampoTexto
        name="dia"
        type="date"
        etiqueta="Día en que lo encontraste"
        max={hoy()}
        value={valores.dia}
        onChange={cambiar}
        error={errores.dia}
        required
      />
      <SelectorDistrito
        etiqueta="Distrito donde lo encontraste"
        value={valores.distrito}
        onChange={cambiar}
        error={errores.distrito}
        required
      />
      <CampoFoto
        ref={campoFoto}
        name="foto"
        etiqueta="Foto del objeto"
        ayuda="Solo la verá, difuminada, el dueño cuando haya coincidencia. El público no ve fotos."
        error={errores.foto}
        onChange={() => setErrores((anteriores) => ({ ...anteriores, foto: undefined }))}
        required
      />
      <Casilla
        name="buenaFe"
        checked={buenaFe}
        onChange={(evento) => {
          setBuenaFe(evento.target.checked);
          setErrores((anteriores) => ({ ...anteriores, buenaFe: undefined }));
        }}
        error={errores.buenaFe}
      >
        Declaro que encontré este objeto y que lo custodiaré de buena fe, como depositario transitorio, hasta
        entregarlo en un punto seguro.
      </Casilla>

      <Boton type="submit" anchoCompleto cargando={ocupado}>
        {paso === "preparando" ? "Preparando la foto…" : paso === "publicando" ? "Publicando…" : "Publicar hallazgo"}
      </Boton>
      <p className="text-center text-sm text-texto-secundario">Publicar es gratis y sin límite.</p>
    </form>
  );
}
