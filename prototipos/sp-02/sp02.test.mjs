import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.mjs";
import { crearApi } from "./api-publica.mjs";
import { cargarSecreto, hmacDni, hmacFechaEmision, normalizarDni } from "./dni-hmac.mjs";
import { crearLimiteDeIntentos } from "./limite-de-intentos.mjs";
import { crearLimitador } from "./limitador.mjs";
import { crearPublicadorDeHallazgos } from "./publicar-hallazgo.mjs";
import { RASGOS_POR_CATEGORIA, validarRasgos } from "./rasgos.mjs";

const SECRETO = "secreto-de-prueba-".padEnd(40, "x");
const OTRO_SECRETO = "otro-secreto-de-prueba-".padEnd(40, "y");

test("HMAC: el mismo DNI con la misma clave da el mismo resultado", () => {
  assert.equal(hmacDni("12345678", SECRETO), hmacDni("12345678", SECRETO));
  assert.equal(hmacDni(" 12345678 ", SECRETO), hmacDni("12345678", SECRETO));
});

test("HMAC: DNI distinto o clave distinta dan resultados distintos", () => {
  assert.notEqual(hmacDni("12345678", SECRETO), hmacDni("12345679", SECRETO));
  assert.notEqual(hmacDni("12345678", SECRETO), hmacDni("12345678", OTRO_SECRETO));
});

test("HMAC: son 64 caracteres hexadecimales y no contienen el número", () => {
  const hmac = hmacDni("12345678", SECRETO);
  assert.match(hmac, /^[0-9a-f]{64}$/);
  assert.ok(!hmac.includes("12345678"));
});

test("HMAC: rechaza DNI inválidos", () => {
  for (const malo of ["1234567", "123456789", "abcdefgh", "1234-5678", "", null, undefined]) {
    assert.throws(() => normalizarDni(malo), RangeError, `debió rechazar ${malo}`);
  }
});

test("HMAC: sin clave o con clave corta el servidor no sigue", () => {
  assert.throws(() => cargarSecreto({}), /DNI_HMAC_SECRET/);
  assert.throws(() => cargarSecreto({ DNI_HMAC_SECRET: "corta" }), /DNI_HMAC_SECRET/);
  assert.equal(cargarSecreto({ DNI_HMAC_SECRET: SECRETO }), SECRETO);
});

test("HMAC: la fecha de emisión valida el formato", () => {
  assert.match(hmacFechaEmision("2019-05-20", SECRETO), /^[0-9a-f]{64}$/);
  assert.throws(() => hmacFechaEmision("20/05/2019", SECRETO), RangeError);
  assert.throws(() => hmacFechaEmision("2019-13-45", SECRETO), RangeError);
});

test("el HMAC de la fecha de emisión no coincide con el del DNI aunque el texto sea igual", () => {
  assert.notEqual(hmacFechaEmision("2019-05-20", SECRETO), hmacDni("20190520", SECRETO));
});

test("SHA-256 sin clave se recupera probando todos los DNI; el HMAC no", () => {
  const dni = "00123456";
  const sha256 = createHash("sha256").update(dni).digest("hex");
  const hmac = hmacDni(dni, SECRETO);

  const adivinar = (objetivo) => {
    for (let numero = 0; numero < 1_000_000; numero += 1) {
      const candidato = String(numero).padStart(8, "0");
      if (createHash("sha256").update(candidato).digest("hex") === objetivo) return candidato;
    }
    return null;
  };
  assert.equal(adivinar(sha256), dni);
  assert.equal(adivinar(hmac), null);
});

test("rasgos: se exigen al menos 2 de 3", () => {
  assert.equal(validarRasgos("celular", { fondo_pantalla: "perro", imei_ultimos_4: "4821" }).ok, true);
  assert.equal(validarRasgos("laptop", { serie: "SN1", calcomanias: "cohete", fondo_pantalla: "mar" }).ok, true);
  const unSolo = validarRasgos("cartera", { contenido: "un carné" });
  assert.equal(unSolo.ok, false);
  assert.match(unSolo.errores.join(" "), /faltan rasgos/);
});

test("rasgos: no cuentan los vacíos ni los de otra categoría", () => {
  assert.equal(validarRasgos("celular", { fondo_pantalla: "perro", imei_ultimos_4: "  " }).ok, false);
  assert.equal(validarRasgos("celular", { fondo_pantalla: "perro", serie: "SN1" }).ok, false);
  assert.equal(validarRasgos("moto", { x: "y" }).ok, false);
});

test("rasgos: el DNI tiene exactamente 2 rasgos mínimos, ambos protegidos", () => {
  assert.deepEqual(RASGOS_POR_CATEGORIA.dni, ["dni_hmac", "fecha_emision_hmac"]);
  assert.equal(validarRasgos("dni", { dni_hmac: "x", fecha_emision_hmac: "y" }).ok, true);
});

test("limitador: permite N intentos y luego bloquea hasta que pasa la ventana", () => {
  let instante = 0;
  const limitador = crearLimitador({ maximo: 3, ventanaMs: 1000, ahora: () => instante });
  assert.deepEqual([1, 2, 3].map(() => limitador.intentar("a").permitido), [true, true, true]);
  assert.equal(limitador.intentar("a").permitido, false);
  assert.equal(limitador.intentar("b").permitido, true);
  instante = 1000;
  assert.equal(limitador.intentar("a").permitido, true);
});

