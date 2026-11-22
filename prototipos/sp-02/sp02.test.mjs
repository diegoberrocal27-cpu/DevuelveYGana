// Pruebas del spike SP-02. Correr con:  node --test prototipos/sp-02/sp02.test.mjs
// (Node 20 o superior; no necesita instalar nada.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hmacDni, hmacFechaEmision, normalizarDni, cargarSecreto } from './dni-hmac.mjs';
import { validarRasgos, RASGOS_POR_CATEGORIA } from './rasgos.mjs';
import { crearLimitador } from './limitador.mjs';
import { crearApi } from './api-publica.mjs';

const SECRETO = 'secreto-de-prueba-'.padEnd(40, 'x');
const OTRO_SECRETO = 'otro-secreto-de-prueba-'.padEnd(40, 'y');

// ---------------------------------------------------------------- HMAC del DNI
test('HMAC: el mismo DNI con la misma clave da el mismo resultado (sirve para emparejar)', () => {
  assert.equal(hmacDni('12345678', SECRETO), hmacDni('12345678', SECRETO));
  assert.equal(hmacDni(' 12345678 ', SECRETO), hmacDni('12345678', SECRETO)); // espacios no cambian el resultado
});

test('HMAC: DNI distinto o clave distinta dan resultados distintos', () => {
  assert.notEqual(hmacDni('12345678', SECRETO), hmacDni('12345679', SECRETO));
  assert.notEqual(hmacDni('12345678', SECRETO), hmacDni('12345678', OTRO_SECRETO));
});

test('HMAC: son 64 caracteres hexadecimales y no contienen el número', () => {
  const h = hmacDni('12345678', SECRETO);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.ok(!h.includes('12345678'));
});

test('HMAC: rechaza DNI inválidos', () => {
  for (const malo of ['1234567', '123456789', 'abcdefgh', '1234-5678', '', null, undefined]) {
    assert.throws(() => normalizarDni(malo), RangeError, `debió rechazar ${malo}`);
  }
});

test('HMAC: sin clave o con clave corta el servidor no sigue', () => {
  assert.throws(() => cargarSecreto({}), /DNI_HMAC_SECRET/);
  assert.throws(() => cargarSecreto({ DNI_HMAC_SECRET: 'corta' }), /DNI_HMAC_SECRET/);
  assert.equal(cargarSecreto({ DNI_HMAC_SECRET: SECRETO }), SECRETO);
});

test('HMAC: la fecha de emisión usa otro dominio y valida el formato', () => {
  assert.match(hmacFechaEmision('2019-05-20', SECRETO), /^[0-9a-f]{64}$/);
  assert.throws(() => hmacFechaEmision('20/05/2019', SECRETO), RangeError);
  assert.throws(() => hmacFechaEmision('2019-13-45', SECRETO), RangeError);
});

test('Por qué no un hash simple: SHA-256 sin clave se recupera probando; el HMAC no', () => {
  const dni = '00123456'; // dentro de los primeros 1 000 000 para que la prueba sea rápida
  const sha = createHash('sha256').update(dni).digest('hex');
  const hm = hmacDni(dni, SECRETO);

  const adivinar = (objetivo) => {
    for (let n = 0; n < 1_000_000; n += 1) {
      const candidato = String(n).padStart(8, '0');
      if (createHash('sha256').update(candidato).digest('hex') === objetivo) return candidato;
    }
    return null;
  };
  assert.equal(adivinar(sha), dni, 'con SHA-256 simple el atacante recupera el DNI');
  assert.equal(adivinar(hm), null, 'con HMAC (clave secreta) no lo recupera');
});

// ---------------------------------------------------------------- Rasgos por categoría
test('Rasgos: se exigen al menos 2 de 3', () => {
  assert.equal(validarRasgos('celular', { fondo_pantalla: 'perro', imei_ultimos_4: '4821' }).ok, true);
  assert.equal(validarRasgos('laptop', { serie: 'SN1', calcomanias: 'cohete', fondo_pantalla: 'mar' }).ok, true);
  const uno = validarRasgos('cartera', { contenido: 'un carné' });
  assert.equal(uno.ok, false);
  assert.match(uno.errores.join(' '), /faltan rasgos/);
});

test('Rasgos: no cuentan los vacíos ni los de otra categoría', () => {
  assert.equal(validarRasgos('celular', { fondo_pantalla: 'perro', imei_ultimos_4: '  ' }).ok, false);
  assert.equal(validarRasgos('celular', { fondo_pantalla: 'perro', serie: 'SN1' }).ok, false);
  assert.equal(validarRasgos('moto', { x: 'y' }).ok, false);
});

