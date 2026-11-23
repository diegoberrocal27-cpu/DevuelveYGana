"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clienteDelNavegador } from "@/lib/supabase-navegador";
import { IconoPerfil } from "./iconos";

/** Círculo del encabezado: la inicial del correo si hay sesión, o un ícono si no. Lleva a Mi perfil. */
export default function AvatarSesion() {
  const [correo, setCorreo] = useState<string | null>(null);

  useEffect(() => {
    const db = clienteDelNavegador();
    if (!db) return;
    const { data } = db.auth.onAuthStateChange((_evento, sesion) => setCorreo(sesion?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <Link
      href="/perfil"
      aria-label={correo ? `Mi perfil (${correo})` : "Entrar o crear cuenta"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-turquesa-claro font-titulo text-sm font-semibold text-turquesa-oscuro hover:bg-turquesa hover:text-white"
    >
      {correo ? correo[0].toUpperCase() : <IconoPerfil className="h-5 w-5" />}
    </Link>
  );
}