test("límite de intentos: avisa cuántos segundos faltan", () => {
  const limite = crearLimiteDeIntentos({ maxPorUsuario: 1, ventanaMs: 60_000 });
  limite.intentar({ usuario: "u", ip: "1.1.1.1" });
  const bloqueado = limite.intentar({ usuario: "u", ip: "1.1.1.1" });
  assert.equal(bloqueado.permitido, false);
  assert.ok(bloqueado.reintentarEnSegundos > 0 && bloqueado.reintentarEnSegundos <= 60);
});

function crearAlmacenDePrueba() {
  return crearAlmacenEnMemoria({
    perdidas: [
      { id: "p1", dueno: "u-rosa", categoria: "celular", distrito: "Ayacucho", fecha: "2026-11-20", estado: "activa", descripcion: "pantalla rayada" },
      { id: "p2", dueno: "u-luis", categoria: "dni", distrito: "Carmen Alto", fecha: "2026-11-21", estado: "activa", descripcion: "DNI de Luis" },
    ],
    rasgos: [
      { perdida_id: "p1", tipo: "fondo_pantalla", valor: "foto de un perro labrador" },
      { perdida_id: "p1", tipo: "imei_ultimos_4", valor: "4821" },
      { perdida_id: "p2", tipo: "dni_hmac", valor: hmacDni("12345678", SECRETO) },
      { perdida_id: "p2", tipo: "fecha_emision_hmac", valor: hmacFechaEmision("2019-05-20", SECRETO) },
    ],
    hallazgos: [
      {
        id: "h1", hallador: "u-luis", categoria: "celular", descripcion: "celular azul con funda roja", marca: "Samsung",
        latitud: -13.158, longitud: -74.224, distrito: "Ayacucho", dia: "2026-11-21", estado: "publicado", dni_hmac: null,
        foto_original_path: "luis/h1.jpg",
      },
    ],
  });
}

async function conApi(opcionesDeLimite, prueba) {
  const almacen = crearAlmacenDePrueba();
  const limiteDeIntentos = crearLimiteDeIntentos(opcionesDeLimite);
  const publicarHallazgo = crearPublicadorDeHallazgos({ almacen, limiteDeIntentos, secreto: SECRETO });
  const servidor = crearApi({ almacen, publicarHallazgo });

  await new Promise((listo) => servidor.listen(0, "127.0.0.1", listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    await prueba({ base, almacen });
  } finally {
    await new Promise((listo) => servidor.close(listo));
  }
}

const publicar = (base, cuerpo, usuario = "u-rosa") =>
  fetch(`${base}/api/hallazgos`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-usuario": usuario },
    body: JSON.stringify(cuerpo),
  });

const hallazgoDeDni = (dni) => ({ categoria: "dni", dni, distrito: "Ayacucho", dia: "2026-11-22" });

function clavesDe(valor, acumuladas = new Set()) {
  if (Array.isArray(valor)) valor.forEach((elemento) => clavesDe(elemento, acumuladas));
  else if (valor && typeof valor === "object") {
    for (const [clave, contenido] of Object.entries(valor)) {
      acumuladas.add(clave);
      clavesDe(contenido, acumuladas);
    }
  }
  return acumuladas;
}

const CLAVES_PROHIBIDAS = [
  "descripcion", "marca", "color", "latitud", "longitud", "hallador", "dueno", "dni", "dni_hmac",
  "foto_original_path", "foto_difuminada_path", "rasgos", "valor", "tipo", "fondo_pantalla", "imei_ultimos_4",
];

test("API: la lista de pérdidas no devuelve rasgos ocultos ni DNI", async () => {
  await conApi({}, async ({ base }) => {
    const respuesta = await fetch(`${base}/api/perdidas`);
    const texto = await respuesta.text();
    assert.equal(respuesta.status, 200);

    const claves = clavesDe(JSON.parse(texto));
    for (const prohibida of CLAVES_PROHIBIDAS) assert.ok(!claves.has(prohibida), `no debe aparecer la clave ${prohibida}`);
    for (const dato of ["perro", "4821", "12345678", "pantalla rayada", "Luis"]) assert.ok(!texto.includes(dato), `no debe aparecer "${dato}"`);
    assert.ok(!/[0-9a-f]{64}/.test(texto), "no debe aparecer ningún HMAC");
    assert.deepEqual([...claves].sort(), ["categoria", "distrito", "estado", "fecha", "id"]);
  });
});

test("API: el catálogo de hallazgos solo muestra categoría, distrito y día", async () => {
  await conApi({}, async ({ base }) => {
    for (const ruta of ["/api/hallazgos", "/api/hallazgos/h1"]) {
      const texto = await (await fetch(`${base}${ruta}`)).text();
      const claves = clavesDe(JSON.parse(texto));
      for (const prohibida of CLAVES_PROHIBIDAS) assert.ok(!claves.has(prohibida), `${ruta}: no debe aparecer ${prohibida}`);
      for (const dato of ["azul", "funda", "Samsung", "-13.158", "luis/h1.jpg"]) assert.ok(!texto.includes(dato), `${ruta}: no debe aparecer "${dato}"`);
      assert.deepEqual([...claves].sort(), ["categoria", "dia", "distrito", "estado", "id"]);
    }
  });
});

