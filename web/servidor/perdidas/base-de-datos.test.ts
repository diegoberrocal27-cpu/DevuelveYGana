import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const db = new PGlite();
const RAIZ = "../supabase/";
const leer = (ruta: string) => readFileSync(RAIZ + ruta, "utf8");

beforeAll(async () => {
  await db.exec(leer("tests/simulador_supabase_local.sql").replace("create extension if not exists pgcrypto with schema extensions;", ""));
  for (const archivo of readdirSync(`${RAIZ}migrations`).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(leer(`migrations/${archivo}`));
  }
}, 30000);
afterAll(() => db.close());

const RASGOS = [
  { tipo: "fondo_pantalla", valor: "Foto de un perro" },
  { tipo: "imei_ultimos_4", valor: "4821" },
];

async function usuario(cambios: { verificado?: boolean; bloqueado?: boolean } = {}) {
  const id = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,$2)", [id, `${id}@example.test`]);
  await db.query("update public.usuarios set verificado=$2, bloqueado=$3 where id=$1", [
    id,
    cambios.verificado ?? true,
    cambios.bloqueado ?? false,
  ]);
  return id;
}

type Respuesta = { estado: string; id?: string };

async function registrar(dueno: string, cambios: Record<string, unknown> = {}) {
  const datos = {
    categoria: "celular",
    descripcion: "Celular negro con funda azul",
    fecha: new Date().toISOString().slice(0, 10),
    distrito: "Ayacucho",
    rasgos: RASGOS,
    maximo: 1,
    ...cambios,
  };
  const r = await db.query<{ r: Respuesta }>(
    "select public.registrar_perdida($1,$2,$3,$4,$5,$6::jsonb,$7) r",
    [dueno, datos.categoria, datos.descripcion, datos.fecha, datos.distrito, JSON.stringify(datos.rasgos), datos.maximo],
  );
  return r.rows[0].r;
}

const contar = async (tabla: string, dueno?: string) =>
  Number(
    (
      await db.query<{ n: string }>(
        dueno
          ? `select count(*) n from public.${tabla} where dueno_id = $1`
          : `select count(*) n from public.${tabla}`,
        dueno ? [dueno] : [],
      )
    ).rows[0].n,
  );

async function como<T>(rol: "anon" | "authenticated" | "service_role", usuarioId: string | null, accion: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [usuarioId ?? ""]);
  await db.exec(`set role ${rol}`);
  try {
    return await accion();
  } finally {
    await db.exec("reset role");
  }
}

describe("registrar_perdida (HU-02)", () => {
  test("el rol del servidor puede registrar aunque el proyecto no dé permisos por defecto", async () => {
    const dueno = await usuario();
    const respuesta = await como("service_role", null, () => registrar(dueno));
    expect(respuesta.estado).toBe("creada");
  });

  test("con 2 rasgos guarda la pérdida activa y sus rasgos en un solo paso", async () => {
    const dueno = await usuario();
    const respuesta = await registrar(dueno);
    expect(respuesta.estado).toBe("creada");
    const perdida = (await db.query("select categoria, estado, distrito from public.perdidas where id=$1", [respuesta.id])).rows[0];
    expect(perdida).toEqual({ categoria: "celular", estado: "activa", distrito: "Ayacucho" });
    const rasgos = await db.query("select tipo, valor_protegido from public.rasgos_ocultos where perdida_id=$1 order by tipo", [respuesta.id]);
    expect(rasgos.rows).toEqual([
      { tipo: "fondo_pantalla", valor_protegido: "Foto de un perro" },
      { tipo: "imei_ultimos_4", valor_protegido: "4821" },
    ]);
  });

  test("con 1 solo rasgo no guarda nada", async () => {
    const dueno = await usuario();
    expect((await registrar(dueno, { rasgos: [RASGOS[0]] })).estado).toBe("invalido");
    expect(await contar("perdidas", dueno)).toBe(0);
  });

  test("un rasgo vacío o repetido no cuenta como dos", async () => {
    const dueno = await usuario();
    expect((await registrar(dueno, { rasgos: [RASGOS[0], { tipo: "imei_ultimos_4", valor: "  " }] })).estado).toBe("invalido");
    expect((await registrar(dueno, { rasgos: [RASGOS[0], RASGOS[0]] })).estado).toBe("invalido");
    expect(await contar("perdidas", dueno)).toBe(0);
  });

  test("una cuenta sin verificar o bloqueada no puede registrar", async () => {
    const sinVerificar = await usuario({ verificado: false });
    const bloqueada = await usuario({ bloqueado: true });
    expect((await registrar(sinVerificar)).estado).toBe("no_habilitada");
    expect((await registrar(bloqueada)).estado).toBe("no_habilitada");
    expect((await registrar(randomUUID())).estado).toBe("no_habilitada");
    expect(await contar("perdidas", sinVerificar)).toBe(0);
  });

  test("la segunda pérdida activa se rechaza y, al cerrar la primera, se permite otra", async () => {
    const dueno = await usuario();
    const primera = await registrar(dueno);
    expect((await registrar(dueno)).estado).toBe("limite");
    await db.query("update public.perdidas set estado='cerrada' where id=$1", [primera.id]);
    expect((await registrar(dueno)).estado).toBe("creada");
    expect((await registrar(dueno, { maximo: 2 })).estado).toBe("creada");
  });

  test("rechaza fecha futura, descripción corta y distrito fuera del catálogo", async () => {
    const dueno = await usuario();
    const manana = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    expect((await registrar(dueno, { fecha: manana })).estado).toBe("invalido");
    expect((await registrar(dueno, { descripcion: "corto" })).estado).toBe("invalido");
    expect((await registrar(dueno, { distrito: "Otro" })).estado).toBe("invalido");
    expect((await registrar(dueno, { distrito: "Lima" })).estado).toBe("invalido");
    expect(await contar("perdidas", dueno)).toBe(0);
  });

  test("el navegador no puede ejecutar la función", async () => {
    const dueno = await usuario();
    await expect(como("authenticated", dueno, () => registrar(dueno))).rejects.toMatchObject({ code: "42501" });
    await expect(como("anon", null, () => registrar(dueno))).rejects.toMatchObject({ code: "42501" });
  });
});

