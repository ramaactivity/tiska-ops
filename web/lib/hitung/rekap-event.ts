import { Decimal } from "decimal.js";

import { bulatkanRupiah, d, type NilaiUang } from "../uang";

/* ==========================================================================
   REKAP EVENT (01-SPEC I, D-092). Murni.

   Biaya nyata event dari data operasional:
     bahan  = nota/penerimaan yang tertaut PR berisi event ini; PR untuk
              beberapa event dibagi rata (ditandai di layar)
     honor  = fee tim & DW yang sudah dikunci / dibayar
     sewa   = biaya sewa alat dari vendor
   Ditulis ke invoice_costs (source 'rekap_event') supaya laporan Margin yang
   ada membaca angka yang sama.
   ========================================================================== */

export type NotaRekap = { total: NilaiUang; jumlahEvent: number };

/** Bagian event ini dari nota-nota PR (dibagi rata bila satu PR untuk beberapa event). */
export function alokasiBelanja(nota: NotaRekap[]): Decimal {
  return nota.reduce((s, n) => s.plus(bulatkanRupiah(d(n.total).dividedBy(Math.max(1, n.jumlahEvent)))), new Decimal(0));
}

export type BiayaRekap = { category: "hpp_bahan_baku" | "tenaga_kerja" | "sewa_peralatan"; description: string; amount: Decimal };

export function barisBiayaRekap(x: { bahan: NilaiUang; honor: NilaiUang; sewa: NilaiUang }): BiayaRekap[] {
  const baris: BiayaRekap[] = [
    { category: "hpp_bahan_baku", description: "Bahan baku nyata (nota & penerimaan PR) — rekap event", amount: bulatkanRupiah(x.bahan) },
    { category: "tenaga_kerja", description: "Honor tim & DW — rekap event", amount: bulatkanRupiah(x.honor) },
    { category: "sewa_peralatan", description: "Sewa alat vendor — rekap event", amount: bulatkanRupiah(x.sewa) },
  ];
  return baris.filter((b) => b.amount.gt(0));
}

export const LABEL_REKAP = { diajukan: "Diajukan", disetujui: "Disetujui — masuk Margin", dikunci: "Dikunci" } as const;
export type StatusRekap = keyof typeof LABEL_REKAP;