test("API: publicar un DNI responde igual con y sin coincidencia", async () => {
  await conApi({}, async ({ base, almacen }) => {
    const conCoincidencia = await publicar(base, hallazgoDeDni("12345678"));
    const sinCoincidencia = await publicar(base, hallazgoDeDni("87654321"));
    assert.equal(conCoincidencia.status, 201);
    assert.equal(sinCoincidencia.status, 201);

    const a = await conCoincidencia.json();
    const b = await sinCoincidencia.json();
    assert.deepEqual(Object.keys(a).sort(), ["estado", "id"]);
    assert.deepEqual(Object.keys(b).sort(), ["estado", "id"]);
    assert.equal(a.estado, b.estado);

    const alertas = almacen.listarAlertas();
    assert.equal(alertas.length, 1);
    assert.deepEqual(Object.keys(alertas[0]).sort(), ["categoria", "dia", "distrito", "para"]);
    assert.equal(alertas[0].para, "u-luis");
  });
});

test("API: el número de DNI no queda guardado en ningún registro", async () => {
  await conApi({}, async ({ base, almacen }) => {
    await publicar(base, hallazgoDeDni("12345678"));
    const guardado = JSON.stringify([almacen.listarHallazgos(), almacen.listarAlertas()]);
    assert.ok(!guardado.includes("12345678"));
    assert.ok(guardado.includes(hmacDni("12345678", SECRETO)));
  });
});

test("API: un DNI inválido da error genérico y no repite lo recibido", async () => {
  await conApi({}, async ({ base }) => {
    const invalido = await publicar(base, hallazgoDeDni("1234"));
    assert.equal(invalido.status, 400);
    assert.ok(!(await invalido.text()).includes("1234"));

    const malformado = await fetch(`${base}/api/hallazgos`, { method: "POST", headers: { "x-usuario": "u-rosa" }, body: "{no es json" });
    assert.equal(malformado.status, 400);

    const sinSesion = await fetch(`${base}/api/hallazgos`, { method: "POST", body: "{}" });
    assert.equal(sinSesion.status, 401);
  });
});

test("API: pide los datos obligatorios de cualquier hallazgo", async () => {
  await conApi({}, async ({ base }) => {
    const sinDistrito = await publicar(base, { categoria: "celular", dia: "2026-11-22" });
    assert.equal(sinDistrito.status, 400);
  });
});

test("API: una ruta o un método desconocido da 404", async () => {
  await conApi({}, async ({ base }) => {
    assert.equal((await fetch(`${base}/api/otra-cosa`)).status, 404);
    assert.equal((await fetch(`${base}/api/perdidas`, { method: "DELETE" })).status, 404);
    assert.equal((await fetch(`${base}/api/hallazgos/no-existe`)).status, 404);
  });
});

test("API: limita los intentos con DNI para que nadie pruebe uno por uno", async () => {
  await conApi({ maxPorUsuario: 5 }, async ({ base, almacen }) => {
    const estados = [];
    for (let i = 0; i < 7; i += 1) {
      const respuesta = await publicar(base, hallazgoDeDni(String(10000000 + i)));
      estados.push(respuesta.status);
      if (respuesta.status === 429) assert.ok(Number(respuesta.headers.get("retry-after")) > 0);
    }
    assert.deepEqual(estados, [201, 201, 201, 201, 201, 429, 429]);
    assert.equal(almacen.listarHallazgos().filter((hallazgo) => hallazgo.categoria === "dni").length, 5);

    const otraPersona = await publicar(base, hallazgoDeDni("10000099"), "u-otro");
    assert.equal(otraPersona.status, 201);
  });
});

test("API: el límite por IP frena a quien cambia de usuario", async () => {
  await conApi({ maxPorUsuario: 100, maxPorIp: 3 }, async ({ base }) => {
    const estados = [];
    for (let i = 0; i < 4; i += 1) {
      estados.push((await publicar(base, hallazgoDeDni(String(20000000 + i)), `u-${i}`)).status);
    }
    assert.deepEqual(estados, [201, 201, 201, 429]);
  });
});

test("API: una clave del servidor mal configurada no se confunde con un dato inválido", async () => {
  const almacen = crearAlmacenDePrueba();
  const publicarHallazgo = crearPublicadorDeHallazgos({ almacen, limiteDeIntentos: crearLimiteDeIntentos(), secreto: undefined });
  const servidor = crearApi({ almacen, publicarHallazgo });
  await new Promise((listo) => servidor.listen(0, "127.0.0.1", listo));
  try {
    const respuesta = await publicar(`http://127.0.0.1:${servidor.address().port}`, hallazgoDeDni("12345678"));
    assert.equal(respuesta.status, 500);
  } finally {
    await new Promise((listo) => servidor.close(listo));
  }
});