describe("privacidad de los rasgos ocultos", () => {
  test("sin sesión no se puede leer ninguna pérdida ni rasgo", async () => {
    const dueno = await usuario();
    await registrar(dueno);
    await expect(como("anon", null, () => db.query("select * from public.perdidas"))).rejects.toMatchObject({ code: "42501" });
    await expect(como("anon", null, () => db.query("select * from public.rasgos_ocultos"))).rejects.toMatchObject({ code: "42501" });
  });

  test("otra persona no ve las pérdidas ni los rasgos del dueño", async () => {
    const dueno = await usuario();
    const otra = await usuario();
    await registrar(dueno);
    const ve = await como("authenticated", otra, async () => ({
      perdidas: (await db.query("select * from public.perdidas")).rows,
      rasgos: (await db.query("select * from public.rasgos_ocultos")).rows,
    }));
    expect(ve).toEqual({ perdidas: [], rasgos: [] });
  });

  test("el operador y el administrador tampoco ven los rasgos", async () => {
    const dueno = await usuario();
    const operador = await usuario();
    await db.query("update public.usuarios set rol='operador' where id=$1", [operador]);
    await registrar(dueno);
    const rasgos = await como("authenticated", operador, async () => (await db.query("select * from public.rasgos_ocultos")).rows);
    expect(rasgos).toEqual([]);
  });

  test("el dueño sí ve sus rasgos", async () => {
    const dueno = await usuario();
    await registrar(dueno);
    const propios = await como("authenticated", dueno, async () => (await db.query("select tipo from public.rasgos_ocultos")).rows);
    expect(propios).toHaveLength(2);
  });
});

describe("consumir_intento", () => {
  const intentar = async (clave: string, maximo = 5) =>
    (await db.query<{ s: number }>("select public.consumir_intento($1,$2,interval '1 hour') s", [clave, maximo])).rows[0].s;

  test("permite el máximo de intentos y rechaza el siguiente con los segundos de espera", async () => {
    const clave = `usuario:${randomUUID()}`;
    for (let i = 0; i < 5; i++) expect(await intentar(clave)).toBe(0);
    const espera = await intentar(clave);
    expect(espera).toBeGreaterThan(3590);
    expect(espera).toBeLessThanOrEqual(3600);
    expect(await intentar(clave)).toBeGreaterThan(0);
  });

  test("las claves cuentan por separado", async () => {
    const a = `ip:${randomUUID()}`;
    for (let i = 0; i < 6; i++) await intentar(a);
    expect(await intentar(`ip:${randomUUID()}`)).toBe(0);
  });

  test("pasada la ventana se vuelve a permitir", async () => {
    const clave = `usuario:${randomUUID()}`;
    for (let i = 0; i < 6; i++) await intentar(clave);
    await db.query("update public.limites_de_uso set inicio = inicio - interval '61 minutes' where clave=$1", [clave]);
    expect(await intentar(clave)).toBe(0);
  });

  test("el navegador no puede tocar el contador", async () => {
    await expect(como("authenticated", null, () => intentar("x"))).rejects.toMatchObject({ code: "42501" });
    await expect(como("authenticated", null, () => db.query("select * from public.limites_de_uso"))).rejects.toMatchObject({ code: "42501" });
  });
});
