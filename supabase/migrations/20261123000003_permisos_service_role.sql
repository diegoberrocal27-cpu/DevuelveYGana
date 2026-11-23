-- El servidor usa service_role y necesita permiso sobre las tablas, las secuencias y las funciones.
-- Supabase lo da por defecto solo si el proyecto se crea con "acceso automático a la API";
-- aquí se pide de forma explícita para que no dependa de esa opción.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
