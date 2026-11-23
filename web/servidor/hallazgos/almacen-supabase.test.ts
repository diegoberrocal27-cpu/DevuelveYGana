import { describe, expect, test } from "vitest";
import { crearAlmacenDeHallazgosSupabase, type ClienteSupabaseServidor } from "./almacen-supabase";

/** Cliente falso que registra lo que se pide y responde con filas fijas. */
function clienteFalso(firmasFallan = false) {
  const pedido = { columnas: "", bucket: "", rutas: [] as string[] };
  const filas = [
    { id: "a", categoria: "celular", distrito: "Ayacucho", dia: "2026-11-22", foto_difuminada_path: "a/difuminada.jpg" },
    { id: "b", categoria: "dni", distrito: "Carmen Alto", dia: "2026-11-21", foto_difuminada_path: null },
  ];
  const cliente = {
    from: () => ({
      insert: async () => ({ error: null }),
      select: (columnas: string) => {
        pedido.columnas = columnas;
        return { eq: () => ({ order: async () => ({ data: filas, error: null }) }) };
      },
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
        createSignedUrls: async (rutas: string[]) => {
          pedido.bucket = bucket;
          pedido.rutas = rutas;
          if (firmasFallan) return { data: null, error: { code: "500" } };
          return { data: rutas.map((path) => ({ path, signedUrl: `https://firmado/${path}?token=x` })), error: null };
        },
      }),
    },
  } satisfies ClienteSupabaseServidor;
  return { cliente, pedido };
}

describe("catálogo en Supabase", () => {
  test("pide solo columnas públicas y firma únicamente copias difuminadas", async () => {
    const { cliente, pedido } = clienteFalso();

    const catalogo = await crearAlmacenDeHallazgosSupabase(cliente).listarPublicados();

    expect(pedido.columnas).not.toMatch(/descripcion|original|hallador/);
    expect(pedido.bucket).toBe("fotos-difuminadas");
    expect(pedido.rutas).toEqual(["a/difuminada.jpg"]);
    expect(catalogo).toEqual([
      { id: "a", categoria: "celular", distrito: "Ayacucho", dia: "2026-11-22", foto: "https://firmado/a/difuminada.jpg?token=x" },
      { id: "b", categoria: "dni", distrito: "Carmen Alto", dia: "2026-11-21" },
    ]);
  });

  test("si no se pueden firmar las fotos, el catálogo sale igual sin fotos", async () => {
    const { cliente } = clienteFalso(true);

    const catalogo = await crearAlmacenDeHallazgosSupabase(cliente).listarPublicados();

    expect(catalogo).toHaveLength(2);
    expect(catalogo.every((h) => !("foto" in h))).toBe(true);
  });
});
