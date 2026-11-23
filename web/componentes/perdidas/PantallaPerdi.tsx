"use client";

import Link from "next/link";
import { useSesionParaPublicar } from "@/lib/useSesionParaPublicar";
import Aviso from "../Aviso";
import { estilosBoton } from "../Boton";
import Cargando from "../Cargando";
import FormularioDePerdida from "./FormularioDePerdida";

export default function PantallaPerdi() {
  const estado = useSesionParaPublicar();

  if (estado === "cargando") return <Cargando />;
  if (estado === "habilitada") return <FormularioDePerdida />;
  if (estado === "sin_configuracion") return <Aviso tipo="aviso">Falta configurar la conexión con Supabase.</Aviso>;
  if (estado === "suspendida") return <Aviso tipo="error">Tu cuenta está suspendida y no puede publicar.</Aviso>;

  const sinSesion = estado === "sin_sesion";
  return (
    <div className="flex flex-col gap-4">
      <Aviso tipo="aviso" titulo={sinSesion ? "Entra con tu cuenta" : "Primero verifica tu celular"}>
        {sinSesion
          ? "Para publicar necesitas una cuenta con el celular verificado."
          : "Tu cuenta aún no tiene el celular verificado."}
      </Aviso>
      <Link href="/perfil" className={estilosBoton("primario", true)}>
        {sinSesion ? "Crear mi cuenta o entrar" : "Verificar mi celular"}
      </Link>
    </div>
  );
}
