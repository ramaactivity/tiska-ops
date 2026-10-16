import { SkalaCetak } from "@/components/skala-cetak";
import { TombolCetak } from "@/components/tombol-cetak";
import { TombolGambar } from "@/components/tombol-gambar";

/**
 * Kerangka halaman cetak — tanpa navigasi, tanpa sidebar.
 *
 * Dokumen dibuat sebagai halaman web yang ditata untuk kertas A4, lalu
 * disimpan menjadi PDF lewat dialog cetak browser. Cara ini dipilih daripada
 * membuat PDF di server karena tiga alasan praktis: hurufnya pasti benar
 * (termasuk rupiah dan huruf beraksen), tidak menambah pustaka berat yang
 * rapuh di lingkungan serverless, dan hasilnya bisa langsung diperiksa mata
 * sebelum dikirim ke pelanggan.
 */
export default function LayoutCetak({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-muted/40 print:bg-white">
      <div className="mx-auto max-w-[210mm] px-4 py-6 print:max-w-none print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 print:hidden">
          <p className="text-sm text-muted-foreground">
            Tekan Cetak, lalu pilih <strong className="text-foreground">Save as PDF</strong>. Butuh gambar untuk WA? Tekan{" "}
            <strong className="text-foreground">JPG</strong> / <strong className="text-foreground">PNG</strong>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <SkalaCetak />
            <TombolGambar />
            <TombolCetak />
          </div>
        </div>

        <article className="lembar-cetak rounded-lg border bg-white p-[12mm] text-black shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {children}
        </article>
      </div>
    </div>
  );
}
