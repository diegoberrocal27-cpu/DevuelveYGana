import { createServer } from "node:http";
import { vistaPublicaDeHallazgo, vistaPublicaDePerdida } from "./vistas-publicas.mjs";

const TAMANO_MAXIMO_CUERPO = 10_000;
const NO_ENCONTRADO = { estado: 404, cuerpo: { error: "no encontrado" } };

async function leerJson(peticion) {
  let texto = "";
  for await (const parte of peticion) {
    texto += parte;
    if (texto.length > TAMANO_MAXIMO_CUERPO) throw new Error("cuerpo demasiado grande");
  }
  return texto ? JSON.parse(texto) : {};
}

function crearRutas({ almacen, publicarHallazgo }) {
  return [
    {
      metodo: "GET",
      patron: /^\/api\/perdidas$/,
      atender: () => ({ estado: 200, cuerpo: almacen.listarPerdidas().map(vistaPublicaDePerdida) }),
    },
    {
      metodo: "GET",
      patron: /^\/api\/hallazgos$/,
      atender: () => ({ estado: 200, cuerpo: almacen.listarHallazgos().map(vistaPublicaDeHallazgo) }),
    },
    {
      metodo: "GET",
      patron: /^\/api\/hallazgos\/([^/]+)$/,
      atender: ({ coincidencia }) => {
        const hallazgo = almacen.buscarHallazgo(coincidencia[1]);
        return hallazgo ? { estado: 200, cuerpo: vistaPublicaDeHallazgo(hallazgo) } : NO_ENCONTRADO;
      },
    },
    {
      metodo: "POST",
      patron: /^\/api\/hallazgos$/,
      atender: async ({ peticion }) => {
        let datos;
        try {
          datos = await leerJson(peticion);
        } catch {
          return { estado: 400, cuerpo: { error: "datos inválidos" } };
        }
        return publicarHallazgo({
          usuario: peticion.headers["x-usuario"],
          ip: peticion.socket.remoteAddress,
          datos,
        });
      },
    },
  ];
}

export function crearApi(dependencias) {
  const rutas = crearRutas(dependencias);

  return createServer(async (peticion, respuesta) => {
    let resultado = NO_ENCONTRADO;
    try {
      const { pathname } = new URL(peticion.url, "http://local");
      for (const ruta of rutas) {
        const coincidencia = ruta.metodo === peticion.method && pathname.match(ruta.patron);
        if (coincidencia) {
          resultado = await ruta.atender({ peticion, coincidencia });
          break;
        }
      }
    } catch {
      resultado = { estado: 500, cuerpo: { error: "error interno" } };
    }
    respuesta.writeHead(resultado.estado, { "content-type": "application/json", ...resultado.cabeceras });
    respuesta.end(JSON.stringify(resultado.cuerpo));
  });
}
