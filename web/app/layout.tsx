import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import Encabezado from "@/componentes/Encabezado";
import MenuInferior from "@/componentes/MenuInferior";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevuelveyGana",
  description: "Recupera tus objetos perdidos de forma segura en Huamanga",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#172839",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Encabezado />
        {/* pb-24 deja espacio para que el menú inferior no tape el contenido */}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4 pb-24 md:max-w-3xl">
          {children}
        </main>
        <MenuInferior />
      </body>
    </html>
  );
}
