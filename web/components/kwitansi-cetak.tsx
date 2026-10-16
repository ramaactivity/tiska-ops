import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import type { IsiKwitansi } from "@/lib/kwitansi";
import { rupiah } from "@/lib/uang";

/**
 * Kwitansi digital pengganti buku (06-DOKUMEN-QUOTATION §6, D-045): field
 * sama dengan buku — No, Sudah terima dari, Banyaknya uang (terbilang),
 * Untuk pembayaran, Jumlah, "Bogor, tanggal" — ditambah kotak materai bila
 * nilainya di atas batas (Angka Bisnis).
 */
export function KwitansiCetak({ isi }: { isi: IsiKwitansi }) {
  const baris = (label: string, nilai: React.ReactNode) => (
    <tr className="align-top">
      <td className="w-44 py-2 pr-3 font-semibold whitespace-nowrap">{label}</td>
      <td className="w-3 py-2">:</td>
      <td className="py-2">{nilai}</td>
    </tr>
  );
  return (
    <div className="text-[13px] leading-relaxed">
      <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {isi.perusahaan.logo ? <img src={isi.perusahaan.logo} alt={isi.perusahaan.nama} className="h-12 w-auto" /> : null}
          <span className="font-semibold">{isi.perusahaan.nama}</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-wide">KWITANSI</div>
          <div className="text-xs">
            No. <b>{isi.nomor}</b>
          </div>
        </div>
      </div>

      <table className="mt-4 w-full">
        <tbody>
          {baris("Sudah terima dari", <b>{isi.dari}</b>)}
          {baris(
            "Banyaknya uang",
            <span className="block border border-[#999] bg-[#f3f3f3] px-3 py-1.5 font-semibold italic"># {isi.terbilang} #</span>,
          )}
          {baris("Untuk pembayaran", isi.untuk)}
          {baris("Cara bayar", isi.metode)}
          {Number(isi.pph23) > 0 ? baris("Termasuk PPh 23", `${rupiah(isi.pph23)} (dipotong customer, bukti potong terlampir)`) : null}
        </tbody>
      </table>

      <div className="mt-6 flex items-end justify-between gap-6">
        <div className="border-2 border-black px-4 py-2 text-xl font-bold tabular-nums">Jumlah {rupiah(isi.jumlah)}</div>
        <div className="w-56 text-center">
          <div>Bogor, {format(isi.tanggal, "d MMMM yyyy", { locale: localeId })}</div>
          <div className="relative mt-1 flex h-24 items-center justify-center">
            {isi.perlu_materai ? (
              <div className="absolute left-0 flex h-16 w-16 items-center justify-center border border-dashed border-[#999] text-[9px] leading-tight text-[#777]">
                Materai
                <br />
                {rupiah(isi.nilai_materai)}
              </div>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {isi.penandatangan.tautan ? <img src={isi.penandatangan.tautan} alt="" className="h-20 w-auto" /> : null}
          </div>
          <div className="border-t border-black pt-1 font-semibold">{isi.penandatangan.nama ?? " "}</div>
          <div className="text-xs">{isi.perusahaan.nama}</div>
        </div>
      </div>
    </div>
  );
}
