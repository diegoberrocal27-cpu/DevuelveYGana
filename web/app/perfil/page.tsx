"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import Aviso, { type TipoAviso } from "@/componentes/Aviso";
import Boton, { estilosBoton } from "@/componentes/Boton";
import CampoTexto from "@/componentes/CampoTexto";
import Selector from "@/componentes/Selector";
import { DISTRITOS } from "@/lib/catalogos";
import { clienteDelNavegador } from "@/lib/supabase-navegador";

/**
 * HU-01 · Mi perfil.
 * - La PRIMERA vez: correo + contraseña → se confirma el correo con un enlace → se verifica el celular con un
 *   código de WhatsApp (en desarrollo, el código sale en la terminal).
 * - Después: se entra con correo y contraseña, sin correos ni códigos.
 * - Siempre se puede cerrar sesión. Si se olvida la contraseña, se recupera por correo.
 */

type Fase =
  | "configuracion"
  | "cargando"
  | "entrar"
  | "crear"
  | "revisaCorreo"
  | "olvido"
  | "nuevaClave"
  | "registro"
  | "pendiente"
  | "verificada"
  | "suspendida"
  | "servicio";

type Mensaje = { tipo: TipoAviso; texto: string } | null;

const LARGO_MINIMO_CLAVE = 8;
const BORRADOR = "hu01-registro";
const FASES_SIN_SESION: Fase[] = ["entrar", "crear", "revisaCorreo", "olvido"];
const opcionesDistrito = [...DISTRITOS, "Otro"].map((valor) => ({ valor, etiqueta: valor }));

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
  sesion: "Tu sesión terminó. Vuelve a entrar.",
  suspendida: "La cuenta está suspendida.",
};

