import type { ReactNode } from "react";

export type TipoAviso = "exito" | "error" | "aviso" | "info";

const estilos: Record<TipoAviso, string> = {
  exito: "border-exito bg-exito-claro text-exito",
  error: "border-error bg-error-claro text-error",
  aviso: "border-aviso bg-aviso-claro text-aviso",
  info: "border-turquesa bg-turquesa-claro text-marino",
};

type Props = {
  tipo?: TipoAviso;
  titulo?: string;
  children: ReactNode;
};

export default function Aviso({ tipo = "info", titulo, children }: Props) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-xl border-l-4 px-4 py-3 text-sm ${estilos[tipo]}`}
    >
      {titulo && <p className="font-semibold">{titulo}</p>}
      <div>{children}</div>
    </div>
  );
}
