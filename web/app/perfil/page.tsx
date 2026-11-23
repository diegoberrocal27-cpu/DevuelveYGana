"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import CampoTexto from "@/componentes/CampoTexto";
import Selector from "@/componentes/Selector";
import Boton from "@/componentes/Boton";
import { DISTRITOS } from "@/lib/catalogos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const opciones = [...DISTRITOS, "Otro"].map(valor => ({ valor, etiqueta: valor }));
const mensajes: Record<string, string> = {
  limite: "Demasiadas consultas. Inténtalo en una hora.",
  duplicado: "Ese celular ya está registrado.",
  invalido: "Revisa los datos del formulario.",
  enviado: "Te enviamos un código de seis dígitos por WhatsApp. Vence en cinco minutos.",
  incorrecto: "El código es incorrecto.",
  vencido: "El código venció o ya se utilizó. Pide uno nuevo.",
  bloqueo: "Alcanzaste tres intentos incorrectos.",
  espera: "Espera antes de pedir otro código.",
  falloEnvio: "El envío falló. Puedes pedir otro código después de un minuto.",
  servicio: "El servicio de registro no está disponible. Vuelve a intentarlo.",
  sesion: "Vuelve a ingresar con tu correo.",
  suspendida: "La cuenta está suspendida.",
};

async function consultar(token: string, accion: string, campos = {}) {
  const r = await fetch("/api/registro", {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? {Authorization: "Bearer " + token} : {}) },
    body: JSON.stringify({ accion, ...campos }),
  });
  return await r.json() as { estado: string; hasta?: string };
}

function CamposRegistro() {
  return <>
    <CampoTexto name="celular" etiqueta="Celular peruano" type="tel" inputMode="numeric" pattern="9[0-9]{8}" maxLength={9} required ayuda="9 dígitos, empezando por 9." />
    <Selector name="distrito" etiqueta="Distrito de residencia" opciones={opciones} required />
  </>;
}

