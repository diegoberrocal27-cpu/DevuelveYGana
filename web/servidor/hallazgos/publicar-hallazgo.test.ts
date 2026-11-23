import { describe, expect, test, vi } from "vitest";
import { crearAlmacenesEnMemoria } from "./almacen-en-memoria";
import { crearListarCatalogo } from "./catalogo";
import { crearPublicarHallazgo } from "./publicar-hallazgo";
import type { AnotarEvento, DatosHallazgo, UsuarioActual } from "./tipos";

const HOY = "2026-11-22";
const HALLADOR: UsuarioActual = { id: "00000000-0000-4000-8000-000000000001", verificado: true, bloqueado: false };
const FOTO = { contenido: new Uint8Array([1, 2, 3]), tipo: "image/jpeg", tamano: 3 };

function datos(cambios: Partial<DatosHallazgo> = {}): DatosHallazgo {
  return {
    categoria: "celular",
    descripcion: "Celular negro con funda azul",
    dia: "2026-11-21",
    distrito: "Ayacucho",
    buenaFe: true,
    foto: FOTO,
    ...cambios,
  };
}

function preparar(opciones: { difuminar?: () => Promise<Uint8Array> } = {}) {
  const memoria = crearAlmacenesEnMemoria();
  const anotarEvento = vi.fn<AnotarEvento>(async () => {});
  let siguiente = 0;
  const publicar = crearPublicarHallazgo({
    almacen: memoria.hallazgos,
    fotos: memoria.fotos,
    difuminar: opciones.difuminar ?? (async () => new Uint8Array([9])),
    anotarEvento,
    generarId: () => `id-${++siguiente}`,
    hoy: () => HOY,
    anotarError: () => {},
  });
  return { memoria, publicar, anotarEvento };
}

describe("HU-03: publicar un hallazgo", () => {
  test("guarda la original en privado, la copia difuminada y el hallazgo publicado", async () => {
    const { memoria, publicar, anotarEvento } = preparar();

    const resultado = await publicar(HALLADOR, datos());

    expect(resultado).toEqual({ ok: true, id: "id-1" });
    expect(memoria.fotos.archivos.get("fotos-originales/id-1/original.jpg")?.contenido).toEqual(FOTO.contenido);
    expect(memoria.fotos.archivos.get("fotos-difuminadas/id-1/difuminada.jpg")?.contenido).toEqual(
      new Uint8Array([9]),
    );
    expect(memoria.hallazgos.todos()[0]).toMatchObject({
      id: "id-1",
      halladorId: HALLADOR.id,
      buenaFeAceptada: true,
      estado: "publicado",
      fotoOriginalPath: "id-1/original.jpg",
      fotoDifuminadaPath: "id-1/difuminada.jpg",
    });
    expect(anotarEvento).toHaveBeenCalledWith("hallazgo_publicado", HALLADOR.id, "Ayacucho");
  });

  test("sin marcar la declaración de buena fe no se publica (RN-17)", async () => {
    const { memoria, publicar } = preparar();

    const resultado = await publicar(HALLADOR, datos({ buenaFe: false }));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.errores.buenaFe).toBeTruthy();
    expect(memoria.hallazgos.todos()).toHaveLength(0);
    expect(memoria.fotos.archivos.size).toBe(0);
  });

  test("pide sesión y cuenta verificada", async () => {
    const { publicar } = preparar();

    expect(await publicar(null, datos())).toMatchObject({ ok: false });
    expect(await publicar({ ...HALLADOR, verificado: false }, datos())).toMatchObject({ ok: false });
    expect(await publicar({ ...HALLADOR, bloqueado: true }, datos())).toMatchObject({ ok: false });
  });

  test("exige foto de tipo permitido", async () => {
    const { publicar } = preparar();

    const sinFoto = await publicar(HALLADOR, datos({ foto: null }));
    const tipoMalo = await publicar(HALLADOR, datos({ foto: { ...FOTO, tipo: "application/pdf" } }));

    expect(!sinFoto.ok && sinFoto.errores.foto).toBeTruthy();
    expect(!tipoMalo.ok && tipoMalo.errores.foto).toBeTruthy();
  });

  test("si el archivo no es una imagen, no queda nada guardado", async () => {
    const { memoria, publicar } = preparar({
      difuminar: async () => {
        throw new Error("Input buffer contains unsupported image format");
      },
    });

    const resultado = await publicar(HALLADOR, datos());

    expect(!resultado.ok && resultado.errores.foto).toBeTruthy();
    expect(memoria.fotos.archivos.size).toBe(0);
    expect(memoria.hallazgos.todos()).toHaveLength(0);
  });

  test("si falla la copia difuminada, se borra la original y no se publica", async () => {
    const { memoria, publicar } = preparar();
    const subirOriginal = memoria.fotos.subir;
    memoria.fotos.subir = async (bucket, ruta, contenido, tipo) => {
      if (bucket === "fotos-difuminadas") throw new Error("fallo de red");
      return subirOriginal(bucket, ruta, contenido, tipo);
    };

    const resultado = await publicar(HALLADOR, datos());

    expect(!resultado.ok && resultado.errores.general).toBeTruthy();
    expect(memoria.fotos.archivos.size).toBe(0);
    expect(memoria.hallazgos.todos()).toHaveLength(0);
  });

  test("si falla guardar el hallazgo, se borran las dos fotos", async () => {
    const { memoria, publicar } = preparar();
    memoria.hallazgos.guardar = async () => {
      throw new Error("fallo de base de datos");
    };

    const resultado = await publicar(HALLADOR, datos());

    expect(resultado.ok).toBe(false);
    expect(memoria.fotos.archivos.size).toBe(0);
  });

  test("si falla anotar el evento, la publicación igual se completa", async () => {
    const { publicar, anotarEvento } = preparar();
    anotarEvento.mockRejectedValueOnce(new Error("sin conexión"));

    expect((await publicar(HALLADOR, datos())).ok).toBe(true);
  });

  test("es gratis y sin límite: el mismo hallador publica muchas veces", async () => {
    const { memoria, publicar } = preparar();

    for (let i = 0; i < 25; i++) {
      expect((await publicar(HALLADOR, datos())).ok).toBe(true);
    }
    expect(memoria.hallazgos.todos()).toHaveLength(25);
  });
});

describe("HU-03: catálogo público", () => {
  test("solo muestra id, categoría, distrito y día; nunca la descripción ni las fotos", async () => {
    const { memoria, publicar } = preparar();
    await publicar(HALLADOR, datos());
    // Aunque el almacén devolviera de más, el catálogo aplica la lista blanca.
    memoria.hallazgos.listarPublicados = async () =>
      memoria.hallazgos.todos() as unknown as Awaited<ReturnType<typeof memoria.hallazgos.listarPublicados>>;

    const catalogo = await crearListarCatalogo(memoria.hallazgos)();

    expect(catalogo).toEqual([{ id: "id-1", categoria: "celular", distrito: "Ayacucho", dia: "2026-11-21" }]);
    expect(JSON.stringify(catalogo)).not.toMatch(/funda|original|difuminada|hallador/i);
  });

  test("muestra primero lo más reciente", async () => {
    const { memoria, publicar } = preparar();
    await publicar(HALLADOR, datos({ distrito: "Ayacucho" }));
    await publicar(HALLADOR, datos({ distrito: "Carmen Alto" }));

    const catalogo = await crearListarCatalogo(memoria.hallazgos)();

    expect(catalogo.map((h) => h.distrito)).toEqual(["Carmen Alto", "Ayacucho"]);
  });
});
