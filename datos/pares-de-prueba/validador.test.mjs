import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crearVecindad, validarPares } from "./validador.mjs";

function leerJson(nombre) {
  return JSON.parse(readFileSync(new URL(nombre, import.meta.url), "utf8"));
}

const paresOriginales = leerJson("pares.json");
const sonVecinos = crearVecindad(leerJson("distritos.json").vecinos);

function copiaDeLosPares() {
  return structuredClone(paresOriginales);
}

function buscar(pares, id) {
  return pares.find((par) => par.id === id);
}

function erroresDe(pares) {
  return validarPares(pares, sonVecinos);
}

function assertHayError(errores, fragmento) {
  assert.ok(
    errores.some((error) => error.includes(fragmento)),
    `se esperaba un error con "${fragmento}" y salió: ${JSON.stringify(errores)}`,
  );
}

test("los 30 pares del repositorio no tienen errores", () => {
  assert.deepEqual(erroresDe(copiaDeLosPares()), []);
});

test("hay 15 correctos, 15 incorrectos y las 4 categorías con ambas etiquetas", () => {
  const contar = (etiqueta) => paresOriginales.filter((par) => par.etiqueta === etiqueta).length;
  assert.equal(contar("correcto"), 15);
  assert.equal(contar("incorrecto"), 15);
  const categorias = new Set(paresOriginales.map((par) => par.categoria));
  assert.deepEqual([...categorias].sort(), ["cartera", "celular", "dni", "laptop"]);
});

test("hay al menos 2 pares de cartera sin marca", () => {
  const sinMarca = paresOriginales.filter(
    (par) => par.categoria === "cartera" && (par.perdida.marca === null || par.hallazgo.marca === null),
  );
  assert.ok(sinMarca.length >= 2);
});

test("falla si falta un par", () => {
  const pares = copiaDeLosPares().slice(1);
  assertHayError(erroresDe(pares), "se esperaban 30 pares");
});

test("falla si un id está repetido", () => {
  const pares = copiaDeLosPares();
  pares[1].id = pares[0].id;
  assertHayError(erroresDe(pares), "está repetido");
});

test("falla si la etiqueta no es correcto ni incorrecto", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").etiqueta = "quizás";
  assertHayError(erroresDe(pares), "la etiqueta debe ser");
});

test("falla si la categoría no existe", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").categoria = "tablet";
  assertHayError(erroresDe(pares), "la categoría no es válida");
});

test("falla si la fecha no existe en el calendario", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").perdida.fecha = "2026-02-30";
  assertHayError(erroresDe(pares), "la fecha no es válida");
});

test("falla si el hallazgo es anterior a la pérdida", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").hallazgo.fecha = "2026-11-01";
  assertHayError(erroresDe(pares), "fecha anterior a la pérdida");
});

test("falla si una descripción tiene un número largo", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "dni-01").perdida.descripcion = "Perdí mi DNI número 45678912 en la fila de un banco.";
  assertHayError(erroresDe(pares), "dato personal");
});

test("falla si una descripción tiene un correo", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").hallazgo.descripcion = "Celular encontrado, escribir a alguien@correo.com para recogerlo.";
  assertHayError(erroresDe(pares), "dato personal");
});

test("falla si un correcto tiene otro color", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").hallazgo.color = "blanco";
  assertHayError(erroresDe(pares), "celular-01: está marcado correcto pero difiere en color");
});

test("falla si un correcto tiene otra marca declarada", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "laptop-01").hallazgo.marca = "Dell";
  assertHayError(erroresDe(pares), "laptop-01: está marcado correcto pero difiere en marca");
});

test("falla si un correcto tiene distritos que no son vecinos", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").hallazgo.distrito = "Huanta";
  assertHayError(erroresDe(pares), "celular-01: está marcado correcto pero difiere en distrito");
});

test("falla si un correcto pasa de 2 días entre pérdida y hallazgo", () => {
  const pares = copiaDeLosPares();
  buscar(pares, "celular-01").hallazgo.fecha = "2026-11-06";
  assertHayError(erroresDe(pares), "pasan 3 días");
});

test("un correcto puede tener marca en un lado y vacía en el otro", () => {
  const par = buscar(copiaDeLosPares(), "cartera-04");
  assert.equal(par.perdida.marca, "Vizzano");
  assert.equal(par.hallazgo.marca, null);
  assert.deepEqual(erroresDe(copiaDeLosPares()), []);
});

test("falla si un incorrecto no difiere en nada", () => {
  const pares = copiaDeLosPares();
  const par = buscar(pares, "celular-05");
  par.hallazgo.color = par.perdida.color;
  assertHayError(erroresDe(pares), "celular-05: está marcado incorrecto pero no difiere");
});

test("un incorrecto sin marca en un lado no cuenta la marca como diferencia", () => {
  const pares = copiaDeLosPares();
  const par = buscar(pares, "cartera-05");
  par.hallazgo.color = par.perdida.color;
  assertHayError(erroresDe(pares), "cartera-05: está marcado incorrecto pero no difiere");
});

test("falla si no quedan carteras sin marca", () => {
  const pares = copiaDeLosPares();
  for (const par of pares.filter((p) => p.categoria === "cartera")) {
    par.perdida.marca ??= "Vizzano";
    par.hallazgo.marca ??= par.perdida.marca;
  }
  assertHayError(erroresDe(pares), "pares de cartera sin marca");
});

test("falla si una categoría pierde sus pares incorrectos", () => {
  const pares = copiaDeLosPares().filter((par) => !(par.categoria === "dni" && par.etiqueta === "incorrecto"));
  assertHayError(erroresDe(pares), "no hay ningún par incorrecto de dni");
});

test("crearVecindad reconoce el mismo distrito y los vecinos en cualquier orden", () => {
  const vecindad = crearVecindad([["Ayacucho", "Carmen Alto"]]);
  assert.equal(vecindad("Ayacucho", "Ayacucho"), true);
  assert.equal(vecindad("Carmen Alto", "Ayacucho"), true);
  assert.equal(vecindad("Ayacucho", "Huanta"), false);
});
