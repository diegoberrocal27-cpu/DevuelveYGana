import { describe, expect, test } from "vitest";
import { describirDia } from "./TarjetaPublicacion";

describe("tarjeta pública: día en palabras", () => {
  test("hoy, ayer y hace N días hasta una semana", () => {
    expect(describirDia("2026-11-23", "2026-11-23")).toBe("hoy");
    expect(describirDia("2026-11-22", "2026-11-23")).toBe("ayer");
    expect(describirDia("2026-11-20", "2026-11-23")).toBe("hace 3 días");
  });

  test("más de una semana, sin hoy o con fecha futura muestra la fecha", () => {
    expect(describirDia("2026-11-01", "2026-11-23")).toBe("01/11/2026");
    expect(describirDia("2026-11-20")).toBe("20/11/2026");
    expect(describirDia("2026-11-24", "2026-11-23")).toBe("24/11/2026");
  });
});
