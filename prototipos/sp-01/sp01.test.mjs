import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.mjs";
import { normalizarCelular } from "./celular.mjs";
import { generarCodigo, protegerCodigo } from "./codigo.mjs";
import { costoMensualEnSoles, costoPorUsuarioEnSoles, usuariosQueEntranEnElPresupuesto } from "./costos.mjs";
import { crearEnviadorEnMemoria } from "./enviador-en-memoria.mjs";
import { crearVerificador } from "./verificador.mjs";

const SECRETO = "secreto-de-prueba-".padEnd(40, "x");
const CELULAR = "987654321";
const MINUTO = 60_000;

let instante;
let almacen;
let enviador;
let verificador;

beforeEach(() => {
  instante = 0;
  almacen = crearAlmacenEnMemoria();
  enviador = crearEnviadorEnMemoria();
  verificador = crearVerificador({ almacen, enviador, reloj: { ahora: () => instante }, secreto: SECRETO });
});

const codigoIncorrecto = () => (enviador.ultimoCodigo() === "000000" ? "111111" : "000000");

test("celular: acepta 9 dígitos que empiezan con 9 y quita espacios y guiones", () => {
  assert.equal(normalizarCelular("987654321"), "987654321");
  assert.equal(normalizarCelular(" 987 654-321 "), "987654321");
});

test("celular: rechaza otros formatos", () => {
  for (const malo of ["87654321", "887654321", "9876543210", "98765432a", "", null, undefined]) {
    assert.equal(normalizarCelular(malo), null, `debió rechazar ${malo}`);
  }
});

test("código: son 6 dígitos, con ceros a la izquierda", () => {
  assert.equal(generarCodigo(() => 42), "000042");
  for (let i = 0; i < 200; i += 1) assert.match(generarCodigo(), /^\d{6}$/);
});

test("el código correcto dentro de 5 minutos verifica la cuenta", async () => {
  await verificador.solicitarCodigo(CELULAR);
  instante = 4 * MINUTO + 59_000;
  assert.deepEqual(await verificador.verificarCodigo(CELULAR, enviador.ultimoCodigo()), { ok: true });
});

test("el código correcto a los 6 minutos se rechaza", async () => {
  await verificador.solicitarCodigo(CELULAR);
  instante = 6 * MINUTO;
  const resultado = await verificador.verificarCodigo(CELULAR, enviador.ultimoCodigo());
  assert.deepEqual(resultado, { ok: false, motivo: "vencido" });
});

test("un código se puede usar una sola vez", async () => {
  await verificador.solicitarCodigo(CELULAR);
  const codigo = enviador.ultimoCodigo();
  assert.equal((await verificador.verificarCodigo(CELULAR, codigo)).ok, true);
  assert.equal((await verificador.verificarCodigo(CELULAR, codigo)).motivo, "vencido");
});

test("3 códigos errados bloquean 15 minutos y el cuarto, aunque sea correcto, se rechaza", async () => {
  await verificador.solicitarCodigo(CELULAR);
  const correcto = enviador.ultimoCodigo();

  const primero = await verificador.verificarCodigo(CELULAR, codigoIncorrecto());
  const segundo = await verificador.verificarCodigo(CELULAR, codigoIncorrecto());
  assert.deepEqual([primero.intentosRestantes, segundo.intentosRestantes], [2, 1]);

  const tercero = await verificador.verificarCodigo(CELULAR, codigoIncorrecto());
  assert.deepEqual(tercero, { ok: false, motivo: "bloqueado", minutosRestantes: 15 });

  instante = 10 * MINUTO;
  assert.deepEqual(await verificador.verificarCodigo(CELULAR, correcto), { ok: false, motivo: "bloqueado", minutosRestantes: 5 });
});

test("durante el bloqueo tampoco se puede pedir otro código", async () => {
  await verificador.solicitarCodigo(CELULAR);
  for (let i = 0; i < 3; i += 1) await verificador.verificarCodigo(CELULAR, codigoIncorrecto());

  const enviadosAntes = enviador.enviados.length;
  const resultado = await verificador.solicitarCodigo(CELULAR);
  assert.equal(resultado.motivo, "bloqueado");
  assert.equal(enviador.enviados.length, enviadosAntes);
});

