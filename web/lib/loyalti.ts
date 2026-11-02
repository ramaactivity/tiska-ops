import "server-only";

import { type AturanLoyalti, kartuLoyalti, type KartuLoyalti } from "./hitung/loyalti";
import { PESANAN_DIHITUNG } from "./ikut-menu-pesta";
import { prisma } from "./prisma";

/* Program Loyalti (D-131) — kartu stempel pembeli Ikut Menu Pesta, dihitung dari riwayat pesanan LUNAS. */

export type ProgramLoyalti = AturanLoyalti & { nama: string; hadiah: string; aktif: boolean };
export type KartuProgram = { program: ProgramLoyalti; kartu: KartuLoyalti };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function daftarProgramLoyalti(hanyaAktif = false): Promise<ProgramLoyalti[]> {
  const p = await prisma.loyalty_programs.findMany({ where: hanyaAktif ? { active: true } : {}, orderBy: [{ active: "desc" }, { id: "asc" }] });
  return p.map((x) => ({
    id: x.id.toString(),
    nama: x.name,
    hadiah: x.reward,
    aktif: x.active,
    syarat: x.stamps_needed,
    minBelanja: x.min_order_value === null ? null : Number(x.min_order_value),
    jendelaHari: x.window_days,
    berlakuHari: x.reward_valid_days,
    mulai: iso(x.starts_on),
  }));
}

/**
 * Kartu tiap customer untuk program aktif. `idCustomer` kosong = semua pembeli yang pernah pesan.
 * Pesanan dihitung bila aktif (PESANAN_DIHITUNG), invoice LUNAS, tanggal = tanggal kirim program, nilai = total invoice.
 */
export async function kartuPelanggan(hariIni: string, idCustomer?: bigint[]): Promise<Map<string, KartuProgram[]>> {
  const program = await daftarProgramLoyalti(true);
  const hasil = new Map<string, KartuProgram[]>();
  if (!program.length) return hasil;
  const filter = idCustomer ? { customer_id: { in: idCustomer } } : {};
  const [pesanan, dipakai] = await Promise.all([
    prisma.retail_orders.findMany({
      where: { ...PESANAN_DIHITUNG, ...filter, invoices: { status: "paid" } },
      select: { id: true, customer_id: true, invoices: { select: { grand_total: true } }, retail_programs: { select: { delivery_date: true } } },
    }),
    prisma.loyalty_redemptions.findMany({ where: filter, select: { reward_key: true } }),
  ]);
  const kunciDipakai = new Set(dipakai.map((d) => d.reward_key));
  const per = new Map<string, { id: string; tanggal: string; nilai: number }[]>();
  for (const o of pesanan) {
    const k = o.customer_id.toString();
    per.set(k, [...(per.get(k) ?? []), { id: o.id.toString(), tanggal: iso(o.retail_programs.delivery_date), nilai: Number(o.invoices?.grand_total ?? 0) }]);
  }
  for (const id of idCustomer?.map(String) ?? []) if (!per.has(id)) per.set(id, []);
  for (const [k, daftar] of per) hasil.set(k, program.map((p) => ({ program: p, kartu: kartuLoyalti(p, daftar, kunciDipakai, hariIni) })));
  return hasil;
}