export default function Pagina() {
  const db = useRef<SupabaseClient | null>(null);
  const [soloAcceso, setSoloAcceso] = useState(false);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [fase, setFase] = useState(url && clave ? "cargando" : "configuracion");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [hasta, setHasta] = useState(0);
  const [ahora, setAhora] = useState(0);

  useEffect(() => {
    if (!url || !clave) return;
    const cliente = createClient(url, clave);
    db.current = cliente;
    const { data } = cliente.auth.onAuthStateChange((_evento, actual) => {
      setSesion(actual);
      if (!actual) { setFase("correo"); setHasta(0); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sesion) return;
    let activo = true;
    consultar(sesion.access_token, "estado").then(async r => {
      if (!activo) return;
      const guardado = localStorage.getItem("hu01-registro");
      if (guardado && r.estado === "registro") {
        const borrador = JSON.parse(guardado);
        if (borrador.correo === sesion.user.email?.toLowerCase() && borrador.vence > Date.now()) {
          localStorage.removeItem("hu01-registro");
          r = await consultar(sesion.access_token, "registrar", {
            celular: borrador.celular, distrito: borrador.distrito,
          });
        }
      }
      if (!activo) return;
      if (["bloqueo", "enviado", "falloEnvio", "espera"].includes(r.estado)) setFase("pendiente");
      else if (["duplicado", "invalido"].includes(r.estado)) setFase("registro");
      else setFase(r.estado);
      setAviso(mensajes[r.estado] ?? "");
      setBloqueado(r.estado === "bloqueo");
      setHasta(r.hasta ? Date.parse(r.hasta) : 0);
      setAhora(Date.now());
    }).catch(() => { if (activo) { setFase("servicio"); setAviso(mensajes.servicio); } });
    return () => { activo = false; };
  }, [sesion]);

  useEffect(() => {
    if (!hasta) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= hasta) { setHasta(0); setAviso(""); }
    }, 1000);
    return () => window.clearInterval(id);
  }, [hasta]);

  async function ejecutar(accion: string, campos: Record<string, string> = {}) {
    if (ocupado || !db.current) return;
    setOcupado(true);
    setAviso("");
    try {
      if (accion === "correo") {
        localStorage.removeItem("hu01-registro");
        if (!soloAcceso) {
          const r = await consultar("", "disponible", campos);
          if (r.estado !== "disponible") { setAviso(mensajes[r.estado] ?? mensajes.servicio); return; }
          localStorage.setItem("hu01-registro", JSON.stringify({
            correo: campos.correo.trim().toLowerCase(), celular: campos.celular,
            distrito: campos.distrito, vence: Date.now() + 15 * 60000,
          }));
        }
        const { error } = await db.current.auth.signInWithOtp({ email: campos.correo.trim(),
          options: { shouldCreateUser: !soloAcceso, emailRedirectTo: window.location.origin + "/perfil" } });
        setAviso(error ? "No se pudo enviar el enlace. Inténtalo más tarde." : "Abre el enlace de tu correo para entrar y continuar.");
      } else if (sesion) {
        const r = await consultar(sesion.access_token, accion, campos);
        setAviso(mensajes[r.estado] ?? "");
        setBloqueado(r.estado === "bloqueo");
        if (r.hasta) { setHasta(Date.parse(r.hasta)); setAhora(Date.now()); }
        if (["enviado","falloEnvio","bloqueo","espera"].includes(r.estado)) setFase("pendiente");
        if (["verificada","suspendida","registro"].includes(r.estado)) setFase(r.estado);
      }
    } catch { setAviso(mensajes.servicio); }
    finally { setOcupado(false); }
  }

  function enviar(e: FormEvent<HTMLFormElement>, accion: string) {
    e.preventDefault();
    const campos = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    void ejecutar(accion, campos);
  }
  const segundos = Math.max(0, Math.ceil((hasta - ahora) / 1000));
  return <section className="mx-auto flex w-full max-w-md flex-col gap-5">
    <h1 className="text-2xl font-bold">Mi perfil</h1>
    {fase === "cargando" && <p>Cargando tu perfil…</p>}
    {fase === "configuracion" && <p>Falta configurar la conexión con Supabase.</p>}
    {fase === "correo" && <form className="grid gap-4" onSubmit={e => enviar(e, "correo")}>
      <p>{soloAcceso ? "Entra con el enlace de tu correo." : "Abre el enlace que recibirás por correo y te enviaremos el código por WhatsApp."}</p>
      <CampoTexto name="correo" etiqueta="Correo electrónico" type="email" required autoComplete="email" />
      {!soloAcceso && <CamposRegistro />}
      <Boton type="submit" cargando={ocupado}>{soloAcceso ? "Recibir enlace de acceso" : "Registrar mi cuenta"}</Boton>
      <Boton variante="secundario" onClick={() => { setSoloAcceso(!soloAcceso); setAviso(""); }}>
        {soloAcceso ? "Crear una cuenta" : "Ya tengo una cuenta"}
      </Boton>
    </form>}
    {sesion && <p>{sesion.user.email}</p>}
    {fase === "registro" && <form className="grid gap-4" onSubmit={e => enviar(e, "registrar")}>
      <CamposRegistro />
      <Boton type="submit" cargando={ocupado}>Enviar código por WhatsApp</Boton>
    </form>}
    {fase === "pendiente" && <form className="grid gap-4" onSubmit={e => enviar(e, "verificar")}>
      <p>Verifica tu celular para publicar o reclamar.</p>
      <CampoTexto name="codigo" etiqueta="Código de WhatsApp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
      <Boton type="submit" disabled={bloqueado && segundos > 0} cargando={ocupado}>Verificar código</Boton>
      <Boton variante="secundario" disabled={segundos > 0 || ocupado} onClick={() => ejecutar("reenviar")}>Reenviar código</Boton>
    </form>}
    {fase === "verificada" && <p>Tu cuenta está verificada. Ya puedes publicar y reclamar.</p>}
    <div role="status">{aviso} {segundos > 0 && <span>Tiempo restante: {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, "0")}</span>}</div>
    {sesion && <Boton variante="secundario" disabled={ocupado} onClick={async () => {
      await db.current?.auth.signOut(); setSesion(null); setFase("correo"); setHasta(0); setAviso("");
    }}>Cerrar sesión</Boton>}
  </section>;
}
