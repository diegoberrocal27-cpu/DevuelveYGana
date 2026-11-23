import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, expect, test } from "vitest";

const db = new PGlite();
const raiz = "../supabase/";
const sql = (ruta: string) => readFileSync(raiz + ruta, "utf8");
beforeAll(async () => {
  // El simulador usa pgcrypto para las contraseñas del seed. Estas cuentas solo prueban el registro.
  await db.exec(sql("tests/simulador_supabase_local.sql").replace("create extension if not exists pgcrypto with schema extensions;", ""));
  for (const f of readdirSync(raiz+"migrations").filter(f => f.endsWith(".sql")).sort()) {
    await db.exec(sql("migrations/"+f));
  }
}, 30000);
afterAll(() => db.close());

async function usuario() {
  const id = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,$2)", [id,id+"@example.test"]);
  return id;
}
async function operar(id: string, accion: string, celular = "912345678", distrito: string | null = "Otro", huella = "digest") {
  const r = await db.query<{r: {estado:string; hasta?:string}}>(
    "select public.registro_operar($1,$2,$3,$4,$5) r", [id,accion,celular,distrito,huella]);
  return r.rows[0].r;
}

test("el código correcto habilita la cuenta y se consume", async () => {
  const id = await usuario();
  expect((await operar(id,"registrar")).estado).toBe("enviar");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const permiso = () => db.query("select public.cuenta_habilitada() as ok");
  expect((await permiso()).rows[0]).toEqual({ok:false});
  expect((await operar(id,"verificar")).estado).toBe("verificada");
  expect((await permiso()).rows[0]).toEqual({ok:true});
  expect((await db.query("select from public.codigos_registro where usuario=$1",[id])).rows).toHaveLength(0);
});
test("el código de seis minutos está vencido", async () => {
  const id = await usuario();
  await operar(id,"registrar","912345679");
  await db.query("update public.codigos_registro set vence=vence-interval '6 minutes' where usuario=$1",[id]);
  expect((await operar(id,"verificar")).estado).toBe("vencido");
});
test("tres fallos bloquean verificación y reenvío por quince minutos", async () => {
  const id = await usuario();
  await operar(id,"registrar","912345680");
  for (const estado of ["incorrecto","incorrecto","bloqueo"]) {
    expect((await operar(id,"verificar","","","errado")).estado).toBe(estado);
  }
  const cuarto = await operar(id,"verificar");
  expect(cuarto.estado).toBe("bloqueo");
  expect(Date.parse(cuarto.hasta!)-Date.now()).toBeGreaterThan(899000);
  expect((await operar(id,"reenviar")).estado).toBe("bloqueo");
  await db.query("update public.codigos_registro set bloqueo=now(), enviado=now()-interval '15 minutes' where usuario=$1",[id]);
  expect((await operar(id,"reenviar")).estado).toBe("enviar");
});
test("el segundo registro con el mismo celular se rechaza", async () => {
  await operar(await usuario(),"registrar","912345681");
  expect((await operar(await usuario(),"registrar","912345681")).estado).toBe("duplicado");
});
test("el servidor rechaza distrito vacío o ajeno al catálogo", async () => {
  const id = await usuario();
  for (const d of [null,"","Cusco"]) expect((await operar(id,"registrar","912345682",d)).estado).toBe("invalido");
  expect((await operar(id,"estado")).estado).toBe("registro");
});
test("reemplazar un código conserva errores y el fallo de un envío viejo no anula el nuevo", async () => {
  const id = await usuario();
  await operar(id,"registrar","912345689");
  expect((await operar(id,"reenviar")).estado).toBe("espera");
  await operar(id,"verificar","","","errado");
  await db.query("update public.codigos_registro set enviado=now()-interval '61 seconds' where usuario=$1",[id]);
  await operar(id,"reenviar","","","nuevo");
  await operar(id,"cancelar","","","digest");
  expect((await operar(id,"verificar")).estado).toBe("incorrecto");
  expect((await operar(id,"verificar","","","nuevo")).estado).toBe("verificada");
});
test("RLS impide publicar desde una cuenta pendiente aunque se acceda directamente a Supabase", async () => {
  const id = await usuario();
  await operar(id,"registrar","912345687");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const insertar = () => db.query("insert into public.perdidas(dueno_id,categoria,descripcion,fecha,distrito) values($1,'celular','Celular negro de prueba',current_date,'Ayacucho')",[id]);
  await db.exec("set role authenticated");
  try {
    await expect(insertar()).rejects.toMatchObject({code:"42501"});
  } finally { await db.exec("reset role"); }
  await operar(id,"verificar");
  await db.exec("set role authenticated");
  try { await insertar(); } finally { await db.exec("reset role"); }
});
