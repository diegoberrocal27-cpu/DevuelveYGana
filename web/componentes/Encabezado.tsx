import Image from "next/image";
import Link from "next/link";
import AvatarSesion from "./AvatarSesion";

export default function Encabezado() {
  return (
    <header className="sticky top-0 z-20 border-b border-borde bg-superficie">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4 md:max-w-3xl">
        <Link href="/" aria-label="DevuelveyGana, ir al inicio">
          <Image
            src="/logo-devuelveygana.png"
            alt="DevuelveyGana"
            width={1384}
            height={387}
            className="h-8 w-auto"
          />
        </Link>
        <AvatarSesion />
      </div>
    </header>
  );
}
