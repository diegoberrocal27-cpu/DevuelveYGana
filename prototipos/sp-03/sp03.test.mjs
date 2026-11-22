import assert from "node:assert/strict";
import { before, test } from "node:test";
import sharp from "sharp";
import { difuminarFoto } from "./difuminar.mjs";
import { crearFotoDeCelular } from "./foto-de-prueba.mjs";

let foto;

before(async () => {
  foto = await crearFotoDeCelular();
});

test("la foto de prueba pesa entre 3 y 6 MB", () => {
  const mb = foto.length / 1024 / 1024;
  assert.ok(mb >= 3 && mb <= 6, `pesa ${mb.toFixed(2)} MB`);
});

test("la copia es un JPEG de 400 px de ancho como máximo", async () => {
  const { format, width } = await sharp(await difuminarFoto(foto)).metadata();
  assert.equal(format, "jpeg");
  assert.ok(width <= 400);
});

test("la copia pesa menos de 100 KB", async () => {
  const copia = await difuminarFoto(foto);
  assert.ok(copia.length < 100 * 1024, `pesa ${copia.length} bytes`);
});

test("procesar una foto de celular tarda menos de 3 segundos", async () => {
  const inicio = performance.now();
  await difuminarFoto(foto);
  assert.ok(performance.now() - inicio < 3000);
});

test("la copia no conserva los metadatos de la foto (ubicación, modelo del celular)", async () => {
  const conGps = await sharp(foto)
    .withExif({ IFD0: { Copyright: "dueño", ImageDescription: "casa de Rosa" } })
    .jpeg()
    .toBuffer();
  assert.ok((await sharp(conGps).metadata()).exif, "la foto de prueba debería traer EXIF");

  const { exif } = await sharp(await difuminarFoto(conGps)).metadata();
  assert.equal(exif, undefined);
});

test("respeta la orientación guardada en la foto", async () => {
  const horizontal = await sharp(foto).resize({ width: 800 }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const { width, height } = await sharp(await difuminarFoto(horizontal)).metadata();
  assert.ok(height > width);
});

test("rechaza un archivo que no es una imagen", async () => {
  await assert.rejects(difuminarFoto(Buffer.from("esto no es una foto")));
});

test("rechaza una imagen con demasiados píxeles", async () => {
  const enorme = await sharp({ create: { width: 9000, height: 9000, channels: 3, background: "#fff" } }).png().toBuffer();
  await assert.rejects(difuminarFoto(enorme));
});

test("la copia no se parece a la original en el detalle fino", async () => {
  const copia = await sharp(await difuminarFoto(foto)).greyscale().raw().toBuffer({ resolveWithObject: true });
  let cambios = 0;
  for (let i = 1; i < copia.data.length; i++) {
    if (Math.abs(copia.data[i] - copia.data[i - 1]) > 24) cambios++;
  }
  assert.ok(cambios / copia.data.length < 0.01, "quedan bordes duros: el texto podría seguir legible");
});
