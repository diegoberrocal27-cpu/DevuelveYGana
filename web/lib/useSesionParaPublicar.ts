import { useEffect, useState } from "react";
import { clienteDelNavegador } from "./supabase-navegador";

export type EstadoParaPublicar =
  | "cargando"
  | "sin_configuracion"
  | "sin_sesion"
  | "sin_verificar"
  | "suspendida"
  | "habilitada";

/** Dice si la persona puede publicar, usando la sesión de Supabase y su fila en `usuarios`. */
export function useSesionParaPublicar(): EstadoParaPublicar {
  const [estado, setEstado] = useState<EstadoParaPublicar>(() => (clienteDelNavegador() ? "cargando" : "sin_configuracion"));

  useEffect(() => {
    const db = clienteDelNavegador();
    if (!db) return;
    let activo = true;

    async function consultar() {
      const { data: sesion } = await db!.auth.getSession();
      if (!activo) return;
      if (!sesion.session) return setEstado("sin_sesion");

      const { data: usuario } = await db!
        .from("usuarios")
        .select("verificado, bloqueado")
        .eq("id", sesion.session.user.id)
        .maybeSingle();
      if (!activo) return;
      if (usuario?.bloqueado) return setEstado("suspendida");
      setEstado(usuario?.verificado ? "habilitada" : "sin_verificar");
    }

    void consultar();
    const { data } = db.auth.onAuthStateChange(() => void consultar());
    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return estado;
}
