import { describe, expect, test } from "vitest";
import { estaActiva } from "@/componentes/MenuInferior";
import { formatearDia } from "@/componentes/TarjetaPublicacion";
import {
  celularPeruano,
  correo,
  fechaNoFutura,
  hayErrores,
  longitudMinima,
  requerido,
  validar,
} from "./validacion";

describe("reglas de validación", () => {
  test("requerido rechaza vacío y espacios", () => {
    expect(requerido()("")).toBe("Este campo es obligatorio.");
    expect(requerido()("   ")).toBe("Este campo es obligatorio.");
    expect(requerido()("celular")).toBeNull();
  });

  test("celular peruano: 9 dígitos que empiezan con 9", () => {
    expect(celularPeruano()("987654321")).toBeNull();
    expect(celularPeruano()("887654321")).not.toBeNull();
    expect(celularPeruano()("98765")).not.toBeNull();
    expect(celularPeruano()("")).toBeNull(); // opcional si está vacío
  });

  test("correo válido", () => {
    expect(correo()("ana@unsch.edu.pe")).toBeNull();
    expect(correo()("ana@")).not.toBeNull();
  });

  test("longitud mínima solo aplica si hay texto", () => {
    expect(longitudMinima(10)("corto")).toBe("Escribe al menos 10 caracteres.");
    expect(longitudMinima(10)("")).toBeNull();
  });

  test("fecha no futura", () => {
    expect(fechaNoFutura("2026-11-22")("2026-11-23")).not.toBeNull();
    expect(fechaNoFutura("2026-11-22")("2026-11-22")).toBeNull();
  });

  test("validar devuelve el primer error de cada campo", () => {
    const errores = validar(
      { categoria: "", descripcion: "abc" },
      { categoria: [requerido("Elige la categoría.")], descripcion: [requerido(), longitudMinima(10)] },
    );
    expect(errores).toEqual({ categoria: "Elige la categoría.", descripcion: "Escribe al menos 10 caracteres." });
    expect(hayErrores(errores)).toBe(true);
    expect(hayErrores({})).toBe(false);
  });
});

describe("utilidades de los componentes", () => {
  test("el menú marca como activa la ruta correcta", () => {
    expect(estaActiva("/", "/")).toBe(true);
    expect(estaActiva("/perdi", "/")).toBe(false);
    expect(estaActiva("/perdi/nueva", "/perdi")).toBe(true);
  });

  test("la fecha se muestra como día/mes/año", () => {
    expect(formatearDia("2026-11-20")).toBe("20/11/2026");
  });
});
