import "server-only";

import type { Sesi } from "./auth";
import { saringMirip } from "./cari-mirip";
import { KATEGORI_ASET, type KategoriAset } from "./hitung/aset";
import { KATEGORI_VENDOR, type KategoriVendor, JENIS_REKANAN, type JenisRekanan } from "./hitung/rekanan";
import { bacaIzin } from "./izin";
import { bolehBuka, type KunciMenu } from "./navigasi";
import { bolehLihatBiaya } from "./peran";
import { prisma } from "./prisma";
import { hanyaMiliknya } from "./rbac";
import { rupiah } from "./uang";

/* ==========================================================================
   CARI CEPAT (D-135) — satu kotak untuk semua data: dokumen, master, harga.
   Dipakai halaman /cari DAN alat "cari_data" Tanya Tiska, jadi hak aksesnya
   sama: kelompok hanya muncul bila menunya boleh dibuka, sales hanya melihat
   dokumen buatannya sendiri, harga beli bahan hanya untuk yang boleh melihat biaya.
   ========================================================================== */

export type HasilCari = { judul: string; sub?: string; nilai?: string; href: string };
export type KelompokCari = { kunci: string; label: string; hasil: HasilCari[] };

const BATAS = 8;
const tgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const t = (d: Date | null | undefined) => (d ? tgl.format(d) : null);
const gabung = (...x: (string | null | undefined | false)[]) => x.filter(Boolean).join(" · ");
const STATUS_INVOICE: Record<string, string> = { unpaid: "Belum dibayar", partial: "Dibayar sebagian", paid: "Lunas", overdue: "Jatuh tempo", cancelled: "Batal" };

/** Kata pengantar yang tidak ada di nama data ("harga paket lidah cabe" → "lidah cabe"); tetap dipakai bila hanya itu yang diketik. */
const KATA_PENGANTAR = new Set(["harga", "berapa", "brp", "info", "cari", "yang", "untuk", "apa", "ada", "dong", "ya", "kak", "paket", "menu", "bahan", "produk", "product", "customer", "data"]);
export function rapikanKataCari(kata: string): string {
  const asli = kata.trim().slice(0, 100);
  const inti = asli.split(/\s+/).filter((k) => !KATA_PENGANTAR.has(k.toLowerCase().replace(/[?.,!]/g, "")));
  return inti.length ? inti.join(" ").replace(/[?!]+$/, "") : asli;
}

