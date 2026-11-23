import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const base = vi.hoisted(() => ({ db: null as PGlite | null }));

/** Cliente de Supabase de mentira: la autenticación es falsa, pero rpc e insert corren el SQL verdadero. */
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async (token: string) => {
        const id = token.startsWith("token-") ? token.slice(6) : null;
        const fila = id && /^[0-9a-f-]{36}$/.test(id) ? (await base.db!.query("select 1 from auth.users where id=$1", [id])).rows[0] : null;
        return fila
          ? { data: { user: { id, email_confirmed_at: "2026-11-23T00:00:00Z" } }, error: null }
          : { data: { user: null }, error: { message: "sesión inválida" } };
      },
    },
    rpc: async (funcion: string, argumentos: Record<string, unknown>) => {
      const nombres = Object.keys(argumentos);
      const valores = nombres.map((n) => (typeof argumentos[n] === "object" ? JSON.stringify(argumentos[n]) : argumentos[n]));
      const llamada = nombres.map((n, i) => `${n} => $${i + 1}`).join(", ");
      try {
        const r = await base.db!.query<{ r: unknown }>(`select public.${funcion}(${llamada}) r`, valores);
        return { data: r.rows[0].r, error: null };
      } catch (error) {
        return { data: null, error: { code: (error as { code?: string }).code } };
      }
    },
    from: (tabla: string) => ({
      insert: async (fila: Record<string, unknown>) => {
        const columnas = Object.keys(fila);
        try {
          await base.db!.query(
            `insert into public.${tabla}(${columnas.join(",")}) values(${columnas.map((_, i) => `$${i + 1}`).join(",")})`,
            columnas.map((c) => fila[c]),
          );
          return { error: null };
        } catch (error) {
          return { error: { code: (error as { code?: string }).code } };
        }
      },
    }),
  }),
}));

import { POST } from "@/app/api/perdidas/route";

const RAIZ = "../supabase/";
const leer = (ruta: string) => readFileSync(RAIZ + ruta, "utf8");
const SECRETO = "clave-de-prueba-para-dni-de-32-caracteres";

beforeAll(async () => {
  base.db = new PGlite();
  await base.db.exec(leer("tests/simulador_supabase_local.sql").replace("create extension if not exists pgcrypto with schema extensions;", ""));
  for (const archivo of readdirSync(`${RAIZ}migrations`).filter((f) => f.endsWith(".sql")).sort()) {
    await base.db.exec(leer(`migrations/${archivo}`));
  }
}, 30000);
afterAll(() => base.db?.close());

beforeEach(async () => {
  await base.db!.exec("delete from public.limites_de_uso");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.prueba");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-de-servicio");
  vi.stubEnv("DNI_HMAC_SECRET", SECRETO);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function persona(verificado = true) {
  const id = randomUUID();
  await base.db!.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [id, `${id}@example.test`]);
  await base.db!.query("update public.usuarios set verificado=$2 where id=$1", [id, verificado]);
  return { id, token: `token-${id}` };
}

const PERDIDA = {
  categoria: "celular",
  descripcion: "Celular negro con funda azul",
  fecha: new Date().toISOString().slice(0, 10),
  distrito: "Ayacucho",
  rasgos: { fondo_pantalla: "Foto de un perro", imei_ultimos_4: "4821" },
};

