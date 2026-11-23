import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente del navegador con la clave pública. Devuelve null si falta la configuración. */
export function clienteDelNavegador(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return null;
  cliente ??= createClient(url, clave);
  return cliente;
}
