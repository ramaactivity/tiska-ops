import { keteranganRincian } from "@/lib/baris-cetak";
import { namaIsiBersih } from "@/lib/hitung/urutan-isi";

type Rincian = { id: bigint; item_name: string; qty: { toString(): string }; unit: string | null; pax: number | null };

/**
 * Isi paket di tabel detail quotation & invoice (D-174). Dulu dijejalkan di
 * kolom Deskripsi yang sempit sehingga 11 menu memakan ~25 baris, sementara
 * ruang di bawah Day/Qty/Harga kosong. Sekarang satu baris tabel sendiri
 * selebar Deskripsi→Total, mengalir ke kolom-kolom ala koran: jumlah kolom
 * mengikuti lebar yang tersedia (lebar kolom 15rem), jadi di HP satu kolom.
 */
export function BarisIsiPaket({ rincian, rentang }: { rincian: Rincian[]; rentang: number }) {
  if (!rincian.length) return null;
  return (
    <tr className="border-b last:border-0">
      <td />
      <td colSpan={rentang} className="px-4 pt-0 pb-4">
        <ol className="columns-[15rem] gap-x-10 rounded-2xl bg-muted/45 px-4 py-3 text-[0.8125rem] leading-snug text-muted-foreground">
          {rincian.map((a, k) => {
            // Keterangan jumlah dirangkai dengan aturan yang sama dengan dokumen cetaknya (D-106).
            const ket = keteranganRincian(
              Number(a.qty) > 0 ? Number(a.qty).toLocaleString("id-ID") : "",
              a.unit ?? "",
              a.pax && a.pax > 0 ? Number(a.pax).toLocaleString("id-ID") : "",
            );
            return (
              <li key={a.id.toString()} className="flex break-inside-avoid gap-2 py-1">
                <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-subtle-foreground">{k + 1}</span>
                <span className="min-w-0">
                  {namaIsiBersih(a.item_name)}
                  {ket ? <span className="ml-1">({ket})</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </td>
    </tr>
  );
}