function enviar(cuerpo: unknown, token?: string) {
  return POST(
    new Request("http://localhost/api/perdidas", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
}

const filas = async (consulta: string, parametros: unknown[] = []) =>
  (await base.db!.query<Record<string, string>>(consulta, parametros)).rows;

describe("POST /api/perdidas", () => {
  test("una cuenta verificada guarda la pérdida, sus rasgos y deja el evento del piloto", async () => {
    const { id, token } = await persona();
    const respuesta = await enviar(PERDIDA, token);
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(Object.keys(cuerpo).sort()).toEqual(["estado", "id"]);

    expect(await filas("select estado, distrito from public.perdidas where dueno_id=$1", [id])).toEqual([{ estado: "activa", distrito: "Ayacucho" }]);
    expect(await filas("select tipo from public.rasgos_ocultos where perdida_id=$1 order by tipo", [cuerpo.id])).toEqual([
      { tipo: "fondo_pantalla" },
      { tipo: "imei_ultimos_4" },
    ]);
    expect(await filas("select accion, distrito from public.eventos where usuario_id=$1", [id])).toEqual([
      { accion: "perdida_publicada", distrito: "Ayacucho" },
    ]);
  });

  test("la respuesta no repite los rasgos ocultos", async () => {
    const { token } = await persona();
    const texto = await (await enviar(PERDIDA, token)).text();
    expect(texto).not.toMatch(/Foto de un perro|4821|imei|rasgo/);
  });

  test("sin sesión o con sesión falsa responde 401 y no guarda nada", async () => {
    const antes = await filas("select count(*)::int n from public.perdidas");
    expect((await enviar(PERDIDA)).status).toBe(401);
    expect((await enviar(PERDIDA, "token-inventado")).status).toBe(401);
    expect((await enviar(PERDIDA, "token-" + randomUUID())).status).toBe(401);
    expect(await filas("select count(*)::int n from public.perdidas")).toEqual(antes);
  });

  test("una cuenta sin verificar responde 403 con mensaje en español y no deja evento", async () => {
    const { id, token } = await persona(false);
    const respuesta = await enviar(PERDIDA, token);
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).mensaje).toBe("Verifica tu celular para poder publicar.");
    expect(await filas("select 1 from public.eventos where usuario_id=$1", [id])).toHaveLength(0);
  });

  test("con 1 solo rasgo responde 400 y explica por qué", async () => {
    const { token } = await persona();
    const respuesta = await enviar({ ...PERDIDA, rasgos: { fondo_pantalla: "Un perro" } }, token);
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).errores.rasgos).toBe("Llena al menos 2 de los 3 rasgos ocultos.");
  });

  test("la segunda pérdida activa sin suscripción responde 409", async () => {
    const { token } = await persona();
    expect((await enviar(PERDIDA, token)).status).toBe(201);
    const segunda = await enviar(PERDIDA, token);
    expect(segunda.status).toBe(409);
    expect((await segunda.json()).mensaje).toContain("pérdida activa");
  });

  test("el DNI se guarda solo como HMAC en la base", async () => {
    const { id, token } = await persona();
    const respuesta = await enviar(
      { ...PERDIDA, categoria: "dni", rasgos: { dni: "12345678", fecha_emision: "2019-03-14" } },
      token,
    );
    expect(respuesta.status).toBe(201);
    expect(await respuesta.text()).not.toContain("12345678");

    const guardado = await filas(
      "select tipo, valor_protegido from public.rasgos_ocultos r join public.perdidas p on p.id=r.perdida_id where p.dueno_id=$1 order by tipo",
      [id],
    );
    expect(guardado.map((f) => f.tipo)).toEqual(["dni_hmac", "fecha_emision_hmac"]);
    expect(JSON.stringify(guardado)).not.toMatch(/12345678|2019-03-14/);
    expect(guardado[0].valor_protegido).toMatch(/^[0-9a-f]{64}$/);
  });

  test("el sexto intento con DNI en una hora responde 429, aunque los anteriores hayan sido inválidos", async () => {
    const { token } = await persona();
    const invalido = { ...PERDIDA, categoria: "dni", rasgos: { dni: "1", fecha_emision: "2019-03-14" } };
    const estados: number[] = [];
    for (let i = 0; i < 6; i++) estados.push((await enviar(invalido, token)).status);
    expect(estados).toEqual([400, 400, 400, 400, 400, 429]);
  });

  test("el límite por origen junta a varias cuentas", async () => {
    const invalido = { ...PERDIDA, categoria: "dni", rasgos: { dni: "1", fecha_emision: "2019-03-14" } };
    const estados: number[] = [];
    for (let i = 0; i < 21; i++) estados.push((await enviar(invalido, (await persona()).token)).status);
    expect(estados.slice(0, 20).every((e) => e === 400)).toBe(true);
    expect(estados[20]).toBe(429);
  });

  test("un cuerpo que no es JSON responde 400 sin romper", async () => {
    const { token } = await persona();
    const respuesta = await enviar("esto no es json", token);
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).mensaje).toBe("No se pudo leer lo que enviaste.");
  });

  test("si falta la clave del DNI responde 503, anota el problema sin datos y no guarda nada", async () => {
    vi.stubEnv("DNI_HMAC_SECRET", "");
    const { id, token } = await persona();
    const respuesta = await enviar(PERDIDA, token);
    expect(respuesta.status).toBe(503);
    expect(await filas("select 1 from public.perdidas where dueno_id=$1", [id])).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("DNI_HMAC_SECRET"));
  });

  test("si falla el registro del evento, la pérdida igual queda guardada", async () => {
    const { id, token } = await persona();
    await base.db!.exec("alter table public.eventos rename to eventos_apartada");
    try {
      expect((await enviar(PERDIDA, token)).status).toBe(201);
    } finally {
      await base.db!.exec("alter table public.eventos_apartada rename to eventos");
    }
    expect(await filas("select 1 from public.perdidas where dueno_id=$1", [id])).toHaveLength(1);
  });
});
