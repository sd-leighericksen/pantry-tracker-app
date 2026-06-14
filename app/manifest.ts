import type { MetadataRoute } from "next";

/* Web app manifest (BRIEF §6 PWA). Installable on mobile/kiosk home screens,
 * standalone display, dark theme to match the canvas. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pantry Tracker",
    short_name: "Pantry",
    description: "Household pantry inventory and shopping list.",
    start_url: "/kiosk",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
