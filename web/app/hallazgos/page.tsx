import { redirect } from "next/navigation";

/** El catálogo de hallazgos ahora vive en «Perdí algo» (/perdi). Se mantiene esta ruta por enlaces antiguos. */
export default function PaginaHallazgos() {
  redirect("/perdi");
}
