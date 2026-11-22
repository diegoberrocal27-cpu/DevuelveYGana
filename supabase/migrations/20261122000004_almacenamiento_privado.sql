-- T-02 · Migración 4 de 4: almacenamiento privado (Supabase Storage).
--
-- Dos buckets privados. Ninguno tiene políticas para anon ni authenticated: con RLS activo en
-- storage.objects eso significa "acceso solo por el servidor" (service_role).
--   fotos-originales   -> foto original del hallazgo (HU-03).
--   fotos-difuminadas  -> copia difuminada; el servidor la entrega al dueño emparejado con una
--                         URL firmada de corta duración (el público nunca ve fotos).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos-originales',  'fotos-originales',  false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('fotos-difuminadas', 'fotos-difuminadas', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Nota: no se crea ninguna política sobre storage.objects para estos buckets, a propósito.
-- Si alguien agrega una más adelante, la prueba "fotos privadas" de supabase/tests/rls.sql falla.
