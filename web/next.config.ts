import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Folder induk masih berisi aplikasi Laravel lengkap dengan package-lock.json
  // miliknya sendiri. Tanpa penunjuk ini, Next.js mengira akar proyek ada di
  // sana dan menelusuri berkas PHP yang tidak ada hubungannya.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Paket ini menyimpan mesin kueri asli; biarkan Next.js memuatnya apa adanya
  // di sisi server, jangan dibundel.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],

  // Unduh PDF (app/api/pdf): biner Chromium dibaca dari berkas saat jalan, bukan diimpor —
  // tanpa ini Vercel tidak ikut mengemasnya dan Chrome gagal dibuka.
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
