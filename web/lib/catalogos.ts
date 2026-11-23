// Listas compartidas por los formularios. Los valores coinciden con la base de datos (T-02).

export const CATEGORIAS = [
  { valor: "celular", etiqueta: "Celular" },
  { valor: "laptop", etiqueta: "Laptop" },
  { valor: "dni", etiqueta: "DNI" },
  { valor: "cartera", etiqueta: "Cartera o billetera" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["valor"];

// Los cinco distritos urbanos de Huamanga (alcance del piloto).
export const DISTRITOS = [
  "Ayacucho",
  "San Juan Bautista",
  "Carmen Alto",
  "Jesús Nazareno",
  "Andrés Avelino Cáceres Dorregaray",
] as const;

export type Distrito = (typeof DISTRITOS)[number];

export function etiquetaDeCategoria(valor: string): string {
  return CATEGORIAS.find((c) => c.valor === valor)?.etiqueta ?? valor;
}
