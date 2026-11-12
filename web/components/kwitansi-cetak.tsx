import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import type { IsiKwitansi } from "@/lib/kwitansi";
import { angka, rupiah } from "@/lib/uang";

/**
 * Kwitansi digital pengganti buku (06-DOKUMEN-QUOTATION §6, D-045): field
 * sama dengan buku — No, Sudah terima dari, Banyaknya uang (terbilang),
 * Untuk pembayaran, Jumlah, "Bogor, tanggal" — ditambah kotak materai bila
 * nilainya di atas batas (Angka Bisnis).
 *
 * Satu lembar A5 landscape (210 × 148 mm) — kertas fisik kwitansi Tiska, jadi
 * tidak perlu dipotong dari A4. Ukuran kertasnya diatur halaman cetaknya
 * (`@page`); lembar ini setinggi kertasnya supaya layar = hasil cetak.
 * Gaya buku kwitansi: isian di atas garis titik-titik, terbilang berlatar,
 * kotak "Rp" di kiri bawah, tanda tangan di kanan bawah. Aksen emas logo Tiska.
 */
const EMAS = "#b08a3a";

export function KwitansiCetak({ isi }: { isi: IsiKwitansi }) {
  const baris = (label: string, nilai: React.ReactNode) => (
    <div className="grid grid-cols-[34mm_minmax(0,1fr)] items-baseline gap-x-3 border-b border-dotted border-[#a9a493] py-[3.1mm]">
      <span className="text-[11.5px] text-[#5b5e70]">{label}</span>
      <div>{nilai}</div>
    </div>
  );
  return (
    <div className="relative flex min-h-[148mm] min-w-[210mm] flex-col px-[13mm] pt-[10mm] pb-[9mm] text-[13.5px] leading-snug text-[#1c1f2e]">
      {/* Bingkai tipis emas — batas potong visual, aman dari tepi tak tercetak printer (±4 mm). */}
      <div className="pointer-events-none absolute inset-[5mm] rounded-[2.5mm] border" style={{ borderColor: "#dccb9c" }} />

      {/* Kolom kop = kolom isian di bawahnya: nama PT rata kiri dengan "Sudah terima dari" dst. */}
      <header className="grid grid-cols-[34mm_minmax(0,1fr)_auto] items-center gap-x-3 border-b-[1.5px] pb-[3mm]" style={{ borderColor: EMAS }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {isi.perusahaan.logo ? <img src={isi.perusahaan.logo} alt={isi.perusahaan.nama} className="h-[14mm] w-auto max-w-full object-contain object-left" /> : null}
        </div>
        <span className="text-[15px] font-semibold tracking-wide text-[#1f2a5c]">{isi.perusahaan.nama}</span>
        <div className="self-end text-right">
          <div className="text-[30px] leading-none font-bold tracking-tight text-[#1f2a5c]">Kwitansi</div>
          <div className="mt-1.5 text-[11.5px] tabular-nums text-[#5b5e70]">
            No. <span className="font-semibold text-[#1c1f2e]">{isi.nomor}</span>
          </div>
        </div>
      </header>

      <div className="mt-[2mm]">
        {baris("Sudah terima dari", <span className="text-[17px] font-bold">{isi.dari}</span>)}
        {baris(
          "Banyaknya uang",
          <span className="block rounded-[1.5mm] bg-[#f6efdc] px-3 py-[2mm] font-semibold italic"># {isi.terbilang} #</span>,
        )}
        {baris("Untuk pembayaran", isi.untuk)}
        {baris("Cara bayar", isi.metode)}
        {Number(isi.pph23) > 0 ? baris("Termasuk PPh 23", `${rupiah(isi.pph23)} (dipotong customer, bukti potong terlampir)`) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-6 pt-[3mm]">
        {/* Kotak jumlah gaya buku kwitansi: "Rp" | angka — sejajar tengah blok tanda tangan, tidak menggantung di pojok. */}
        <div className="flex items-stretch overflow-hidden rounded-[2.5mm] border-[1.5px] border-[#1f2a5c]">
          <span className="flex items-center bg-[#1f2a5c] px-[4mm] text-[19px] font-bold text-white">Rp</span>
          <div className="bg-[#f6efdc] px-[5mm] py-[2.5mm]">
            <div className="text-[11px] text-[#5b5e70]">Jumlah</div>
            <div className="text-[32px] leading-tight font-bold tracking-tight tabular-nums">{angka(isi.jumlah)},-</div>
          </div>
        </div>
        <div className="w-[60mm] text-center">
          <div>Bogor, {format(isi.tanggal, "d MMMM yyyy", { locale: localeId })}</div>
          {/* Kotak "Materai" sengaja tidak digambar (permintaan Rama 12 Nov): e-meterai dibubuhkan di portal,
              meterai tempel ditempel di sisi kiri tanda tangan tanpa perlu kotak. */}
          <div className="mt-1 flex h-[21mm] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {isi.penandatangan.tautan ? <img src={isi.penandatangan.tautan} alt="" className="h-[19mm] w-auto" /> : null}
          </div>
          <div className="border-t border-[#1c1f2e] pt-1 font-semibold">{isi.penandatangan.nama ?? " "}</div>
          <div className="text-[10.5px] text-[#5b5e70]">{isi.perusahaan.nama}</div>
        </div>
      </div>
    </div>
  );
}
