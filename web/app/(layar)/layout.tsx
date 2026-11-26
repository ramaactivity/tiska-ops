import { Plus_Jakarta_Sans } from "next/font/google";

/* Layar dapur (Rama 26 Nov 2026): berwarna seperti Tiska Ops, rasa poster — biru indigo pekat dengan cahaya
   lembut, tulisan putih tebal, satu aksen hijau limau. Satu keluarga huruf: Plus Jakarta Sans. */
const teks = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], style: ["normal", "italic"], variable: "--font-teks", display: "swap" });

/** Kerangka layar TV (D-055): layar penuh, tanpa navigasi. */
export default function LayoutLayar({ children }: LayoutProps<"/">) {
  return (
    <div
      className={`${teks.variable} dark min-h-dvh font-[family-name:var(--font-teks)] text-white selection:bg-[#C6F06A] selection:text-[#142074]`}
      style={{
        background:
          "radial-gradient(120% 90% at 85% 0%, rgba(120,160,255,0.35) 0%, rgba(120,160,255,0) 55%), linear-gradient(150deg, #101a63 0%, #1d2f9e 48%, #2f4bd0 100%)",
      }}
    >
      {children}
    </div>
  );
}
