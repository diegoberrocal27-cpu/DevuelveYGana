// SP-02 · API pública mínima (prototipo con datos en memoria) para comprobar tres cosas:
//   1) Las listas públicas devuelven SOLO una lista blanca de campos (nunca rasgos ni DNI).
//   2) Publicar un hallazgo de DNI responde igual haya o no coincidencia: así no se puede usar
//      la API como "oráculo" para averiguar qué DNI están registrados como perdidos.
//   3) Los intentos con DNI están limitados por usuario y por IP.
// En el proyecto real esto serán rutas de Next.js que consultan Supabase con service_role.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { hmacDni } from './dni-hmac.mjs';
import { crearLimitador } from './limitador.mjs';

// Lista blanca: lo único que sale al público (HU-03: categoría, distrito y día).
const PUBLICO_HALLAZGO = ['id', 'categoria', 'distrito', 'dia', 'estado'];
const PUBLICO_PERDIDA = ['id', 'categoria', 'distrito', 'fecha', 'estado'];
const recortar = (obj, campos) => Object.fromEntries(campos.map((c) => [c, obj[c]]));

function responder(res, estado, cuerpo, cabeceras = {}) {
  res.writeHead(estado, { 'content-type': 'application/json', ...cabeceras });
  res.end(JSON.stringify(cuerpo));
}

async function leerJson(req) {
  let texto = '';
  for await (const parte of req) {
    texto += parte;
    if (texto.length > 10_000) throw new Error('cuerpo demasiado grande');
  }
  return texto ? JSON.parse(texto) : {};
}

/**
 * store: { perdidas: [], rasgos: [], hallazgos: [], alertas: [] }
 * Valores iniciales de los límites (a calibrar): 5 intentos con DNI por hora y usuario, 20 por hora y IP.
 */
export function crearApi({ store, secreto, maxPorUsuario = 5, maxPorIp = 20, ventanaMs = 3_600_000 } = {}) {
  const porUsuario = crearLimitador({ maximo: maxPorUsuario, ventanaMs });
  const porIp = crearLimitador({ maximo: maxPorIp, ventanaMs });

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://local');

      if (req.method === 'GET' && url.pathname === '/api/perdidas') {
        return responder(res, 200, store.perdidas.map((p) => recortar(p, PUBLICO_PERDIDA)));
      }
      if (req.method === 'GET' && url.pathname === '/api/hallazgos') {
        return responder(res, 200, store.hallazgos.map((h) => recortar(h, PUBLICO_HALLAZGO)));
      }
      const m = url.pathname.match(/^\/api\/hallazgos\/([^/]+)$/);
      if (req.method === 'GET' && m) {
        const h = store.hallazgos.find((x) => x.id === m[1]);
        return h ? responder(res, 200, recortar(h, PUBLICO_HALLAZGO)) : responder(res, 404, { error: 'no encontrado' });
      }

      if (req.method === 'POST' && url.pathname === '/api/hallazgos') {
        const usuario = req.headers['x-usuario'];
        if (!usuario) return responder(res, 401, { error: 'requiere sesión' });

        let datos;
        try { datos = await leerJson(req); } catch { return responder(res, 400, { error: 'datos inválidos' }); }

        const esDni = datos.categoria === 'dni';
        if (esDni) {
          // Cada intento cuenta, sea válido o no.
          const u = porUsuario.intentar(`u:${usuario}`);
          const i = porIp.intentar(`ip:${req.socket.remoteAddress}`);
          if (!u.permitido || !i.permitido) {
            const seg = Math.ceil(Math.max(u.reintentarEnMs, i.reintentarEnMs) / 1000);
            return responder(res, 429, { error: 'demasiados intentos' }, { 'retry-after': String(seg) });
          }
        }

        let dniHmac = null;
        if (esDni) {
          try { dniHmac = hmacDni(datos.dni, secreto); }
          catch { return responder(res, 400, { error: 'datos inválidos' }); } // sin repetir el DNI recibido
        }
        if (!datos.categoria || !datos.distrito || !datos.dia) {
          return responder(res, 400, { error: 'datos inválidos' });
        }

        const hallazgo = {
          id: randomUUID(), hallador: usuario, categoria: datos.categoria, descripcion: datos.descripcion ?? '',
          distrito: datos.distrito, dia: datos.dia, estado: 'publicado', dni_hmac: dniHmac,
        };
        store.hallazgos.push(hallazgo);

        // Emparejamiento directo por HMAC. El resultado NO sale en la respuesta: solo genera una
        // alerta interna para el dueño (HU-04: la alerta lleva categoría, distrito y día, nada más).
        if (dniHmac) {
          for (const r of store.rasgos.filter((x) => x.tipo === 'dni_hmac' && x.valor === dniHmac)) {
            const p = store.perdidas.find((x) => x.id === r.perdida_id);
            if (p) store.alertas.push({ para: p.dueno, categoria: 'dni', distrito: hallazgo.distrito, dia: hallazgo.dia });
          }
        }
        return responder(res, 201, { id: hallazgo.id, estado: 'publicado' }); // misma forma con o sin coincidencia
      }

      return responder(res, 404, { error: 'no encontrado' });
    } catch {
      return responder(res, 500, { error: 'error interno' }); // nunca devolver detalles ni datos
    }
  });
}
