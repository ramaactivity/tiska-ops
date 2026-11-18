import { uraikanRupiah } from "./uang";

/* ==========================================================================
   SEWA ALAT DI FORM DOKUMEN (D-209, D-211)

   Pajak: sewa alat tidak kena PBJT & layanan. PPN 11% "harusnya dikenakan,
   tapi Mbak Ari masih belum mau — dikasih pilihan aja seperti PB1" (Mas Reza,
   18 Nov 2026): satu saklar per dokumen untuk semua baris alat, bawaannya
   MATI (praktik invoice selama ini: sewa alat tanpa pajak).
   ========================================================================== */

export const BAWAAN_PPN_ALAT = false;

/** Centang pajak semua baris alat menurut saklar PPN dokumen. */
export const centangPajakAlat = (ppn: boolean) => ({ charge_ppn: ppn, charge_pb1: false, charge_service: false });

/**
 * Nama baris menu yang kemungkinan alat/dekor (QUO/TC/2611/006: Skirting, Centerpiece, Set bunga rangkai; invoice: gelas
 * goblet, sewa meja stall, piring disposable). Diuji ke semua menu dapur & baris dokumen 18 Nov: satu-satunya salah kena
 * adalah "meja" (Parsel buah meja) — karena itu "meja" tidak dipakai.
 */
const KATA_ALAT =
  /\b(sewa|peralatan|kursi|taplak|skirting|center ?piece|chafing|goblet|disposable|napkin|placemat|pitcher|tenda|backdrop|panggung|karpet|sketsel|runner|round table|rangkai(an)?|dekor(asi)?|vas|stretch cover)\b/i;

export const tampakAlat = (nama: string) => KATA_ALAT.test(nama);

type BarisDasar = {
  qty: string;
  pax: string;
  unit: string;
  price: string;
  catatan?: string;
  package_id?: string;
  menu_id?: string;
  sesi_kunci?: string;
  jenis?: "alat";
  charge_service: boolean;
  charge_pb1: boolean;
  charge_ppn?: boolean;
  children: { item_name: string; price: string }[];
};

/** Paket & baris yang isinya berharga tidak dipindah — nilainya ada di isi, bukan di baris itu. */
export const bisaJadiAlat = (b: BarisDasar) =>
  !b.package_id && !b.children.some((a) => (uraikanRupiah(a.price)?.toNumber() ?? 0) > 0);

/**
 * Baris menu → baris Sewa alat. Nilai baris tetap sama: Qty × Pax digabung jadi Qty (Pax kosong/0 = 1, seperti
 * paksBaris), isi yang dipakai sebagai keterangan ("2 Meja (uk …)") jadi catatan di bawah alat, satuan pax/porsi
 * dikosongkan. Pajak ikut saklar PPN alat dokumen.
 */
export function jadikanAlat<T extends BarisDasar>(b: T, ppn: boolean): T {
  const qty = uraikanRupiah(b.qty);
  const pax = uraikanRupiah(b.pax);
  const kali = pax && !pax.isZero() ? pax : null;
  const jumlah = qty === null ? "" : (kali ? qty.times(kali) : qty).toNumber().toLocaleString("id-ID");
  const isi = b.children.map((a) => a.item_name.trim()).filter(Boolean);
  return {
    ...b,
    jenis: "alat",
    qty: jumlah,
    pax: "",
    unit: /^(pax|porsi|orang)$/i.test(b.unit.trim()) ? "" : b.unit,
    catatan: [b.catatan?.trim(), ...isi].filter(Boolean).join("\n"),
    children: [],
    package_id: undefined,
    menu_id: undefined,
    sesi_kunci: undefined,
    ...centangPajakAlat(ppn),
  };
}
