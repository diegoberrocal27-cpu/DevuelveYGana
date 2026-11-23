import Link from "next/link";
import { Marca } from "./Marca";

export function Navegacion() {
  return (
    <header className="bg-tinta">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-10"
      >
        <Link href="/" aria-label="DevuelveyGana, ir al inicio">
          <Marca oscura />
        </Link>
        <ul className="flex items-center gap-1 text-sm font-medium sm:gap-4 sm:text-base">
          <li>
            <Link
              href="/perdi"
              className="whitespace-nowrap rounded-full px-2.5 py-2 sm:px-4 text-white/85 transition-colors hover:text-white"
            >
              Perdí algo
            </Link>
          </li>
          <li>
            <Link
              href="/encontre"
              className="whitespace-nowrap rounded-full bg-white px-2.5 py-2 sm:px-4 text-tinta transition-colors hover:bg-turquesa"
            >
              Encontré algo
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
