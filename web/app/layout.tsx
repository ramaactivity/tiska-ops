import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { DaftarSw } from "@/components/daftar-sw";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Sistem desain v2 (D-059): Inter untuk teks, JetBrains Mono untuk angka & nomor dokumen.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tiska Ops",
    template: "%s · Tiska Ops",
  },
  description:
    "Penjualan, operasional, dan keuangan Tiska Catering.",
  robots: { index: false, follow: false },
  icons: { apple: "/ikon/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Tiska Ops", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Android: keyboard memperkecil tinggi halaman, bukan menutupinya — lembar & tombol simpan naik di atas keyboard
  // tanpa layar digeser-geser (D-180).
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff0fb" },
    { media: "(prefers-color-scheme: dark)", color: "#14161f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-right" />
        <DaftarSw />
      </body>
    </html>
  );
}
