import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AVIS Agenda de Trabajos",
    short_name: "AVIS Agenda",
    description: "Carga de partes de trabajo — Estudio Veterinario AVIS",
    // Relativo, para que abra sobre el mismo origen desde el que se instaló
    // (localhost en la notebook, o la IP de la red en el celular).
    id: "/",
    start_url: "/",
    scope: "/",
    // En producción (HTTPS) instala como app real, ventana propia.
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1b83e0",
    icons: [
      { src: "/avis-logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/avis-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
