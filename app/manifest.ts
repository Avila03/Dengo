import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dengo",
    short_name: "Dengo",
    description: "Um lugar para cuidar da vida a dois.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F9F7F4",
    theme_color: "#F9F7F4",
    lang: "pt-BR",
    icons: [
      {
        src: "/brand/dengo-icon-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/dengo-icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
