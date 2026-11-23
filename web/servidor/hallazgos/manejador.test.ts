import { describe, expect, test, vi } from "vitest";
import { crearManejadorDeHallazgos } from "./manejador";
import type { ResultadoPublicacion } from "./publicar-hallazgo";
import type { DatosHallazgo, UsuarioActual } from "./tipos";

const VERIFICADO: UsuarioActual = { id: "00000000-0000-4000-8000-000000000001", verificado: true, bloqueado: false };

function formulario(cambios: Record<string, string | Blob> = {}) {
  const datos = new FormData();
  const campos: Record<string, string | Blob> = {
    categoria: "celular",
    descripcion: "Celular negro con funda azul",
    dia: "2026-11-21",
    distrito: "Ayacucho",
    buenaFe: "si",
    foto: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
    ...cambios,
  };
  for (const [campo, valor] of Object.entries(campos)) datos.set(campo, valor);
  return datos;
}

function peticion(cuerpo: FormData | string, token: string | null = "token-valido") {
  return new Request("http://localhost/api/hallazgos", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: cuerpo,
  });
}

function preparar(usuario: UsuarioActual | null = VERIFICADO) {
  const publicar = vi.fn<(usuario: UsuarioActual, datos: DatosHallazgo) => Promise<ResultadoPublicacion>>(
    async () => ({ ok: true, id: "id-1" }),
  );
  const manejar = crearManejadorDeHallazgos({
    autenticar: async (token) => (token === "token-valido" ? usuario : null),
    publicar,
    anotarError: () => {},
  });
  return { manejar, publicar };
}

describe("HU-03: POST /api/hallazgos", () => {
  test("sin token o con token inválido responde 401 y no publica", async () => {
    const { manejar, publicar } = preparar();

    expect((await manejar(peticion(formulario(), null))).status).toBe(401);
    expect((await manejar(peticion(formulario(), "otro"))).status).toBe(401);
    expect(publicar).not.toHaveBeenCalled();
  });

  test("una cuenta sin celular verificado no puede publicar (403)", async () => {
    const { manejar, publicar } = preparar({ ...VERIFICADO, verificado: false });

    const respuesta = await manejar(peticion(formulario()));

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toMatchObject({ estado: "no_habilitada" });
    expect(publicar).not.toHaveBeenCalled();
  });

  test("una cuenta bloqueada no puede publicar (403)", async () => {
    const { manejar } = preparar({ ...VERIFICADO, bloqueado: true });

    expect(await (await manejar(peticion(formulario()))).json()).toMatchObject({ estado: "suspendida" });
  });

  test("con cuenta verificada publica y responde 201 con el id", async () => {
    const { manejar, publicar } = preparar();

    const respuesta = await manejar(peticion(formulario()));

    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ estado: "publicado", id: "id-1" });
    const [usuario, datos] = publicar.mock.calls[0];
    expect(usuario).toBe(VERIFICADO);
    expect(datos).toMatchObject({ categoria: "celular", distrito: "Ayacucho", buenaFe: true });
    expect(datos.foto).toMatchObject({ tipo: "image/jpeg", tamano: 3 });
  });

  test("los errores de campos vuelven con 400", async () => {
    const { manejar, publicar } = preparar();
    publicar.mockResolvedValueOnce({ ok: false, errores: { buenaFe: "Acepta la declaración." } });

    const respuesta = await manejar(peticion(formulario({ buenaFe: "no" })));

    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toMatchObject({ estado: "datos_invalidos", errores: { buenaFe: "Acepta la declaración." } });
  });

  test("si falla Storage o la base responde 503 sin detalles internos", async () => {
    const { manejar, publicar } = preparar();
    publicar.mockRejectedValueOnce(new Error("clave secreta en el mensaje"));

    const respuesta = await manejar(peticion(formulario()));

    expect(respuesta.status).toBe(503);
    expect(JSON.stringify(await respuesta.json())).not.toMatch(/clave/);
  });

  test("un cuerpo que no es formulario responde 400", async () => {
    const { manejar } = preparar();

    expect((await manejar(peticion("esto no es un formulario"))).status).toBe(400);
  });
});
