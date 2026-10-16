import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   KEBUTUHAN BAHAN dari event (09-PURCHASING, D-057). Murni. Tanpa harga.

   Per menu: takaran per porsi = qty_per_batch ÷ porsi_per_batch × faktor
   porsi menu; dikali porsi yang dipesan, lalu dijumlah per bahan.
   ========================================================================== */

export type ResepKebutuhan = {
  porsiPerBatch: NilaiUang | null;
  baris: { idBahan: string; nama: string; satuan: string | null; qtyPerBatch: NilaiUang; perKemasan: NilaiUang | null; satuanBeli: string | null; pengganti: boolean }[];
};

export type PesananMenu = { menu: string; porsi: number; faktor: NilaiUang; resep: ResepKebutuhan | null };

export type BarisKebutuhan = {
  idBahan: string;
  nama: string;
  satuan: string | null;
  qty: Decimal;
  kemasan: Decimal | null;
  satuanBeli: string | null;
  pengganti: boolean;
  menu: string[];
};

export function hitungKebutuhan(pesanan: PesananMenu[]): { bahan: BarisKebutuhan[]; tanpaResep: { menu: string; porsi: number }[] } {
  const peta = new Map<string, { baris: BarisKebutuhan; perKemasan: NilaiUang | null }>();
  const tanpaResep = new Map<string, number>();
  for (const p of pesanan) {
    const porsiBatch = p.resep?.porsiPerBatch ? d(p.resep.porsiPerBatch) : null;
    if (!p.resep || !porsiBatch || porsiBatch.lte(0) || !p.resep.baris.length) {
      tanpaResep.set(p.menu, (tanpaResep.get(p.menu) ?? 0) + p.porsi);
      continue;
    }
    for (const b of p.resep.baris) {
      const qty = d(b.qtyPerBatch).dividedBy(porsiBatch).times(d(p.faktor)).times(p.porsi);
      const ada = peta.get(b.idBahan);
      if (ada) {
        ada.baris.qty = ada.baris.qty.plus(qty);
        if (!ada.baris.menu.includes(p.menu)) ada.baris.menu.push(p.menu);
        continue;
      }
      peta.set(b.idBahan, {
        perKemasan: b.perKemasan,
        baris: { idBahan: b.idBahan, nama: b.nama, satuan: b.satuan, qty, kemasan: null, satuanBeli: b.satuanBeli, pengganti: b.pengganti, menu: [p.menu] },
      });
    }
  }
  const bahan = [...peta.values()].map(({ baris, perKemasan }) => ({
    ...baris,
    qty: baris.qty.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    kemasan: perKemasan && d(perKemasan).gt(0) ? baris.qty.dividedBy(d(perKemasan)).toDecimalPlaces(2, Decimal.ROUND_UP) : null,
  }));
  bahan.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  return { bahan, tanpaResep: [...tanpaResep.entries()].map(([menu, porsi]) => ({ menu, porsi })) };
}
