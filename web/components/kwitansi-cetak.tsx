import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import type { IsiKwitansi } from "@/lib/kwitansi";
import { angka, rupiah } from "@/lib/uang";
import { EMAS } from "@/lib/warna-dokumen";

/**
 * Kwitansi digital pengganti buku (06-DOKUMEN-QUOTATION §6, D-045): field
 * sama dengan buku — No, Sudah terima dari, Banyaknya uang (terbilang),
 * Untuk pembayaran, Jumlah, "Bogor, tanggal". Kotak meterai tidak digambar (D-152).
 * Pilihan kertas lain: blanko Tiska (kwitansi-blanko.tsx) & A4 isi 2 (halaman cetaknya), D-154.
 *
 * Satu lembar A5 landscape (210 × 148 mm) — kertas fisik kwitansi Tiska, jadi
 * tidak perlu dipotong dari A4. Ukuran kertasnya diatur halaman cetaknya
 * (`@page`); lembar ini setinggi kertasnya supaya layar = hasil cetak.
 * Gaya buku kwitansi: isian di atas garis titik-titik, terbilang berlatar,
 * kotak "Rp" di kiri bawah, tanda tangan di kanan bawah. Aksen emas logo Tiska.
 */

/**
 * Tepi lembar. HP DeskJet 2130 kantor tidak bisa mencetak ±14,5 mm di ujung kertas yang keluar terakhir; kertas A5
 * masuk berdiri, jadi ujung itu jatuh di sisi KIRI kwitansi (uji cetak 12 Nov: label kiri terpotong ±14 mm). Karena
 * itu tepi kiri 18 mm dan tanpa bingkai (bingkai sisi kirinya pasti hilang). Di A4 isi 2, ujung itu jatuh di BAWAH
 * kwitansi kedua — halaman A4 memberi `tepi` sendiri.
 */
export const TEPI_A5 = "pl-[18mm] pr-[12mm] pt-[10mm] pb-[9mm]";

