import { describe, expect, test } from "vitest";
import type { DatosHallazgo } from "./tipos";
import { fechaDeHoyEnLima, PESO_MAXIMO_FOTO, validarHallazgo } from "./validar-hallazgo";

const HOY = "2026-11-22";

const VALIDO: DatosHallazgo = {
  categoria: "dni",
  descripcion: "DNI encontrado en la plaza",
  dia: "2026-11-22",
  distrito: "San Juan Bautista",
  buenaFe: true,
  foto: { contenido: new Uint8Array([1]), tipo: "image/png", tamano: 1 },
};

describe("validación del hallazgo en el servidor", () => {
  test("un hallazgo completo no tiene errores", () => {
    expect(validarHallazgo(VALIDO, HOY)).toEqual({});
  });

  test("rechaza categorías y distritos que no están en la lista", () => {
    const errores = validarHallazgo({ ...VALIDO, categoria: "joyas", distrito: "Lima" }, HOY);
    expect(errores.categoria).toBeTruthy();
    expect(errores.distrito).toBeTruthy();
  });

  test("la descripción debe ser corta pero suficiente", () => {
    expect(validarHallazgo({ ...VALIDO, descripcion: "DNI" }, HOY).descripcion).toBeTruthy();
    expect(validarHallazgo({ ...VALIDO, descripcion: "x".repeat(201) }, HOY).descripcion).toBeTruthy();
  });

  test("el día no puede ser futuro ni tener otro formato", () => {
    expect(validarHallazgo({ ...VALIDO, dia: "2026-11-23" }, HOY).dia).toBeTruthy();
    expect(validarHallazgo({ ...VALIDO, dia: "22/11/2026" }, HOY).dia).toBeTruthy();
  });

  test("la foto es obligatoria, de tipo permitido y de hasta 4 MB", () => {
    expect(validarHallazgo({ ...VALIDO, foto: null }, HOY).foto).toBeTruthy();
    expect(validarHallazgo({ ...VALIDO, foto: { ...VALIDO.foto!, tipo: "image/gif" } }, HOY).foto).toBeTruthy();
    expect(
      validarHallazgo({ ...VALIDO, foto: { ...VALIDO.foto!, tamano: PESO_MAXIMO_FOTO + 1 } }, HOY).foto,
    ).toBeTruthy();
  });

  test("la declaración de buena fe es obligatoria", () => {
    expect(validarHallazgo({ ...VALIDO, buenaFe: false }, HOY).buenaFe).toBeTruthy();
  });

  test("la fecha de hoy se calcula con la hora de Lima", () => {
    // 23 de noviembre a las 03:00 UTC todavía es 22 de noviembre en Lima.
    expect(fechaDeHoyEnLima(new Date("2026-11-23T03:00:00Z"))).toBe("2026-11-22");
  });
});
