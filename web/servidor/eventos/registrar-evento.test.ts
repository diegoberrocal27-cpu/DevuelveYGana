import { describe, expect, test } from "vitest";
import { ACCIONES_DE_EVENTO, type AccionDeEvento } from "./acciones";
import type { AlmacenDeEventos } from "./almacen-de-eventos";
import { crearAlmacenSupabase, type ClienteQueInserta } from "./almacen-supabase";
import type { Evento } from "./evento";
import { crearRegistrarEvento } from "./registrar-evento";

const USUARIO = "3f2b8c1e-5a47-4d6b-9e0a-1c2d3e4f5a6b";

function armarEntorno(almacenQueFalla = false) {
  const guardados: Evento[] = [];
  const anotados: string[] = [];
  const almacen: AlmacenDeEventos = {
    async guardar(evento) {
      if (almacenQueFalla) throw new Error("la base de datos no responde");
      guardados.push(evento);
    },
  };
  const registrarEvento = crearRegistrarEvento({
    almacen,
    anotarError: (mensaje, causa) => anotados.push(`${mensaje}: ${(causa as Error).message}`),
  });
  return { registrarEvento, guardados, anotados };
}

describe("registrarEvento", () => {
  test.each(ACCIONES_DE_EVENTO)("guarda la acción %s con usuario y distrito", async (accion) => {
    const { registrarEvento, guardados, anotados } = armarEntorno();

    await registrarEvento(accion, USUARIO, "Ayacucho");

    expect(guardados).toEqual([{ accion, usuarioId: USUARIO, distrito: "Ayacucho" }]);
    expect(anotados).toEqual([]);
  });

  test("acepta un evento sin usuario ni distrito", async () => {
    const { registrarEvento, guardados } = armarEntorno();

    await registrarEvento("registro", null, null);

    expect(guardados).toEqual([{ accion: "registro", usuarioId: null, distrito: null }]);
  });

  test("quita los espacios del distrito y guarda null si queda vacío", async () => {
    const { registrarEvento, guardados } = armarEntorno();

    await registrarEvento("registro", USUARIO, "  Carmen Alto ");
    await registrarEvento("registro", USUARIO, "   ");

    expect(guardados.map((evento) => evento.distrito)).toEqual(["Carmen Alto", null]);
  });

  test("el evento guardado solo tiene acción, usuario y distrito", async () => {
    const { registrarEvento, guardados } = armarEntorno();

    await registrarEvento("perdida_publicada", USUARIO, "San Juan Bautista");

    expect(Object.keys(guardados[0]).sort()).toEqual(["accion", "distrito", "usuarioId"]);
  });

  test("si el almacén falla, no lanza error y lo anota sin datos del usuario", async () => {
    const { registrarEvento, anotados } = armarEntorno(true);

    await expect(registrarEvento("registro", USUARIO, "Ayacucho")).resolves.toBeUndefined();

    expect(anotados).toEqual([
      "No se pudo registrar el evento registro: la base de datos no responde",
    ]);
    expect(anotados.join(" ")).not.toContain(USUARIO);
    expect(anotados.join(" ")).not.toContain("Ayacucho");
  });
});

describe("registrarEvento no guarda datos sensibles", () => {
  const casosSensibles: [string, string | null, string | null][] = [
    ["un DNI en el distrito", USUARIO, "45678912"],
    ["un DNI dentro de un texto en el distrito", USUARIO, "Ayacucho 45678912"],
    ["un correo en el distrito", USUARIO, "alguien@correo.com"],
    ["un texto largo (rasgos o foto) en el distrito", USUARIO, "a".repeat(200)],
    ["un DNI en lugar del identificador de usuario", "45678912", "Ayacucho"],
    ["un nombre en lugar del identificador de usuario", "Juan Pérez", "Ayacucho"],
  ];

  test.each(casosSensibles)("descarta el evento con %s", async (_caso, usuario, distrito) => {
    const { registrarEvento, guardados, anotados } = armarEntorno();

    await registrarEvento("hallazgo_publicado", usuario, distrito);

    expect(guardados).toEqual([]);
    expect(anotados).toHaveLength(1);
    expect(anotados[0]).toMatch(/^Evento descartado/);
  });

  test("el aviso del descarte no repite el dato sensible", async () => {
    const { registrarEvento, anotados } = armarEntorno();

    await registrarEvento("registro", USUARIO, "45678912");

    expect(anotados.join(" ")).not.toContain("45678912");
  });

  test("descarta una acción que no está en la lista", async () => {
    const { registrarEvento, guardados, anotados } = armarEntorno();

    await registrarEvento("dni_consultado" as AccionDeEvento, USUARIO, "Ayacucho");

    expect(guardados).toEqual([]);
    expect(anotados).toHaveLength(1);
  });
});

describe("crearAlmacenSupabase", () => {
  function armarCliente(respuesta: { error: { code?: string } | null }) {
    const llamadas: { tabla: string; fila: Record<string, unknown> }[] = [];
    const cliente: ClienteQueInserta = {
      from: (tabla) => ({
        insert: async (fila) => {
          llamadas.push({ tabla, fila });
          return respuesta;
        },
      }),
    };
    return { cliente, llamadas };
  }

  test("inserta en la tabla eventos solo accion, usuario_id y distrito", async () => {
    const { cliente, llamadas } = armarCliente({ error: null });

    await crearAlmacenSupabase(cliente).guardar({
      accion: "registro",
      usuarioId: USUARIO,
      distrito: "Ayacucho",
    });

    expect(llamadas).toEqual([
      { tabla: "eventos", fila: { accion: "registro", usuario_id: USUARIO, distrito: "Ayacucho" } },
    ]);
  });

  test("lanza un error si Supabase responde con error", async () => {
    const { cliente } = armarCliente({ error: { code: "42501" } });

    await expect(
      crearAlmacenSupabase(cliente).guardar({ accion: "registro", usuarioId: null, distrito: null }),
    ).rejects.toThrow("código 42501");
  });

  test("con registrarEvento, un error de Supabase no rompe la acción del usuario", async () => {
    const { cliente } = armarCliente({ error: { code: "42501" } });
    const anotados: string[] = [];
    const registrarEvento = crearRegistrarEvento({
      almacen: crearAlmacenSupabase(cliente),
      anotarError: (mensaje) => anotados.push(mensaje),
    });

    await expect(registrarEvento("perdida_publicada", USUARIO, "Ayacucho")).resolves.toBeUndefined();

    expect(anotados).toEqual(["No se pudo registrar el evento perdida_publicada"]);
  });
});