export async function cariSemua(kata: string, sesi: Sesi): Promise<KelompokCari[]> {
  const q = rapikanKataCari(kata);
  if (q.length < 2) return [];
  const izin = await bacaIzin();
  const boleh = (k: KunciMenu) => bolehBuka(sesi.peran, k, izin);
  const milik = hanyaMiliknya(sesi);
  const ada = { contains: q, mode: "insensitive" as const };
  const biaya = bolehLihatBiaya(sesi.peran);

  const tugas: Promise<KelompokCari | null>[] = [];
  const tambah = (kunci: KunciMenu, label: string, ambil: () => Promise<HasilCari[]>) => {
    if (boleh(kunci)) tugas.push(ambil().then((hasil) => (hasil.length ? { kunci, label, hasil } : null)));
  };

  tambah("pelanggan", "Customer", async () => {
    const c = await prisma.customers.findMany({ select: { id: true, name: true, customer_code: true, phone: true, pic_name: true } });
    return saringMirip(q, c, (x) => [x.name, x.customer_code, x.phone, x.pic_name], BATAS).map((x) => ({ judul: x.name, sub: gabung(x.customer_code, x.pic_name, x.phone), href: `/pelanggan/${x.id}` }));
  });
  tambah("penawaran", "Quotation", async () => {
    const r = await prisma.quotations.findMany({
      where: { ...milik, OR: [{ quotation_number: ada }, { customers: { name: ada } }, { event_type: ada }] },
      orderBy: { id: "desc" },
      take: BATAS,
      select: { id: true, quotation_number: true, status: true, event_type: true, event_date: true, grand_total: true, customers: { select: { name: true } } },
    });
    return r.map((x) => ({ judul: `${x.quotation_number} · ${x.customers.name}`, sub: gabung(x.event_type, t(x.event_date), x.status), nilai: rupiah(x.grand_total), href: `/penawaran/${x.id}` }));
  });
  tambah("tagihan", "Invoice", async () => {
    const r = await prisma.invoices.findMany({
      where: { ...milik, OR: [{ invoice_number: ada }, { customers: { name: ada } }, { event_type: ada }] },
      orderBy: { id: "desc" },
      take: BATAS,
      select: { id: true, invoice_number: true, status: true, event_type: true, event_date: true, grand_total: true, paid_amount: true, customers: { select: { name: true } } },
    });
    return r.map((x) => ({
      judul: `${x.invoice_number} · ${x.customers.name}`,
      sub: gabung(x.event_type, t(x.event_date), STATUS_INVOICE[x.status] ?? x.status, x.status !== "paid" && x.status !== "cancelled" ? `sisa ${rupiah(x.grand_total.minus(x.paid_amount))}` : null),
      nilai: rupiah(x.grand_total),
      href: `/tagihan/${x.id}`,
    }));
  });
  tambah("pembayaran", "Payment", async () => {
    const r = await prisma.payments.findMany({
      where: { ...milik, OR: [{ payment_number: ada }, { receipt_number: ada }, { customers: { name: ada } }] },
      orderBy: { id: "desc" },
      take: BATAS,
      select: { id: true, payment_number: true, payment_date: true, total_amount: true, customers: { select: { name: true } } },
    });
    return r.map((x) => ({ judul: `${x.payment_number} · ${x.customers.name}`, sub: t(x.payment_date) ?? undefined, nilai: rupiah(x.total_amount), href: `/pembayaran/${x.id}` }));
  });
  tambah("event", "Event", async () => {
    const r = await prisma.events.findMany({
      where: { OR: [{ name: ada }, { venue: ada }, { customers: { name: ada } }] },
      orderBy: { first_date: "desc" },
      take: BATAS,
      select: { id: true, name: true, venue: true, first_date: true, status: true, customers: { select: { name: true } } },
    });
    return r.map((x) => ({ judul: gabung(x.customers.name, x.name && x.name !== "Event" ? x.name : null), sub: gabung(t(x.first_date), x.venue, x.status), href: `/event/${x.id}` }));
  });
  tambah("lead", "Lead", async () => {
    const r = await prisma.leads.findMany({ where: { OR: [{ name: ada }, { phone: ada }, { event_type: ada }] }, orderBy: { id: "desc" }, take: BATAS, select: { id: true, name: true, phone: true, stage: true, event_type: true } });
    return r.map((x) => ({ judul: x.name, sub: gabung(x.event_type, x.phone, x.stage), href: `/lead/${x.id}` }));
  });
  tambah("paket", "Paket (harga jual)", async () => {
    const p = await prisma.packages.findMany({ where: { status: "aktif" }, select: { id: true, code: true, name: true, price: true, unit: true, price_basis: true } });
    return saringMirip(q, p, (x) => [x.name, x.code], BATAS).map((x) => ({
      judul: `${x.code} ${x.name}`,
      nilai: x.price ? `${rupiah(x.price)}/${x.unit ?? "pax"}${x.price_basis === "plus_plus" ? " ++" : ""}` : "harga per pilihan",
      href: `/paket/${x.id}`,
    }));
  });
  tambah("produk", "Product (harga jual)", async () => {
    const p = await prisma.products.findMany({ select: { id: true, name: true, unit: true, default_price: true } });
    return saringMirip(q, p, (x) => x.name, BATAS).map((x) => ({ judul: x.name, nilai: `${rupiah(x.default_price)}/${x.unit}`, href: `/produk?cari=${encodeURIComponent(x.name)}` }));
  });
  tambah("menu", "Menu", async () => {
    const m = await prisma.menus.findMany({
      where: { active: true, merged_into: null },
      select: { id: true, name: true, category: true, recipe_id: true, menu_aliases: { select: { name: true } }, _count: { select: { package_items: true } } },
    });
    return saringMirip(q, m, (x) => [x.name, ...x.menu_aliases.map((a) => a.name)], BATAS).map((x) => ({
      judul: x.name,
      sub: gabung(x.category, x.recipe_id ? "ada resep" : "belum ada resep", x._count.package_items ? `di ${x._count.package_items} paket` : null),
      href: `/menu/${x.id}`,
    }));
  });
  tambah("bahan", biaya ? "Bahan (harga beli terbaru)" : "Bahan", async () => {
    const b = await prisma.ingredients.findMany({
      where: { merged_into: null },
      select: { id: true, code: true, name: true, purchase_unit: true, usage_unit: true, ingredient_prices: biaya ? { orderBy: { effective_at: "desc" }, take: 1, select: { price_per_pack: true, price_per_usage_unit: true, effective_at: true } } : false },
    });
    return saringMirip(q, b, (x) => [x.name, x.code], BATAS).map((x) => {
      // Harga beli hanya untuk yang boleh melihat biaya — tidak pernah dikirim ke peran lain (aturan bisnis #1).
      const h = biaya ? x.ingredient_prices?.[0] : undefined;
      return {
        judul: `${x.code} ${x.name}`,
        sub: gabung(x.purchase_unit ? `beli per ${x.purchase_unit}` : null, h ? `harga per ${t(h.effective_at)}` : biaya ? "belum ada harga" : null),
        nilai: h ? (h.price_per_pack ? `${rupiah(h.price_per_pack)}/${x.purchase_unit ?? "kemasan"}` : `${rupiah(h.price_per_usage_unit.toDecimalPlaces(0))}/${x.usage_unit ?? "satuan"}`) : undefined,
        href: `/bahan/${x.id}`,
      };
    });
  });
  tambah("rekanan", "Rekanan", async () => {
    const r = await prisma.referral_partners.findMany({ select: { id: true, name: true, kind: true, contact_name: true, phone: true } });
    return saringMirip(q, r, (x) => [x.name, x.contact_name], BATAS).map((x) => ({ judul: x.name, sub: gabung(JENIS_REKANAN[x.kind as JenisRekanan] ?? x.kind, x.contact_name, x.phone), href: `/rekanan/${x.id}` }));
  });
  tambah("supplier", "Vendor & Supplier", async () => {
    const r = await prisma.suppliers.findMany({ select: { id: true, name: true, category: true, contact_name: true, phone: true } });
    return saringMirip(q, r, (x) => [x.name, x.contact_name], BATAS).map((x) => ({ judul: x.name, sub: gabung(KATEGORI_VENDOR[(x.category ?? "lainnya") as KategoriVendor], x.contact_name, x.phone), href: `/supplier/${x.id}` }));
  });
  tambah("aset", "Aset Digital", async () => {
    const r = await prisma.digital_assets.findMany({ select: { id: true, title: true, category: true, url: true } });
    return saringMirip(q, r, (x) => x.title, BATAS).map((x) => ({ judul: x.title, sub: KATEGORI_ASET[x.category as KategoriAset] ?? x.category, href: x.url }));
  });
  tambah("pengingat-bayar", "Tagihan kantor", async () => {
    const r = await prisma.bills.findMany({ where: { status: "aktif" }, select: { id: true, name: true, amount: true, next_due: true } });
    return saringMirip(q, r, (x) => x.name, BATAS).map((x) => ({ judul: x.name, sub: `jatuh tempo ${t(x.next_due)}`, nilai: x.amount ? rupiah(x.amount) : undefined, href: `/pengingat-bayar/${x.id}` }));
  });

  return (await Promise.all(tugas)).filter((k): k is KelompokCari => k !== null);
}
