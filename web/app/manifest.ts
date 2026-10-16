import type { MetadataRoute } from "next";

/**
 * Web app manifest (D-011, D-053): Tiska Ops bisa "Tambahkan ke Layar
 * Utama" — terbuka layar penuh seperti aplikasi, mendarat di halaman awal
 * peran masing-masing (tim lapangan: Jadwal saya). Ikon = logo resmi utuh.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tiska Ops",
    short_name: "Tiska Ops",
    description: "Penjualan, operasional, dan jadwal tim Tiska Catering.",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#fcfcfd",
    icons: [
      { src: "/ikon/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikon/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
