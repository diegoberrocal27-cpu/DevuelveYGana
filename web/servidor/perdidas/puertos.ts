export type RasgoParaGuardar = { tipo: string; valor: string };

export type DatosDePerdida = {
  categoria: string;
  descripcion: string;
  fecha: string;
  distrito: string;
  rasgos: RasgoParaGuardar[];
};

export type ResultadoDelAlmacen =
  | { estado: "creada"; id: string }
  | { estado: "no_habilitada" | "limite" | "invalido" };

export interface AlmacenDePerdidas {
  registrar(duenoId: string, datos: DatosDePerdida, maximoDePerdidasActivas: number): Promise<ResultadoDelAlmacen>;
}

export interface LimiteDeIntentos {
  /** Cuenta un intento y devuelve los segundos que faltan para poder volver a intentar (0 si se permite). */
  consumir(clave: string, maximo: number, ventanaEnSegundos: number): Promise<number>;
}
