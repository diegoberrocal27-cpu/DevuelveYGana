import type { ComponentProps } from "react";
import { DISTRITOS } from "@/lib/catalogos";
import Selector from "./Selector";

const OPCIONES = DISTRITOS.map((distrito) => ({ valor: distrito, etiqueta: distrito }));

type Props = Omit<ComponentProps<typeof Selector>, "opciones" | "etiqueta" | "name"> & {
  name?: string;
  etiqueta?: string;
};

export default function SelectorDistrito({ name = "distrito", etiqueta = "Distrito", ...resto }: Props) {
  return (
    <Selector
      name={name}
      etiqueta={etiqueta}
      opciones={OPCIONES}
      textoVacio="Selecciona el distrito"
      {...resto}
    />
  );
}
