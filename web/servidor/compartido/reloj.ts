export interface Reloj {
  ahora(): number;
}

export const relojDelSistema: Reloj = { ahora: () => Date.now() };
