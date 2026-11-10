import "server-only";

import { type AturanLoyalti, type JenisHadiah, type JenisProgram, kartuLoyalti, type KartuLoyalti, memenuhi } from "./hitung/loyalti";
import { PESANAN_DIHITUNG } from "./ikut-menu-pesta";
import { prisma } from "./prisma";

/* Program Loyalti (D-131, S&K D-134) — kartu stempel & bonus tiap pesanan pembeli Ikut Menu Pesta. */

export type ProgramLoyalti = AturanLoyalti & {
  nama: string;
  hadiah: string;
  aktif: boolean;
  jenis: JenisProgram;
  jenisHadiah: JenisHadiah;
  /** Jumlah pax gratis (jenisHadiah "gratis_pax"). */
  jumlahHadiah: number | null;
  /** Pilihan bonus, mis. Lemon tea / Lychee ice tea / Teh sereh. */
  pilihan: string[];
  bolehGabung: boolean;
  sk: string | null;
};
export type KartuProgram = { program: ProgramLoyalti; kartu: KartuLoyalti };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function daftarProgramLoyalti(hanyaAktif = false): Promise<ProgramLoyalti[]> {
  const p = await prisma.loyalty_programs.findMany({ where: hanyaAktif ? { active: true } : {}, orderBy: [{ active: "desc" }, { id: "asc" }] });
  return p.map((x) => ({
    id: x.id.toString(),
    nama: x.name,
    hadiah: x.reward,
    aktif: x.active,
    jenis: x.kind as JenisProgram,
    syarat: x.stamps_needed,
    minBelanja: x.min_order_value === null ? null : Number(x.min_order_value),
    minPax: x.min_pax,
    jendelaHari: x.window_days,
    berlakuHari: x.reward_valid_days,
    mulai: iso(x.starts_on),
    jenisHadiah: x.reward_type as JenisHadiah,
    jumlahHadiah: x.reward_qty,
    pilihan: x.reward_options,
    bolehGabung: x.stackable,
    sk: x.terms,
  }));
}

type PesananDasar = { id: string; tanggal: string; nilai: number; pax: number };

/**
 * Invoice lama yang ditandai admin sebagai pesanan Ikut Menu Pesta (permintaan Rama 10 Nov 2026): pesanan sebelum
 * programnya ada di Tiska Ops. Lunas, bukan invoice milik pesanan Ikut Menu Pesta (tidak terhitung dua kali).
 * Id pesanannya diberi awalan supaya tidak bertabrakan dengan id retail_orders di kunci hadiah.
 */
export const AWALAN_INVOICE_LAMA = "inv";
const INVOICE_LAMA_DIHITUNG = { loyalty_pax: { not: null }, status: "paid", retail_orders: { none: {} } } as const;
const keDasar = (o: { id: bigint; invoices: { grand_total: unknown } | null; retail_programs: { delivery_date: Date }; retail_order_items: { pax: number }[] }): PesananDasar => ({
  id: o.id.toString(),
  tanggal: iso(o.retail_programs.delivery_date),
  nilai: Number(o.invoices?.grand_total ?? 0),
  pax: o.retail_order_items.reduce((n, i) => n + i.pax, 0),
});
const pilihPesanan = { id: true, customer_id: true, invoices: { select: { grand_total: true } }, retail_programs: { select: { delivery_date: true } }, retail_order_items: { select: { pax: true } } } as const;

/**
 * Kartu stempel tiap customer untuk program "stempel" aktif. `idCustomer` kosong = semua pembeli.
 * Pesanan dihitung bila aktif (PESANAN_DIHITUNG), invoice LUNAS, tanggal = tanggal kirim program, nilai = total invoice.
 */
export async function kartuPelanggan(hariIni: string, idCustomer?: bigint[]): Promise<Map<string, KartuProgram[]>> {
  const program = (await daftarProgramLoyalti(true)).filter((p) => p.jenis === "stempel");
  const hasil = new Map<string, KartuProgram[]>();
  if (!program.length) return hasil;
  const filter = idCustomer ? { customer_id: { in: idCustomer } } : {};
  const [pesanan, lama, dipakai] = await Promise.all([
    prisma.retail_orders.findMany({ where: { ...PESANAN_DIHITUNG, ...filter, invoices: { status: "paid" } }, select: pilihPesanan }),
    prisma.invoices.findMany({ where: { ...INVOICE_LAMA_DIHITUNG, ...filter }, select: { id: true, customer_id: true, event_date: true, invoice_date: true, grand_total: true, loyalty_pax: true } }),
    prisma.loyalty_redemptions.findMany({ where: filter, select: { reward_key: true } }),
  ]);
  const kunciDipakai = new Set(dipakai.map((d) => d.reward_key));
  const per = new Map<string, PesananDasar[]>();
  const tambah = (k: string, p: PesananDasar) => per.set(k, [...(per.get(k) ?? []), p]);
  for (const o of pesanan) tambah(o.customer_id.toString(), keDasar(o));
  for (const i of lama)
    tambah(i.customer_id.toString(), { id: `${AWALAN_INVOICE_LAMA}${i.id}`, tanggal: iso(i.event_date ?? i.invoice_date), nilai: Number(i.grand_total), pax: i.loyalty_pax ?? 0 });
  for (const id of idCustomer?.map(String) ?? []) if (!per.has(id)) per.set(id, []);
  for (const [k, daftar] of per) hasil.set(k, program.map((p) => ({ program: p, kartu: kartuLoyalti(p, daftar, kunciDipakai, hariIni) })));
  return hasil;
}

/**
 * Bonus otomatis tiap pesanan (program "tiap_pesanan", mis. sampel minuman) + hadiah loyalti yang dipakai di pesanan
 * itu — untuk chip pesanan, halaman pembeli, dan rekap tambahan dapur.
 */
export async function tambahanPesanan(idPesanan: bigint[]): Promise<Map<string, { teks: string; jenis: "bonus" | "hadiah" }[]>> {
  const hasil = new Map<string, { teks: string; jenis: "bonus" | "hadiah" }[]>();
  if (!idPesanan.length) return hasil;
  const [program, pesanan, pakai] = await Promise.all([
    daftarProgramLoyalti(true).then((p) => p.filter((x) => x.jenis === "tiap_pesanan")),
    prisma.retail_orders.findMany({ where: { ...PESANAN_DIHITUNG, id: { in: idPesanan } }, select: pilihPesanan }),
    prisma.loyalty_redemptions.findMany({ where: { retail_order_id: { in: idPesanan } }, select: { retail_order_id: true, reward: true, choice: true } }),
  ]);
  const tambah = (k: string, x: { teks: string; jenis: "bonus" | "hadiah" }) => hasil.set(k, [...(hasil.get(k) ?? []), x]);
  for (const o of pesanan) for (const p of program) if (memenuhi(p, keDasar(o))) tambah(o.id.toString(), { teks: p.hadiah, jenis: "bonus" });
  for (const r of pakai) tambah(r.retail_order_id!.toString(), { teks: `${r.reward}${r.choice ? ` — ${r.choice}` : ""}`, jenis: "hadiah" });
  return hasil;
}