export function KwitansiCetak({
  isi,
  tepi = TEPI_A5,
  tinggi = "min-h-[148mm]",
  rapat = false,
  cap = false,
  areaMeterai = false,
}: {
  isi: IsiKwitansi;
  /** Cap digital logo TISKA (landscape, file resmi utuh) menimpa sebagian tanda tangan. */
  cap?: boolean;
  /** Tampilkan kotak bantu "Area e-meterai" (layar saja) — kwitansi wajib meterai yang belum diberi. */
  areaMeterai?: boolean;
  tepi?: string;
  tinggi?: string;
  /** Baris lebih rapat — untuk A4 isi 2 yang kwitansi bawahnya kehilangan 14,5 mm. */
  rapat?: boolean;
}) {
  const baris = (label: string, nilai: React.ReactNode) => (
    <div
      className={`grid grid-cols-[34mm_minmax(0,1fr)] items-baseline gap-x-3 border-b border-[#c9bfa8] ${rapat ? "py-[2mm]" : "py-[3.1mm]"}`}
    >
      <span className="text-[11.5px] text-[#585b6c]">{label}</span>
      <div>{nilai}</div>
    </div>
  );
  return (
    <div className={`relative flex ${tinggi} flex-col max-sm:min-w-[210mm] ${tepi} text-[13.5px] leading-snug text-[#1c1f2e]`}>

      {/* Kolom kop = kolom isian di bawahnya: nama PT rata kiri dengan "Sudah terima dari" dst. */}
      <header className="grid grid-cols-[34mm_minmax(0,1fr)_auto] items-center gap-x-3 border-b-[1.5px] pb-[3mm]" style={{ borderColor: EMAS }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {isi.perusahaan.logo ? <img src={isi.perusahaan.logo} alt={isi.perusahaan.nama} className="h-[14mm] w-auto max-w-full object-contain object-left" /> : null}
        </div>
        <span className="text-[15px] font-semibold tracking-wide text-[#1f2a5c]">{isi.perusahaan.nama}</span>
        <div className="self-end text-right">
          <div className="text-[30px] leading-none font-bold tracking-tight text-[#1f2a5c]">Kwitansi</div>
          <div className="mt-1.5 text-[11.5px] tabular-nums text-[#585b6c]">
            No. <span className="font-semibold text-[#1c1f2e]">{isi.nomor}</span>
          </div>
        </div>
      </header>

      <div className="mt-[2mm]">
        {baris("Sudah terima dari", <span className="text-[17px] font-bold">{isi.dari}</span>)}
        {baris(
          "Banyaknya uang",
          <span className="block rounded-[1.5mm] bg-[#f7f3ea] px-3 py-[2mm] font-semibold italic"># {isi.terbilang} #</span>,
        )}
        {baris("Untuk pembayaran", isi.untuk)}
        {baris("Cara bayar", isi.metode)}
        {Number(isi.pph23) > 0 ? baris("Termasuk PPh 23", `${rupiah(isi.pph23)} (dipotong customer, bukti potong terlampir)`) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-6 pt-[3mm]">
        {/* Kotak jumlah gaya buku kwitansi: "Rp" | angka — sejajar tengah blok tanda tangan, tidak menggantung di pojok. */}
        <div className="flex items-stretch overflow-hidden rounded-[2.5mm] border-[1.5px] border-[#1f2a5c]">
          <span className="flex items-center bg-[#1f2a5c] px-[4mm] text-[24px] font-bold text-white">Rp</span>
          <div className="bg-[#f7f3ea] px-[5mm] py-[2.5mm]">
            <div className="text-[11px] text-[#585b6c]">Jumlah</div>
            <div className="text-[32px] leading-tight font-bold tracking-tight tabular-nums">{angka(isi.jumlah)},-</div>
          </div>
        </div>
        <div className="relative w-[60mm] text-center">
          {areaMeterai ? <AreaMeterai className="top-[5mm] right-[calc(100%+6mm)]" /> : null}
          <div>Bogor, {format(isi.tanggal, "d MMMM yyyy", { locale: localeId })}</div>
          {/* Kotak "Materai" sengaja tidak digambar (permintaan Rama 12 Nov): e-meterai dibubuhkan di portal,
              meterai tempel ditempel di sisi kiri tanda tangan tanpa perlu kotak. */}
          <div className="relative mt-1 flex h-[21mm] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {isi.penandatangan.tautan ? <img src={isi.penandatangan.tautan} alt="" className="h-[19mm] w-auto mix-blend-multiply" /> : null}
            {cap ? <CapTiska /> : null}
          </div>
          <div className="border-t border-[#1c1f2e] pt-1 font-semibold">{isi.penandatangan.nama ?? " "}</div>
          <div className="text-[10.5px] text-[#585b6c]">{isi.perusahaan.nama}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cap digital: logo TISKA landscape resmi (utuh, tidak dirakit), sedikit miring & menimpa sisi kiri tanda tangan seperti
 * cap basah. Di ATAS tanda tangan dengan multiply: gambar tanda tangan berlatar putih, jadi kalau di bawah capnya tertutup. Dipakai kwitansi polos & blanko; bisa dimatikan di panel cetak (?cap=0).
 */
export function CapTiska({ className = "left-[-2mm] top-1/2" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/tiska-logo-landscape-emas-web.png"
      alt="Cap TISKA"
      className={`pointer-events-none absolute h-[14mm] w-auto -translate-y-1/2 -rotate-[6deg] opacity-90 mix-blend-multiply ${className}`}
    />
  );
}

/**
 * Kotak bantu letak meterai — HANYA di layar (tidak tercetak, tidak masuk PDF/JPG/PNG: `data-hanya-layar`).
 * Aturan (Peruri/DJP): e-meterai TIDAK boleh tertimpa tanda tangan/cap karena QR code-nya harus terbaca, jadi
 * kotak ini selalu di ruang kosong sebelah kiri blok tanda tangan, di luar jangkauan cap. Meterai tempel justru
 * harus terkena sebagian tanda tangan — ditempel di tepi kanan kotak ini, menyentuh tanda tangan.
 */
export function AreaMeterai({ className }: { className: string }) {
  return (
    <div
      data-hanya-layar
      className={`pointer-events-none absolute flex size-[24mm] flex-col items-center justify-center rounded-[1.5mm] border border-dashed border-[#c08a00] bg-[#fff8e1]/70 text-center text-[9px] leading-tight text-[#8a5a00] print:hidden ${className}`}
    >
      <b>Area e-meterai</b>
      biarkan kosong
    </div>
  );
}
