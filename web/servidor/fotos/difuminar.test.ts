import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { difuminarFoto } from "./difuminar";

describe("SP-03 / HU-03: copia difuminada en el servidor", () => {
  test("reduce a 320 px, convierte a JPEG y elimina los metadatos", async () => {
    const original = await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: { r: 23, g: 40, b: 57 } },
    })
      .withExif({ IFD0: { Copyright: "dato privado" } })
      .jpeg()
      .toBuffer();

    const copia = await difuminarFoto(original);
    const info = await sharp(copia).metadata();

    expect(info.format).toBe("jpeg");
    expect(info.width).toBe(320);
    expect(info.exif).toBeUndefined();
    expect(copia.length).toBeLessThan(original.length);
  });

  test("rechaza un archivo que no es una imagen", async () => {
    await expect(difuminarFoto(new TextEncoder().encode("no soy una foto"))).rejects.toThrow();
  });
});