/** Traduce los errores de Supabase Auth a mensajes claros (sin revelar si un correo existe). */
function mensajeDeAuth(error: { code?: string; message?: string; status?: number }): string {
  const codigo = error.code ?? "";
  if (codigo === "invalid_credentials") return "Correo o contraseña incorrectos.";
  if (codigo === "email_not_confirmed") return "Primero confirma tu correo con el enlace que te enviamos.";
  if (codigo === "weak_password") return `La contraseña es muy débil. Usa al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
  if (codigo === "same_password") return "La nueva contraseña debe ser distinta de la anterior.";
  if (codigo.includes("rate_limit") || error.status === 429) {
    return "Se alcanzó el límite de correos por ahora. Inténtalo en una hora.";
  }
  return "No se pudo completar. Inténtalo otra vez.";
}

async function consultar(token: string, accion: string, campos: Record<string, string> = {}) {
  const r = await fetch("/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify({ accion, ...campos }),
  });
  return (await r.json()) as { estado: string; hasta?: string };
}

function texto(campos: Record<string, FormDataEntryValue>, nombre: string) {
  const valor = campos[nombre];
  return typeof valor === "string" ? valor.trim() : "";
}

function CamposCelularYDistrito() {
  return (
    <>
      <CampoTexto
        name="celular"
        etiqueta="Celular peruano"
        type="tel"
        inputMode="numeric"
        pattern="9[0-9]{8}"
        maxLength={9}
        required
        ayuda="9 dígitos, empezando por 9. Lo verificaremos por WhatsApp una sola vez."
      />
      <Selector name="distrito" etiqueta="Distrito de residencia" opciones={opcionesDistrito} required />
    </>
  );
}

export default function Pagina() {
  const db = clienteDelNavegador();
  const recuperando = useRef(false);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [fase, setFase] = useState<Fase>(db ? "cargando" : "configuracion");
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [ocupado, setOcupado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [hasta, setHasta] = useState(0);
  const [ahora, setAhora] = useState(0);
  const [correoPendiente, setCorreoPendiente] = useState("");
  const [recarga, setRecarga] = useState(0);

  // Escucha la sesión: entrar, salir, volver del enlace del correo o del enlace para cambiar la contraseña.
  useEffect(() => {
    if (!db) return;
    const { data } = db.auth.onAuthStateChange((evento, actual) => {
      if (evento === "PASSWORD_RECOVERY") {
        recuperando.current = true;
        setFase("nuevaClave");
      }
      setSesion(actual);
      if (!actual) {
        setHasta(0);
        setFase((anterior) => (FASES_SIN_SESION.includes(anterior) ? anterior : "entrar"));
      }
    });
    return () => data.subscription.unsubscribe();
  }, [db]);

  // Con sesión, pregunta al servidor en qué paso está la cuenta (y termina el registro pendiente si lo hay).
  const token = sesion?.access_token;
  const correoDeSesion = sesion?.user.email?.toLowerCase();
  useEffect(() => {
    if (!token || recuperando.current) return;
    let activo = true;
    (async () => {
      let r = await consultar(token, "estado");
      const guardado = localStorage.getItem(BORRADOR);
      if (guardado && r.estado === "registro") {
        const borrador = JSON.parse(guardado);
        if (borrador.correo === correoDeSesion && borrador.vence > Date.now()) {
          localStorage.removeItem(BORRADOR);
          r = await consultar(token, "registrar", { celular: borrador.celular, distrito: borrador.distrito });
        }
      }
      if (!activo) return;
      aplicarRespuesta(r);
    })().catch(() => {
      if (activo) {
        setFase("servicio");
        setMensaje({ tipo: "error", texto: mensajes.servicio });
      }
    });
    return () => {
      activo = false;
    };
  }, [token, correoDeSesion, recarga]);

  // Cuenta regresiva del bloqueo o del reenvío.
  useEffect(() => {
    if (!hasta) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= hasta) {
        setHasta(0);
        setMensaje(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [hasta]);

  function aplicarRespuesta(r: { estado: string; hasta?: string }) {
    if (["bloqueo", "enviado", "falloEnvio", "espera"].includes(r.estado)) setFase("pendiente");
    else if (["duplicado", "invalido"].includes(r.estado)) setFase("registro");
    else if (["registro", "pendiente", "verificada", "suspendida"].includes(r.estado)) setFase(r.estado as Fase);
    const textoDeEstado = r.estado === "verificada" ? "" : mensajes[r.estado];
    const tipo: TipoAviso = ["enviado", "pendiente"].includes(r.estado) ? "info" : "error";
    setMensaje(textoDeEstado ? { tipo, texto: textoDeEstado } : null);
    setBloqueado(r.estado === "bloqueo");
    setHasta(r.hasta ? Date.parse(r.hasta) : 0);
    setAhora(Date.now());
  }

  function cambiarFase(nueva: Fase) {
    setMensaje(null);
    setFase(nueva);
  }

  async function ejecutar(tarea: () => Promise<void>) {
    if (ocupado || !db) return;
    setOcupado(true);
    setMensaje(null);
    try {
      await tarea();
    } catch {
      setMensaje({ tipo: "error", texto: mensajes.servicio });
    } finally {
      setOcupado(false);
    }
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>, accion: (campos: Record<string, FormDataEntryValue>) => Promise<void>) {
    evento.preventDefault();
    const campos = Object.fromEntries(new FormData(evento.currentTarget));
    void ejecutar(() => accion(campos));
  }

  async function entrar(campos: Record<string, FormDataEntryValue>) {
    const correo = texto(campos, "correo");
    const { error } = await db!.auth.signInWithPassword({ email: correo, password: String(campos.clave ?? "") });
    if (error) {
      if (error.code === "email_not_confirmed") setCorreoPendiente(correo);
      setMensaje({ tipo: "error", texto: mensajeDeAuth(error) });
    }
  }

  async function crearCuenta(campos: Record<string, FormDataEntryValue>) {
    const correo = texto(campos, "correo").toLowerCase();
    const clave = String(campos.clave ?? "");
    if (clave.length < LARGO_MINIMO_CLAVE) {
      return setMensaje({ tipo: "error", texto: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.` });
    }
    if (clave !== String(campos.clave2 ?? "")) {
      return setMensaje({ tipo: "error", texto: "Las contraseñas no coinciden." });
    }

    const celular = texto(campos, "celular");
    const distrito = texto(campos, "distrito");
    const disponible = await consultar("", "disponible", { celular, distrito });
    if (disponible.estado !== "disponible") {
      return setMensaje({ tipo: "error", texto: mensajes[disponible.estado] ?? mensajes.servicio });
    }

    // El celular se guarda en este navegador hasta que vuelva del enlace del correo (vence en 24 h, como el enlace).
    localStorage.setItem(BORRADOR, JSON.stringify({ correo, celular, distrito, vence: Date.now() + 24 * 3600 * 1000 }));
    const { data, error } = await db!.auth.signUp({
      email: correo,
      password: clave,
      options: { emailRedirectTo: window.location.origin + "/perfil" },
    });
    if (error) {
      localStorage.removeItem(BORRADOR);
      return setMensaje({ tipo: "error", texto: mensajeDeAuth(error) });
    }
    if (!data.session) {
      setCorreoPendiente(correo);
      setFase("revisaCorreo");
    }
    // Si Supabase no pide confirmar el correo, llega la sesión y el efecto de arriba envía el código.
  }

  async function reenviarConfirmacion() {
    const { error } = await db!.auth.resend({
      type: "signup",
      email: correoPendiente,
      options: { emailRedirectTo: window.location.origin + "/perfil" },
    });
    setMensaje(
      error
        ? { tipo: "error", texto: mensajeDeAuth(error) }
        : { tipo: "info", texto: "Te reenviamos el enlace. Revisa también spam y promociones." },
    );
  }

  async function olvideClave(campos: Record<string, FormDataEntryValue>) {
    const { error } = await db!.auth.resetPasswordForEmail(texto(campos, "correo"), {
      redirectTo: window.location.origin + "/perfil",
    });
    setMensaje(
      error
        ? { tipo: "error", texto: mensajeDeAuth(error) }
        : { tipo: "info", texto: "Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña." },
    );
  }

  async function guardarNuevaClave(campos: Record<string, FormDataEntryValue>) {
    const clave = String(campos.clave ?? "");
    if (clave.length < LARGO_MINIMO_CLAVE) {
      return setMensaje({ tipo: "error", texto: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.` });
    }
    if (clave !== String(campos.clave2 ?? "")) return setMensaje({ tipo: "error", texto: "Las contraseñas no coinciden." });
    const { error } = await db!.auth.updateUser({ password: clave });
    if (error) return setMensaje({ tipo: "error", texto: mensajeDeAuth(error) });
    recuperando.current = false;
    setRecarga((n) => n + 1);
    setMensaje({ tipo: "exito", texto: "Listo. Desde ahora entra con tu nueva contraseña." });
  }

  async function operar(accion: "registrar" | "verificar" | "reenviar", campos: Record<string, string> = {}) {
    if (!sesion) return setMensaje({ tipo: "error", texto: mensajes.sesion });
    const r = await consultar(sesion.access_token, accion, campos);
    aplicarRespuesta(r);
    if (r.estado === "verificada") setMensaje(null);
  }

  async function cerrarSesion() {
    await db!.auth.signOut();
    localStorage.removeItem(BORRADOR);
    setSesion(null);
    setHasta(0);
    setCorreoPendiente("");
    cambiarFase("entrar");
  }

  const segundos = Math.max(0, Math.ceil((hasta - ahora) / 1000));
  const conSesion = Boolean(sesion) && !FASES_SIN_SESION.includes(fase);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      {conSesion && (
        <div className="flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4">
          <div>
            <p className="text-sm text-texto-secundario">Sesión iniciada como</p>
            <p className="font-semibold break-all">{sesion!.user.email}</p>
          </div>
          <Boton variante="secundario" anchoCompleto disabled={ocupado} onClick={() => void ejecutar(cerrarSesion)}>
            Cerrar sesión
          </Boton>
        </div>
      )}

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {segundos > 0 && (
        <p className="text-sm text-texto-secundario" role="timer">
          Tiempo restante: {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, "0")}
        </p>
      )}

      {fase === "cargando" && <p>Cargando tu perfil…</p>}
      {fase === "configuracion" && <Aviso tipo="aviso">Falta configurar la conexión con Supabase.</Aviso>}

      {fase === "entrar" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => alEnviar(e, entrar)}>
          <CampoTexto name="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" required />
          <CampoTexto name="clave" etiqueta="Contraseña" type="password" autoComplete="current-password" required />
          <Boton type="submit" anchoCompleto cargando={ocupado}>
            Entrar
          </Boton>
          {correoPendiente && (
            <Boton variante="secundario" anchoCompleto disabled={ocupado} onClick={() => void ejecutar(reenviarConfirmacion)}>
              Reenviar enlace de confirmación
            </Boton>
          )}
          <button type="button" className="text-sm font-semibold text-turquesa-oscuro" onClick={() => cambiarFase("olvido")}>
            Olvidé mi contraseña
          </button>
          <p className="text-center text-sm text-texto-secundario">¿No tienes cuenta?</p>
          <Boton variante="secundario" anchoCompleto onClick={() => cambiarFase("crear")}>
            Crear una cuenta
          </Boton>
        </form>
      )}

      {fase === "crear" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => alEnviar(e, crearCuenta)}>
          <p className="text-texto-secundario">
            Solo la primera vez confirmamos tu correo y tu celular. Después entrarás con tu correo y contraseña.
          </p>
          <CampoTexto name="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" required />
          <CampoTexto
            name="clave"
            etiqueta="Contraseña"
            type="password"
            autoComplete="new-password"
            minLength={LARGO_MINIMO_CLAVE}
            ayuda={`Al menos ${LARGO_MINIMO_CLAVE} caracteres.`}
            required
          />
          <CampoTexto name="clave2" etiqueta="Repite la contraseña" type="password" autoComplete="new-password" required />
          <CamposCelularYDistrito />
          <Boton type="submit" anchoCompleto cargando={ocupado}>
            Crear mi cuenta
          </Boton>
          <Boton variante="secundario" anchoCompleto onClick={() => cambiarFase("entrar")}>
            Ya tengo una cuenta
          </Boton>
        </form>
      )}

      {fase === "revisaCorreo" && (
        <div className="flex flex-col gap-4">
          <Aviso tipo="info" titulo="Revisa tu correo">
            Te enviamos un enlace a {correoPendiente}. Ábrelo en este mismo navegador para confirmar tu correo; luego
            verificaremos tu celular.
          </Aviso>
          <Boton variante="secundario" anchoCompleto disabled={ocupado} onClick={() => void ejecutar(reenviarConfirmacion)}>
            Reenviar enlace
          </Boton>
          <Boton variante="secundario" anchoCompleto onClick={() => cambiarFase("entrar")}>
            Ya lo confirmé, quiero entrar
          </Boton>
        </div>
      )}

      {fase === "olvido" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => alEnviar(e, olvideClave)}>
          <p className="text-texto-secundario">Te enviaremos un enlace para crear una nueva contraseña.</p>
          <CampoTexto name="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" required />
          <Boton type="submit" anchoCompleto cargando={ocupado}>
            Enviar enlace
          </Boton>
          <Boton variante="secundario" anchoCompleto onClick={() => cambiarFase("entrar")}>
            Volver
          </Boton>
        </form>
      )}

      {fase === "nuevaClave" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => alEnviar(e, guardarNuevaClave)}>
          <CampoTexto
            name="clave"
            etiqueta="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            minLength={LARGO_MINIMO_CLAVE}
            ayuda={`Al menos ${LARGO_MINIMO_CLAVE} caracteres.`}
            required
          />
          <CampoTexto name="clave2" etiqueta="Repite la contraseña" type="password" autoComplete="new-password" required />
          <Boton type="submit" anchoCompleto cargando={ocupado}>
            Guardar contraseña
          </Boton>
        </form>
      )}

      {fase === "registro" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) =>
            alEnviar(e, (c) => operar("registrar", { celular: texto(c, "celular"), distrito: texto(c, "distrito") }))
          }
        >
          <p className="text-texto-secundario">Falta verificar tu celular para publicar o reclamar.</p>
          <CamposCelularYDistrito />
          <Boton type="submit" anchoCompleto cargando={ocupado}>
            Enviar código por WhatsApp
          </Boton>
        </form>
      )}

      {fase === "pendiente" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => alEnviar(e, (c) => operar("verificar", { codigo: texto(c, "codigo") }))}>
          <p className="text-texto-secundario">Escribe el código de 6 dígitos que te enviamos por WhatsApp.</p>
          <CampoTexto
            name="codigo"
            etiqueta="Código de WhatsApp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />
          <Boton type="submit" anchoCompleto disabled={bloqueado && segundos > 0} cargando={ocupado}>
            Verificar código
          </Boton>
          <Boton variante="secundario" anchoCompleto disabled={segundos > 0 || ocupado} onClick={() => void ejecutar(() => operar("reenviar"))}>
            Reenviar código
          </Boton>
        </form>
      )}

      {fase === "verificada" && (
        <div className="flex flex-col gap-4">
          <Aviso tipo="exito" titulo="Cuenta verificada">
            Tu correo y tu celular están confirmados. Ya puedes publicar y reclamar.
          </Aviso>
          <Link href="/perdi" className={estilosBoton("primario", true)}>
            Perdí algo
          </Link>
          <Link href="/encontre" className={estilosBoton("secundario", true)}>
            Encontré algo
          </Link>
        </div>
      )}

      {fase === "suspendida" && <Aviso tipo="error">{mensajes.suspendida}</Aviso>}
      {fase === "servicio" && (
        <Boton variante="secundario" anchoCompleto onClick={() => setRecarga((n) => n + 1)}>
          Reintentar
        </Boton>
      )}
    </section>
  );
}
