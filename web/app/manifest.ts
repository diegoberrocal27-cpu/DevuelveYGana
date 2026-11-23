import type { MetadataRoute } from "next";

// Manifiesto de la PWA: permite "instalar" DevuelveyGana en el celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevuelveyGana",
    short_name: "DevuelveyGana",
    description: "Recupera tus objetos perdidos de forma segura en Huamanga",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f9",
    theme_color: "#172839",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
