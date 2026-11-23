import type { Errores } from "@/lib/validacion";
import { hoyEnLima } from "../compartido/fechas";
import type { Reloj } from "../compartido/reloj";
import type { AlmacenDePerdidas, LimiteDeIntentos } from "./puertos";
import { validarPerdida, type EntradaDePerdida } from "./validar-perdida";

const INTENTOS_DNI_POR_USUARIO = 5;
const INTENTOS_DNI_POR_ORIGEN = 20;
const VENTANA_DE_DNI_EN_SEGUNDOS = 3600;

export type PeticionDePerdida = {
  usuarioId: string;
  origen: string;
  entrada: EntradaDePerdida;
};

export type ResultadoDePerdida =
  | { estado: "creada"; id: string; distrito: string }
  | { estado: "no_habilitada" }
  | { estado: "datos_invalidos"; errores: Errores<string> }
  | { estado: "limite"; maximo: number }
  | { estado: "demasiados_intentos"; reintentarEnSegundos: number };

type Dependencias = {
  almacen: AlmacenDePerdidas;
  limite: LimiteDeIntentos;
  reloj: Reloj;
  secretoDeDni: () => string;
  maximoDePerdidasActivas?: number;
};

/** Sin suscripción se permite una pérdida activa; HU-10 subirá este límite. */
const MAXIMO_SIN_SUSCRIPCION = 1;

export function crearRegistroDePerdidas({
  almacen,
  limite,
  reloj,
  secretoDeDni,
  maximoDePerdidasActivas = MAXIMO_SIN_SUSCRIPCION,
}: Dependencias) {
  /** Cada intento con DNI cuenta, sea válido o no, contra el usuario y contra su origen. */
  async function segundosDeEsperaPorDni({ usuarioId, origen }: PeticionDePerdida): Promise<number> {
    const [delUsuario, delOrigen] = await Promise.all([
      limite.consumir(`dni:usuario:${usuarioId}`, INTENTOS_DNI_POR_USUARIO, VENTANA_DE_DNI_EN_SEGUNDOS),
      limite.consumir(`dni:origen:${origen}`, INTENTOS_DNI_POR_ORIGEN, VENTANA_DE_DNI_EN_SEGUNDOS),
    ]);
    return Math.max(delUsuario, delOrigen);
  }

  async function registrar(peticion: PeticionDePerdida): Promise<ResultadoDePerdida> {
    if (peticion.entrada.categoria === "dni") {
      const espera = await segundosDeEsperaPorDni(peticion);
      if (espera > 0) return { estado: "demasiados_intentos", reintentarEnSegundos: espera };
    }

    const validacion = validarPerdida(peticion.entrada, { hoy: hoyEnLima(reloj), secretoDeDni });
    if (!validacion.ok) return { estado: "datos_invalidos", errores: validacion.errores };

    const resultado = await almacen.registrar(peticion.usuarioId, validacion.datos, maximoDePerdidasActivas);
    switch (resultado.estado) {
      case "creada":
        return { estado: "creada", id: resultado.id, distrito: validacion.datos.distrito };
      case "limite":
        return { estado: "limite", maximo: maximoDePerdidasActivas };
      case "no_habilitada":
        return { estado: "no_habilitada" };
      default:
        throw new Error("La base de datos rechazó datos que el servidor ya había validado");
    }
  }

  return { registrar };
}

export type RegistroDePerdidas = ReturnType<typeof crearRegistroDePerdidas>;
