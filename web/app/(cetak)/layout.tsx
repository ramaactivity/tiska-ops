import { FileText } from "lucide-react";
import { Suspense } from "react";

import { ID_SLOT, LabelKertas } from "@/components/panel-cetak";
import { SkalaCetak } from "@/components/skala-cetak";
import { TombolCetak } from "@/components/tombol-cetak";
import { TombolGambar } from "@/components/tombol-gambar";

/**
 * Kerangka halaman cetak — tanpa navigasi, tanpa sidebar aplikasi.
 *
 * Dokumen dibuat sebagai halaman web yang ditata untuk kertasnya, lalu
 * disimpan menjadi PDF lewat dialog cetak browser. Cara ini dipilih daripada
 * membuat PDF di server karena tiga alasan praktis: hurufnya pasti benar
 * (termasuk rupiah dan huruf beraksen), tidak menambah pustaka berat yang
 * rapuh di lingkungan serverless, dan hasilnya bisa langsung diperiksa mata
 * sebelum dikirim ke pelanggan.
 *
 * Layar lebar: kertas di kiri (ukuran asli, di atas "meja"), panel kendali
 * menempel di kanan. HP: panel di atas kertas. Saat dicetak hanya kertasnya.
 * Dokumen menaruh pilihannya sendiri di panel lewat <SlotPanelCetak>.
 */
export default function LayoutCetak({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-[image:var(--shell)] print:bg-none print:bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:px-8 lg:py-8 print:block print:max-w-none print:p-0">
        <main className="order-2 flex min-w-0 flex-col items-center lg:order-1 print:block">
          <div className="mb-3 flex w-full max-w-[210mm] items-center gap-2 text-[13px] text-muted-foreground print:hidden">
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

        <aside className="order-1 lg:order-2 print:hidden">
          <div className="flex flex-col divide-y divide-border rounded-[18px] border bg-card shadow-[0_1px_2px_rgba(31,42,92,0.05),0_8px_24px_-12px_rgba(31,42,92,0.16)] lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">
            <section className="flex flex-col gap-3 p-5">
              <TombolCetak />
              <p className="text-[13px] leading-snug text-muted-foreground">
                Pilih printer untuk mencetak, atau <strong className="font-semibold text-foreground">Save as PDF</strong> untuk berkas.
              </p>
              <div className="grid grid-cols-2 gap-2 [&>*:only-child]:col-span-2 [&>button:first-child:nth-last-child(3)]:col-span-2">
                <TombolGambar />
              </div>
            </section>
            <section className="flex flex-col gap-2.5 p-5">
              <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Ukuran isi</h2>
              <SkalaCetak />
            </section>
            <div id={ID_SLOT} className="contents" />
          </div>
        </aside>
      </div>
    </div>
  );
}
