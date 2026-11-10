import "server-only";

import { JENIS_MUTASI, satuanStok } from "./hitung/stok";
import { kartuMutasi, rekapMutasi } from "./hitung/mutasi";
import { hariIniWib } from "./kalender";
import { prisma } from "./prisma";

/* Laporan mutasi stok (D-148) — dipakai halaman & unduhan Excel. Tanpa harga. */

const tglSah = (t: unknown): t is string => typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t);
const teks = (t: Date) => t.toISOString().slice(0, 10);

/** Periode dari alamat halaman; bawaan = bulan berjalan (WIB). */
export function bacaPeriode(p: Record<string, string | string[] | undefined>): { dari: string; sampai: string; bahan: string | null } {
  const hari = hariIniWib();
  const dari = tglSah(p.dari) ? p.dari : `${hari.slice(0, 8)}01`;
  const sampai = tglSah(p.sampai) && p.sampai >= dari ? p.sampai : hari >= dari ? hari : dari;
  const bahan = typeof p.bahan === "string" && /^\d+$/.test(p.bahan) ? p.bahan : null;
  return { dari, sampai, bahan };
}

/** Mutasi keseluruhan: satu baris per bahan yang punya saldo/pergerakan. */
export async function mutasiKeseluruhan(dari: string, sampai: string) {
  // ponytail: membaca semua mutasi s/d tanggal akhir; ganti ke SUM per bahan di SQL bila barisnya sudah puluhan ribu.
  const mutasi = await prisma.stock_movements.findMany({
    where: { moved_at: { lte: new Date(`${sampai}T00:00:00Z`) } },
    select: { id: true, ingredient_id: true, moved_at: true, qty: true },
  });
  const rekap = rekapMutasi(
    mutasi.map((m) => ({ id: m.id.toString(), idBahan: m.ingredient_id.toString(), tanggal: teks(m.moved_at), qty: m.qty })),
    dari,
    sampai,
  );
  const bahan = new Map(
    (
      await prisma.ingredients.findMany({
        where: { id: { in: rekap.map((r) => BigInt(r.idBahan)) } },
        select: { id: true, code: true, name: true, category: true, usage_unit: true, purchase_unit: true },
      })
    ).map((b) => [b.id.toString(), b]),
  );
  return rekap
    .map((r) => {
      const b = bahan.get(r.idBahan);
      return { ...r, kode: b?.code ?? "", nama: b?.name ?? "(bahan terhapus)", kategori: b?.category ?? "", satuan: b ? satuanStok(b) : null };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

/** Mutasi per bahan: riwayat periode + saldo berjalan. */
export async function mutasiPerBahan(idBahan: string, dari: string, sampai: string) {
  const b = await prisma.ingredients.findUnique({
    where: { id: BigInt(idBahan) },
    select: { id: true, code: true, name: true, category: true, usage_unit: true, purchase_unit: true },
  });
  if (!b) return null;
  const mutasi = await prisma.stock_movements.findMany({
    where: { ingredient_id: b.id, moved_at: { lte: new Date(`${sampai}T00:00:00Z`) } },
    select: {
      id: true,
      kind: true,
      moved_at: true,
      qty: true,
      note: true,
      users: { select: { name: true } },
      events: { select: { name: true } },
      purchase_items: { select: { purchases: { select: { purchase_number: true, shop_name: true } } } },
    },
  });
  const kartu = kartuMutasi(
    mutasi.map((m) => ({
      id: m.id.toString(),
      idBahan: idBahan,
      tanggal: teks(m.moved_at),
      qty: m.qty,
      jenis: JENIS_MUTASI[m.kind] ?? m.kind,
      keterangan: [
        m.purchase_items ? [m.purchase_items.purchases.purchase_number, m.purchase_items.purchases.shop_name].filter(Boolean).join(" · ") : null,
        m.events?.name,
        m.note,
        m.users?.name,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    dari,
    sampai,
  );
  return { bahan: { ...b, satuan: satuanStok(b) }, ...kartu };
}