test('Rasgos: el DNI tiene exactamente 2 rasgos mínimos, ambos protegidos', () => {
  assert.deepEqual(RASGOS_POR_CATEGORIA.dni, ['dni_hmac', 'fecha_emision_hmac']);
  assert.equal(validarRasgos('dni', { dni_hmac: 'x', fecha_emision_hmac: 'y' }).ok, true);
});

// ---------------------------------------------------------------- Limitador
test('Limitador: permite N intentos y luego bloquea hasta que pasa la ventana', () => {
  let t = 0;
  const l = crearLimitador({ maximo: 3, ventanaMs: 1000, ahora: () => t });
  assert.deepEqual([1, 2, 3].map(() => l.intentar('a').permitido), [true, true, true]);
  assert.equal(l.intentar('a').permitido, false);
  assert.equal(l.intentar('b').permitido, true, 'otra clave no se ve afectada');
  t = 1000;
  assert.equal(l.intentar('a').permitido, true, 'la ventana se reinicia');
});

// ---------------------------------------------------------------- API pública
const HEX64 = /[0-9a-f]{64}/;

function nuevoStore() {
  const ID_ROSA = 'u-rosa';
  const ID_LUIS = 'u-luis';
  return {
    perdidas: [
      { id: 'p1', dueno: ID_ROSA, categoria: 'celular', distrito: 'Ayacucho', fecha: '2026-11-20', estado: 'activa', descripcion: 'pantalla rayada' },
      { id: 'p2', dueno: ID_LUIS, categoria: 'dni', distrito: 'Carmen Alto', fecha: '2026-11-21', estado: 'activa', descripcion: 'DNI de Luis' },
    ],
    rasgos: [
      { perdida_id: 'p1', tipo: 'fondo_pantalla', valor: 'foto de un perro labrador' },
      { perdida_id: 'p1', tipo: 'imei_ultimos_4', valor: '4821' },
      { perdida_id: 'p2', tipo: 'dni_hmac', valor: hmacDni('12345678', SECRETO) },
      { perdida_id: 'p2', tipo: 'fecha_emision_hmac', valor: hmacFechaEmision('2019-05-20', SECRETO) },
    ],
    hallazgos: [
      { id: 'h1', hallador: ID_LUIS, categoria: 'celular', descripcion: 'celular azul con funda roja', marca: 'Samsung',
        latitud: -13.158, longitud: -74.224, distrito: 'Ayacucho', dia: '2026-11-21', estado: 'publicado', dni_hmac: null,
        foto_original_path: 'luis/h1.jpg' },
    ],
    alertas: [],
  };
}

async function conApi(opciones, fn) {
  const store = nuevoStore();
  const servidor = crearApi({ store, secreto: SECRETO, ...opciones });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try { await fn({ base, store }); } finally { await new Promise((ok) => servidor.close(ok)); }
}

const publicar = (base, cuerpo, usuario = 'u-rosa') =>
  fetch(`${base}/api/hallazgos`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-usuario': usuario }, body: JSON.stringify(cuerpo),
  });

// Busca recursivamente cualquier clave prohibida.
function clavesDe(valor, acumulado = new Set()) {
  if (Array.isArray(valor)) valor.forEach((v) => clavesDe(v, acumulado));
  else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) { acumulado.add(k); clavesDe(v, acumulado); }
  }
  return acumulado;
}
const PROHIBIDAS = ['descripcion', 'marca', 'color', 'latitud', 'longitud', 'hallador', 'dueno', 'dni', 'dni_hmac',
  'foto_original_path', 'foto_difuminada_path', 'rasgos', 'valor', 'tipo', 'fondo_pantalla', 'imei_ultimos_4'];

test('API pública: la lista de pérdidas no devuelve rasgos ocultos ni DNI', async () => {
  await conApi({}, async ({ base }) => {
    const r = await fetch(`${base}/api/perdidas`); // sin sesión
    const texto = await r.text();
    assert.equal(r.status, 200);
    const claves = clavesDe(JSON.parse(texto));
    for (const prohibida of PROHIBIDAS) assert.ok(!claves.has(prohibida), `no debe aparecer la clave ${prohibida}`);
    for (const secreto of ['perro', '4821', '12345678', 'pantalla rayada', 'Luis']) assert.ok(!texto.includes(secreto), `no debe aparecer "${secreto}"`);
    assert.ok(!HEX64.test(texto), 'no debe aparecer ningún HMAC');
    assert.deepEqual([...claves].sort(), ['categoria', 'distrito', 'estado', 'fecha', 'id']);
  });
});

