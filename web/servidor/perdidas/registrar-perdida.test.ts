import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, test } from "vitest";
import { cargarSecretoDeDni, hmacDni } from "./dni";
import type { AlmacenDePerdidas, DatosDePerdida, LimiteDeIntentos } from "./puertos";
import { crearRegistroDePerdidas } from "./registrar-perdida";
import type { EntradaDePerdida } from "./validar-perdida";

const SECRETO = "clave-de-prueba-para-dni-de-32-caracteres";
const ORIGEN = "origen-de-prueba";

const celular: EntradaDePerdida = {
  categoria: "celular",
  descripcion: "Celular negro con funda azul",
  fecha: "2026-11-20",
  distrito: "Ayacucho",
  rasgos: { fondo_pantalla: "Foto de un perro", imei_ultimos_4: "4821", detalle_fisico: "" },
};

const dni: EntradaDePerdida = {
  categoria: "dni",
  descripcion: "DNI de una mujer, mica transparente",
  fecha: "2026-11-20",
  distrito: "Carmen Alto",
  rasgos: { dni: "12345678", fecha_emision: "2019-03-14" },
};

function armar(secreto: () => string = () => SECRETO) {
  const reloj = { ahora: () => Date.parse("2026-11-22T17:00:00Z") };
  const guardadas: { duenoId: string; datos: DatosDePerdida; maximo: number }[] = [];
  const consumos: { clave: string; maximo: number }[] = [];
  let esperaDelLimite = 0;
  let respuesta: Awaited<ReturnType<AlmacenDePerdidas["registrar"]>> = { estado: "creada", id: "perdida-1" };

  const almacen: AlmacenDePerdidas = {
    registrar: async (duenoId, datos, maximo) => {
      guardadas.push({ duenoId, datos, maximo });
      return respuesta;
    },
  };
  const limite: LimiteDeIntentos = {
    consumir: async (clave, maximo) => {
      consumos.push({ clave, maximo });
      return esperaDelLimite;
    },
  };
  const registro = crearRegistroDePerdidas({ almacen, limite, reloj, secretoDeDni: secreto });
  return {
    registro,
    guardadas,
    consumos,
    responderAlmacenCon: (r: typeof respuesta) => void (respuesta = r),
    hacerEsperar: (segundos: number) => void (esperaDelLimite = segundos),
  };
}

const pedir = (entrada: EntradaDePerdida) => ({ usuarioId: "ana", origen: ORIGEN, entrada });

describe("registro de pérdida (HU-02)", () => {
  let mundo: ReturnType<typeof armar>;
  beforeEach(() => {
    mundo = armar();
  });

  test("con 2 de 3 rasgos entrega a la base los datos limpios y devuelve el distrito para el evento", async () => {
    const resultado = await mundo.registro.registrar(pedir({ ...celular, descripcion: "  Celular negro con funda azul  " }));
    expect(resultado).toEqual({ estado: "creada", id: "perdida-1", distrito: "Ayacucho" });
    expect(mundo.guardadas).toEqual([
      {
        duenoId: "ana",
        maximo: 1,
        datos: {
          categoria: "celular",
          descripcion: "Celular negro con funda azul",
          fecha: "2026-11-20",
          distrito: "Ayacucho",
          rasgos: [
            { tipo: "fondo_pantalla", valor: "Foto de un perro" },
            { tipo: "imei_ultimos_4", valor: "4821" },
          ],
        },
      },
    ]);
  });

  test("con 1 solo rasgo no llega a la base y se explica por qué", async () => {
    const resultado = await mundo.registro.registrar(pedir({ ...celular, rasgos: { fondo_pantalla: "Foto de un perro" } }));
    expect(resultado).toEqual({
      estado: "datos_invalidos",
      errores: { rasgos: "Llena al menos 2 de los 3 rasgos ocultos." },
    });
    expect(mundo.guardadas).toHaveLength(0);
  });

  test("un rasgo con solo espacios cuenta como vacío", async () => {
    const resultado = await mundo.registro.registrar(pedir({ ...celular, rasgos: { fondo_pantalla: "Foto", imei_ultimos_4: "   " } }));
    expect(resultado).toMatchObject({ estado: "datos_invalidos", errores: { rasgos: expect.any(String) } });
  });

  test("si falta un campo obligatorio indica cuál y no publica", async () => {
    const resultado = await mundo.registro.registrar(pedir({ ...celular, descripcion: "", fecha: "", distrito: "" }));
    expect(resultado).toEqual({
      estado: "datos_invalidos",
      errores: {
        descripcion: "Describe el objeto.",
        fecha: "Indica el día en que lo perdiste.",
        distrito: "Elige el distrito.",
      },
    });
    expect(mundo.guardadas).toHaveLength(0);
  });

  test("rechaza categoría o distrito fuera de la lista, incluido «Otro»", async () => {
    const resultado = await mundo.registro.registrar(pedir({ ...celular, categoria: "bicicleta", distrito: "Otro" }));
    expect(resultado).toMatchObject({
      estado: "datos_invalidos",
      errores: { categoria: "Elige una categoría de la lista.", distrito: "Elige un distrito de la lista." },
    });
  });

  test("rechaza una fecha futura o inexistente y acepta hoy según la hora de Lima", async () => {
    for (const fecha of ["2026-11-23", "2026-02-30", "20/11/2026"]) {
      const resultado = await mundo.registro.registrar(pedir({ ...celular, fecha }));
      expect(resultado).toMatchObject({ estado: "datos_invalidos", errores: { fecha: expect.any(String) } });
    }
    expect((await mundo.registro.registrar(pedir({ ...celular, fecha: "2026-11-22" }))).estado).toBe("creada");
  });

  test("valida el formato de los rasgos que lo tienen", async () => {
    const resultado = await mundo.registro.registrar(pedir({ ...celular, rasgos: { imei_ultimos_4: "12a4", fondo_pantalla: "Un perro" } }));
    expect(resultado).toMatchObject({ estado: "datos_invalidos", errores: { imei_ultimos_4: "Ingresa solo 4 dígitos." } });
  });

  test("descarta campos que no son rasgos de la categoría", async () => {
    await mundo.registro.registrar(pedir({ ...celular, rasgos: { ...celular.rasgos, serie: "ABC123", rol: "admin" } }));
    expect(mundo.guardadas[0].datos.rasgos.map((r) => r.tipo).sort()).toEqual(["fondo_pantalla", "imei_ultimos_4"]);
  });

  test("traduce la respuesta de la base: cuenta no habilitada y límite de pérdidas", async () => {
    mundo.responderAlmacenCon({ estado: "no_habilitada" });
    expect(await mundo.registro.registrar(pedir(celular))).toEqual({ estado: "no_habilitada" });
    mundo.responderAlmacenCon({ estado: "limite" });
    expect(await mundo.registro.registrar(pedir(celular))).toEqual({ estado: "limite", maximo: 1 });
  });

  test("si la base rechaza datos que ya validamos, es un error del servidor y no un mensaje al usuario", async () => {
    mundo.responderAlmacenCon({ estado: "invalido" });
    await expect(mundo.registro.registrar(pedir(celular))).rejects.toThrow("rechazó datos");
  });

  test("las demás categorías no gastan el límite de DNI", async () => {
    await mundo.registro.registrar(pedir(celular));
    expect(mundo.consumos).toHaveLength(0);
  });
});