test("pasados 15 minutos se puede pedir un código nuevo y los errores empiezan de cero", async () => {
  await verificador.solicitarCodigo(CELULAR);
  for (let i = 0; i < 3; i += 1) await verificador.verificarCodigo(CELULAR, codigoIncorrecto());

  instante = 15 * MINUTO;
  assert.equal((await verificador.solicitarCodigo(CELULAR)).ok, true);
  assert.equal((await verificador.verificarCodigo(CELULAR, codigoIncorrecto())).intentosRestantes, 2);
  assert.equal((await verificador.verificarCodigo(CELULAR, enviador.ultimoCodigo())).ok, true);
});

test("no se puede pedir otro código antes de 60 segundos y no se envía nada", async () => {
  await verificador.solicitarCodigo(CELULAR);
  instante = 59_000;
  const resultado = await verificador.solicitarCodigo(CELULAR);
  assert.deepEqual(resultado, { ok: false, motivo: "espera", segundosRestantes: 1 });
  assert.equal(enviador.enviados.length, 1);
});

test("pedir un código nuevo anula el anterior", async () => {
  await verificador.solicitarCodigo(CELULAR);
  const anterior = enviador.ultimoCodigo();
  instante = MINUTO;
  await verificador.solicitarCodigo(CELULAR);
  const nuevo = enviador.ultimoCodigo();

  if (anterior !== nuevo) assert.equal((await verificador.verificarCodigo(CELULAR, anterior)).ok, false);
  assert.equal((await verificador.verificarCodigo(CELULAR, nuevo)).ok, true);
});

test("el código nunca se guarda en claro", async () => {
  await verificador.solicitarCodigo(CELULAR);
  const guardado = JSON.stringify(almacen.verTodo());
  assert.ok(!guardado.includes(enviador.ultimoCodigo()));
  assert.match(almacen.verTodo()[0].codigoProtegido, /^[0-9a-f]{64}$/);
});

test("el mismo código protegido es distinto para otro celular y para otra clave", () => {
  const base = { codigo: "123456", celular: CELULAR, secreto: SECRETO };
  assert.notEqual(protegerCodigo(base), protegerCodigo({ ...base, celular: "912345678" }));
  assert.notEqual(protegerCodigo(base), protegerCodigo({ ...base, secreto: "otra-".padEnd(40, "z") }));
});

test("un celular al que no se pidió código recibe la misma respuesta que uno vencido", async () => {
  assert.deepEqual(await verificador.verificarCodigo("911111111", "123456"), { ok: false, motivo: "vencido" });
});

test("un celular inválido no envía nada", async () => {
  assert.deepEqual(await verificador.solicitarCodigo("12345"), { ok: false, motivo: "celular_invalido" });
  assert.equal(enviador.enviados.length, 0);
});

test("si el envío falla, no queda un código guardado y el error se avisa", async () => {
  const fallido = crearVerificador({
    almacen,
    enviador: { enviar: async () => { throw new Error("proveedor caído"); } },
    reloj: { ahora: () => instante },
    secreto: SECRETO,
  });
  await assert.rejects(fallido.solicitarCodigo(CELULAR), /proveedor caído/);
  assert.equal(almacen.verTodo().length, 0);
});

test("costos: el SMS cuesta unas 8 veces más que WhatsApp y el correo no cuesta", () => {
  const sms = costoPorUsuarioEnSoles("sms");
  const whatsapp = costoPorUsuarioEnSoles("whatsapp");
  assert.ok(sms / whatsapp > 7 && sms / whatsapp < 9);
  assert.equal(costoPorUsuarioEnSoles("correo"), 0);
});

test("costos: cuántos usuarios entran en S/ 150 y cuánto cuesta un mes", () => {
  assert.equal(usuariosQueEntranEnElPresupuesto("sms"), 135);
  assert.equal(usuariosQueEntranEnElPresupuesto("whatsapp"), 1114);
  assert.equal(usuariosQueEntranEnElPresupuesto("correo"), Infinity);
  assert.ok(Math.abs(costoMensualEnSoles("whatsapp", 500) - 500 * 0.03 * 1.3 * 3.45) < 1e-9);
});
