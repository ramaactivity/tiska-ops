import { FileText } from "lucide-react";
import { Suspense } from "react";

import { ID_SLOT, LabelKertas } from "@/components/panel-cetak";
import { PratinjauPdf } from "@/components/pratinjau-pdf";
import { SkalaCetak } from "@/components/skala-cetak";
import { TombolCetak } from "@/components/tombol-cetak";
import { TombolGambar } from "@/components/tombol-gambar";
import { TombolPdf } from "@/components/tombol-pdf";

/**
 * Kerangka halaman cetak — tanpa navigasi, tanpa sidebar aplikasi.
 *
 * Dokumen dibuat sebagai halaman web yang ditata untuk kertasnya. Hurufnya
 * pasti benar (termasuk rupiah dan huruf beraksen) dan hasilnya bisa langsung
 * diperiksa mata sebelum dikirim ke pelanggan. Dua jalan keluar: "Unduh PDF"
 * (Chrome di server mencetak halaman yang sama, app/api/pdf — tanpa dialog)
 * dan "Cetak ke printer" (dialog cetak browser).
 *
 * Layar lebar: halaman PDF asli di kiri (PratinjauPdf, D-205), panel kendali
 * menempel di kanan. HP: panel di atas kertas. Saat dicetak hanya kertasnya.
 * Dokumen menaruh pilihannya sendiri di panel lewat <SlotPanelCetak>.
 */
export default function LayoutCetak({ children }: LayoutProps<"/">) {
  const judulBagian = "flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase";
  const nomor = "flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold tracking-normal text-primary";
  return (
    <div className="min-h-dvh bg-[image:var(--shell)] print:bg-none print:bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:px-8 lg:py-8 print:block print:max-w-none print:p-0">
        <main className="order-2 flex min-w-0 flex-col items-center lg:order-1 print:block">
          {/* Halaman PDF asli per lembar (D-205); selama disiapkan, tampilan HTML di bawah tetap terlihat. */}
          <Suspense>
            <PratinjauPdf />
          </Suspense>
          <div className="kepala-pratinjau-html mb-3 flex w-full max-w-[210mm] items-center gap-2 text-[13px] text-muted-foreground print:hidden">
            <FileText className="size-4" strokeWidth={1.75} />
            <span>Pratinjau ukuran asli</span>
            <span aria-hidden>·</span>
            <Suspense>
              <LabelKertas />
            </Suspense>
          </div>
          <article className="lembar-cetak w-full max-w-[210mm] rounded-[3px] bg-white p-[12mm] text-black shadow-[0_1px_2px_rgba(31,42,92,0.06),0_18px_40px_-16px_rgba(31,42,92,0.28)] ring-1 ring-black/[0.04] print:rounded-none print:p-0 print:shadow-none print:ring-0">
            {children}
          </article>
        </main>

        {/* Urutan kerja dari atas ke bawah (D-205): atur dulu, lalu simpan/kirim/cetak — tombolnya selalu terlihat. */}
        <aside className="order-1 lg:order-2 print:hidden">
          <div className="flex flex-col divide-y divide-border rounded-[18px] border bg-card shadow-[0_1px_2px_rgba(31,42,92,0.05),0_8px_24px_-12px_rgba(31,42,92,0.16)] lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">
            <section className="flex flex-col gap-2.5 p-5">
              <h2 className={judulBagian}>
                <span className={nomor}>1</span>
                Ukuran tulisan
              </h2>
              <SkalaCetak />
            </section>
            <div id={ID_SLOT} className="contents" />
            <section className="flex flex-col gap-2.5 rounded-b-[18px] bg-card p-5 lg:sticky lg:bottom-0">
              <h2 className={judulBagian}>
                <span className={nomor}>2</span>
                Simpan, kirim, atau cetak
              </h2>
              <TombolPdf />
              <TombolCetak />
              <div className="grid grid-cols-2 gap-2">
                <TombolGambar />
              </div>
              <p className="text-[13px] leading-snug text-muted-foreground">
                <strong className="font-semibold text-foreground">Unduh PDF</strong> langsung tersimpan di folder Unduhan, tanpa dialog cetak.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