describe("DNI protegido (SP-02)", () => {
  test("el número y la fecha de emisión salen hacia la base solo como HMAC", async () => {
    const mundo = armar();
    await mundo.registro.registrar(pedir(dni));
    const { rasgos } = mundo.guardadas[0].datos;
    expect(rasgos.map((r) => r.tipo).sort()).toEqual(["dni_hmac", "fecha_emision_hmac"]);
    expect(JSON.stringify(mundo.guardadas)).not.toContain("12345678");
    expect(JSON.stringify(mundo.guardadas)).not.toContain("2019-03-14");
    expect(rasgos.find((r) => r.tipo === "dni_hmac")?.valor).toBe(
      createHmac("sha256", SECRETO).update("dni:v1:12345678").digest("hex"),
    );
  });

  test("el mismo DNI da el mismo HMAC y otra clave da otro", () => {
    expect(hmacDni("12345678", SECRETO)).toBe(hmacDni("12345678", SECRETO));
    expect(hmacDni("12345678", SECRETO)).not.toBe(hmacDni("12345678", `${SECRETO}-otra`));
  });

  test("un DNI inválido da un mensaje genérico y no repite lo recibido", async () => {
    const mundo = armar();
    const resultado = await mundo.registro.registrar(pedir({ ...dni, rasgos: { ...dni.rasgos, dni: "1234" } }));
    expect(resultado).toMatchObject({ estado: "datos_invalidos", errores: { dni: "Ingresa los 8 dígitos del DNI." } });
    expect(JSON.stringify(resultado)).not.toContain('"1234"');
  });

  test("para el DNI se exigen el número y la fecha de emisión", async () => {
    const mundo = armar();
    const resultado = await mundo.registro.registrar(pedir({ ...dni, rasgos: { dni: "12345678" } }));
    expect(resultado).toMatchObject({ estado: "datos_invalidos", errores: { rasgos: "Llena al menos 2 de los 2 rasgos ocultos." } });
  });

  test("cada intento con DNI cuenta contra el usuario (5) y contra el origen (20), sea válido o no", async () => {
    const mundo = armar();
    await mundo.registro.registrar(pedir({ ...dni, rasgos: { dni: "1", fecha_emision: "2019-03-14" } }));
    expect(mundo.consumos).toEqual([
      { clave: "dni:usuario:ana", maximo: 5 },
      { clave: "dni:origen:origen-de-prueba", maximo: 20 },
    ]);
  });

  test("si el límite dice que hay que esperar, no se valida ni se guarda nada", async () => {
    const mundo = armar();
    mundo.hacerEsperar(1800);
    const resultado = await mundo.registro.registrar(pedir(dni));
    expect(resultado).toEqual({ estado: "demasiados_intentos", reintentarEnSegundos: 1800 });
    expect(mundo.guardadas).toHaveLength(0);
  });

  test("si falta la clave del servidor, falla con error y no guarda nada", async () => {
    const mundo = armar(() => cargarSecretoDeDni({}));
    await expect(mundo.registro.registrar(pedir(dni))).rejects.toThrow("DNI_HMAC_SECRET");
    expect(mundo.guardadas).toHaveLength(0);
  });

  test("la clave de menos de 32 caracteres se rechaza", () => {
    expect(() => cargarSecretoDeDni({ DNI_HMAC_SECRET: "corta" })).toThrow("DNI_HMAC_SECRET");
    expect(cargarSecretoDeDni({ DNI_HMAC_SECRET: SECRETO })).toBe(SECRETO);
  });
});
