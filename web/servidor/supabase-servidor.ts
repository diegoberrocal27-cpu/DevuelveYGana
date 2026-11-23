import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase del SERVIDOR, con la clave service_role (se salta RLS).
 * Solo se importa desde rutas de API o componentes de servidor; nunca desde un archivo "use client".
 * Devuelve null si falta la configuración en `web/.env.local`.
 */
export function clienteDelServidor(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) return null;
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
