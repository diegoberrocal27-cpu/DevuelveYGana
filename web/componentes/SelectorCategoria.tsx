import type { ComponentProps } from "react";
import { CATEGORIAS } from "@/lib/catalogos";
import Selector from "./Selector";

type Props = Omit<ComponentProps<typeof Selector>, "opciones" | "etiqueta" | "name"> & {
  name?: string;
  etiqueta?: string;
};

export default function SelectorCategoria({ name = "categoria", etiqueta = "Categoría", ...resto }: Props) {
  return (
    <Selector
      name={name}
      etiqueta={etiqueta}
      opciones={CATEGORIAS}
      textoVacio="¿Qué objeto es?"
      {...resto}
    />
  );
}