test('API pública: el catálogo de hallazgos solo muestra categoría, distrito y día', async () => {
  await conApi({}, async ({ base }) => {
    for (const ruta of ['/api/hallazgos', '/api/hallazgos/h1']) {
      const texto = await (await fetch(`${base}${ruta}`)).text();
      const claves = clavesDe(JSON.parse(texto));
      for (const prohibida of PROHIBIDAS) assert.ok(!claves.has(prohibida), `${ruta}: no debe aparecer ${prohibida}`);
      for (const secreto of ['azul', 'funda', 'Samsung', '-13.158', 'luis/h1.jpg']) assert.ok(!texto.includes(secreto), `${ruta}: no debe aparecer "${secreto}"`);
      assert.deepEqual([...claves].sort(), ['categoria', 'dia', 'distrito', 'estado', 'id']);
    }
  });
});

test('API pública: publicar un DNI responde igual con y sin coincidencia (sin "oráculo")', async () => {
  await conApi({}, async ({ base, store }) => {
    const conCoincidencia = await publicar(base, { categoria: 'dni', dni: '12345678', distrito: 'Ayacucho', dia: '2026-11-22' });
    const sinCoincidencia = await publicar(base, { categoria: 'dni', dni: '87654321', distrito: 'Ayacucho', dia: '2026-11-22' });
    assert.equal(conCoincidencia.status, 201);
    assert.equal(sinCoincidencia.status, 201);
    const a = await conCoincidencia.json();
    const b = await sinCoincidencia.json();
    assert.deepEqual(Object.keys(a).sort(), ['estado', 'id']);
    assert.deepEqual(Object.keys(b).sort(), ['estado', 'id']);
    assert.equal(a.estado, b.estado);
    // La coincidencia solo se nota en la alerta interna, y esa alerta no lleva datos del hallador ni el DNI.
    assert.equal(store.alertas.length, 1);
    assert.deepEqual(Object.keys(store.alertas[0]).sort(), ['categoria', 'dia', 'distrito', 'para']);
    assert.equal(store.alertas[0].para, 'u-luis');
  });
});

test('API pública: un DNI inválido da error genérico y no repite lo recibido', async () => {
  await conApi({}, async ({ base }) => {
    const r = await publicar(base, { categoria: 'dni', dni: '1234', distrito: 'Ayacucho', dia: '2026-11-22' });
    const texto = await r.text();
    assert.equal(r.status, 400);
    assert.ok(!texto.includes('1234'));
    const malformado = await fetch(`${base}/api/hallazgos`, { method: 'POST', headers: { 'x-usuario': 'u-rosa' }, body: '{no es json' });
    assert.equal(malformado.status, 400);
    const sinSesion = await fetch(`${base}/api/hallazgos`, { method: 'POST', body: '{}' });
    assert.equal(sinSesion.status, 401);
  });
});

test('API pública: limita los intentos con DNI para que nadie pruebe uno por uno', async () => {
  await conApi({ maxPorUsuario: 5 }, async ({ base, store }) => {
    const estados = [];
    for (let i = 0; i < 7; i += 1) {
      const r = await publicar(base, { categoria: 'dni', dni: String(10000000 + i), distrito: 'Ayacucho', dia: '2026-11-22' });
      estados.push(r.status);
      if (r.status === 429) assert.ok(Number(r.headers.get('retry-after')) > 0);
    }
    assert.deepEqual(estados, [201, 201, 201, 201, 201, 429, 429]);
    assert.equal(store.hallazgos.filter((h) => h.categoria === 'dni').length, 5, 'los intentos bloqueados no se guardan');
    const otroUsuario = await publicar(base, { categoria: 'dni', dni: '10000099', distrito: 'Ayacucho', dia: '2026-11-22' }, 'u-otro');
    assert.equal(otroUsuario.status, 201, 'el límite por usuario no bloquea a otra persona');
  });
});

test('API pública: el límite por IP frena a quien cambia de usuario', async () => {
  await conApi({ maxPorUsuario: 100, maxPorIp: 3 }, async ({ base }) => {
    const estados = [];
    for (let i = 0; i < 4; i += 1) {
      estados.push((await publicar(base, { categoria: 'dni', dni: String(20000000 + i), distrito: 'Ayacucho', dia: '2026-11-22' }, `u-${i}`)).status);
    }
    assert.deepEqual(estados, [201, 201, 201, 429]);
  });
});
