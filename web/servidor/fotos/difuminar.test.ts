import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { difuminarFoto, prepararCopiaPublica } from "./difuminar";

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

  test("copia pública: el DNI sale difuminado a 320 px y los demás nítidos a 640 px, sin metadatos", async () => {
    const original = await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: { r: 16, g: 168, b: 160 } },
    })
      .withExif({ IFD0: { Copyright: "dato privado" } })
      .jpeg()
      .toBuffer();

    const dni = await sharp(await prepararCopiaPublica(original, "dni")).metadata();
    const celular = await sharp(await prepararCopiaPublica(original, "celular")).metadata();

    expect(dni.width).toBe(320);
    expect(celular.width).toBe(640);
    expect(celular.format).toBe("jpeg");
    expect(celular.exif).toBeUndefined();
  });

  test("rechaza un archivo que no es una imagen", async () => {
    await expect(difuminarFoto(new TextEncoder().encode("no soy una foto"))).rejects.toThrow();
  });
});
