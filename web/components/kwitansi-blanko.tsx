import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import type { IsiKwitansi } from "@/lib/kwitansi";
import { angka, rupiah } from "@/lib/uang";

/**
 * Mengisi blanko kwitansi Tiska yang sudah tercetak (permintaan atasan 12 Nov 2026): printer hanya mencetak isiannya.
 *
 * Posisi garis blanko diukur dari foto blanko asli (lebar 210 mm, tinggi ±144 mm), dalam mm dari pojok kiri atas
 * kertas. SATU tabel untuk dua hal: isian yang tercetak, dan gambar blanko tipis di layar (tidak ikut tercetak)
 * supaya terlihat apakah isiannya jatuh di garis. Selisih printer/kertas disetel pengguna lewat `--geser-x/--geser-y`
 * (tombol geser di halaman cetak, diingat per komputer) — ukuran dari foto tidak akan presisi sempurna.
 *
 * Isian dimulai ≥ 20 mm dari kiri: HP DeskJet 2130 tidak mencetak ±14,5 mm di sisi kiri lembar (lihat kwitansi-cetak).
 */
const G = {
  no: { x: 167, kanan: 196, garis: 34.6 },
  dari: { x: 54, kanan: 196, garis: 47.9 },
  uang: { x: 56, kanan: 196, atas: 58.4, bawah: 68.9 },
  untuk: { x: 54, kanan: 196, garis: [78.4, 88, 97.5] },
  bogor: { x: 151, kanan: 196, garis: 108.2 },
  jumlah: { x: 13.5, kanan: 108, atas: 124.8, bawah: 135.1 },
} as const;

const mm = (n: number) => `${n}mm`;

/** Teks yang duduk di atas garis (bawah teks 1,2 mm di atas garis). */
function DiGaris({ x, kanan, garis, children, className = "", potong = true }: { x: number; kanan: number; garis: number; children: React.ReactNode; className?: string; potong?: boolean }) {
  return (
    <div className={`absolute leading-none ${potong ? "truncate" : "whitespace-nowrap"} ${className}`} style={{ left: mm(x), width: mm(kanan - x), bottom: `calc(100% - ${mm(garis - 1.2)})` }}>
      {children}
    </div>
  );
}

/** Gambar blanko di layar saja — membantu melihat letak isian. */
function GambarBlanko() {
  const garis = (x: number, kanan: number, y: number) => (
    <div key={`${x}-${y}`} className="absolute border-t border-[#b9bccb]" style={{ left: mm(x), width: mm(kanan - x), top: mm(y) }} />
  );
  const label = (teks: string, x: number, y: number, kelas = "") => (
    <div key={teks} className={`absolute leading-none text-[#a3a7b8] ${kelas}`} style={{ left: mm(x), top: mm(y) }}>
      {teks}
    </div>
  );
  return (
    <div className="pointer-events-none absolute inset-0 print:hidden" aria-hidden>
      {label("TISKA · catering service", 14, 11, "text-[15px] font-semibold tracking-wide")}
      {label("Kwitansi", 150, 12, "text-[26px] italic")}
      {label("No :", 160, 31.5, "text-[11px]")}
      {garis(G.no.x, G.no.kanan, G.no.garis)}
      {label("Sudah Terima Dari", 15, 45, "text-[12px]")}
      {garis(G.dari.x, G.dari.kanan, G.dari.garis)}
      {label("Banyaknya Uang", 15, 62, "text-[12px]")}
      <div className="absolute border-y-[6px] border-double border-[#d6d8e2]" style={{ left: mm(G.uang.x - 2), width: mm(G.uang.kanan - G.uang.x + 2), top: mm(G.uang.atas), height: mm(G.uang.bawah - G.uang.atas) }} />
      {label("Untuk Pembayaran", 15, 76, "text-[12px]")}
      {G.untuk.garis.map((y) => garis(G.untuk.x, G.untuk.kanan, y))}
      {label("Bogor,", 137, 105.5, "text-[12px]")}
      {garis(G.bogor.x, G.bogor.kanan, G.bogor.garis)}
      {label("JUMLAH (Rp)", 14, 119.5, "text-[12px]")}
      <div className="absolute border-y-[6px] border-double border-[#d6d8e2]" style={{ left: mm(G.jumlah.x), width: mm(G.jumlah.kanan - G.jumlah.x), top: mm(G.jumlah.atas), height: mm(G.jumlah.bawah - G.jumlah.atas) }} />
    </div>
  );
}

export function KwitansiBlanko({ isi, ttdDigital }: { isi: IsiKwitansi; ttdDigital: boolean }) {
  const pph = Number(isi.pph23) > 0 ? `Termasuk PPh 23 ${rupiah(isi.pph23)} (dipotong customer)` : null;
  // Baris kedua "Untuk Pembayaran" = cara bayar; baris ketiga = PPh 23 bila ada (blanko tidak punya kolomnya).
  const untuk = [isi.untuk, isi.metode, pph].filter(Boolean) as string[];
  return (
    <div className="relative h-[148mm] overflow-hidden text-[14px] text-[#14182b] max-sm:min-w-[210mm]">
      <GambarBlanko />
      <div className="absolute inset-0" style={{ transform: "translate(var(--geser-x, 0mm), var(--geser-y, 0mm))" }}>
        {/* Garis "No :" di blanko pendek — nomor boleh melewati ujung garis, tidak dipotong. */}
        <DiGaris {...G.no} potong={false} className="text-[12.5px] font-semibold">
          {isi.nomor}
        </DiGaris>
        <DiGaris {...G.dari} className="text-[15px] font-bold">{isi.dari}</DiGaris>
        <div
          className="absolute flex items-center text-[13px] leading-snug font-semibold italic"
          style={{ left: mm(G.uang.x), width: mm(G.uang.kanan - G.uang.x), top: mm(G.uang.atas), height: mm(G.uang.bawah - G.uang.atas) }}
        >
          <span className="line-clamp-2 bg-white/85 px-1"># {isi.terbilang} #</span>
        </div>
        {untuk.slice(0, 3).map((t, i) => (
          <DiGaris key={i} x={G.untuk.x} kanan={G.untuk.kanan} garis={G.untuk.garis[i]}>
            {t}
          </DiGaris>
        ))}
        <DiGaris {...G.bogor}>{format(isi.tanggal, "d MMMM yyyy", { locale: localeId })}</DiGaris>
        {/* Tanda tangan di bawah "Bogor,": gambar digital, atau ruang kosong untuk tanda tangan basah. */}
        <div className="absolute flex flex-col items-center" style={{ left: mm(G.bogor.x - 6), width: mm(G.bogor.kanan - G.bogor.x + 6), top: mm(G.bogor.garis + 1.5) }}>
          <div className="flex h-[22mm] items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {ttdDigital && isi.penandatangan.tautan ? <img src={isi.penandatangan.tautan} alt="" className="h-[20mm] w-auto" /> : null}
          </div>
          <div className="w-full border-t border-[#14182b] pt-0.5 text-center text-[12.5px] font-semibold">{isi.penandatangan.nama ?? " "}</div>
        </div>
        {/* Angka mulai 20 mm dari kiri — sisi kiri 14,5 mm tidak tercetak printer kantor. */}
        <div
          className="absolute flex items-center text-[26px] font-bold tracking-tight tabular-nums"
          style={{ left: mm(20), width: mm(G.jumlah.kanan - 20), top: mm(G.jumlah.atas), height: mm(G.jumlah.bawah - G.jumlah.atas) }}
        >
          <span className="bg-white/85 px-1.5">{angka(isi.jumlah)},-</span>
        </div>
      </div>
    </div>
  );
}
