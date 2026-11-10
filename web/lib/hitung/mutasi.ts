import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   LAPORAN MUTASI STOK (D-148). Murni.

   Saldo awal = semua mutasi sebelum tanggal mulai. Masuk = mutasi plus di
   periode (nota/PO, koreksi tambah, opname naik); Keluar = mutasi minus di
   periode (pemakaian event, barang keluar, waste, koreksi kurang, opname
   turun). Saldo akhir = awal + masuk − keluar = jumlah semua mutasi s/d akhir.
   Tanggal dibandingkan sebagai teks YYYY-MM-DD (kalender WIB, tanpa jam).
   ========================================================================== */

export type MutasiMentah = { id: string; idBahan: string; tanggal: string; qty: NilaiUang };
export type RekapMutasi = { idBahan: string; awal: Decimal; masuk: Decimal; keluar: Decimal; akhir: Decimal };

/** Rekap per bahan untuk periode [dari, sampai] — hanya bahan yang punya saldo atau pergerakan. */
export function rekapMutasi(mutasi: MutasiMentah[], dari: string, sampai: string): RekapMutasi[] {
  const per = new Map<string, RekapMutasi>();
  for (const m of mutasi) {
    if (m.tanggal > sampai) continue;
    const r = per.get(m.idBahan) ?? { idBahan: m.idBahan, awal: new Decimal(0), masuk: new Decimal(0), keluar: new Decimal(0), akhir: new Decimal(0) };
    const q = d(m.qty);
    if (m.tanggal < dari) r.awal = r.awal.plus(q);
    else if (q.gt(0)) r.masuk = r.masuk.plus(q);
    else r.keluar = r.keluar.plus(q.abs());
    r.akhir = r.akhir.plus(q);
    per.set(m.idBahan, r);
  }
  return [...per.values()].filter((r) => !r.awal.isZero() || !r.masuk.isZero() || !r.keluar.isZero());
}

export type BarisKartu<T> = T & { saldo: Decimal };

/** Kartu stok satu bahan di periode: baris berurutan + saldo berjalan mulai dari saldo awal. */
export function kartuMutasi<T extends MutasiMentah>(mutasi: T[], dari: string, sampai: string): { awal: Decimal; baris: BarisKartu<T>[]; akhir: Decimal } {
  const urut = [...mutasi].sort((a, b) => (a.tanggal === b.tanggal ? Number(a.id) - Number(b.id) : a.tanggal < b.tanggal ? -1 : 1));
  const awal = urut.filter((m) => m.tanggal < dari).reduce((s, m) => s.plus(d(m.qty)), new Decimal(0));
  let saldo = awal;
  const baris = urut
    .filter((m) => m.tanggal >= dari && m.tanggal <= sampai)
    .map((m) => {
      saldo = saldo.plus(d(m.qty));
      return { ...m, saldo };
    });
  return { awal, baris, akhir: saldo };
}
