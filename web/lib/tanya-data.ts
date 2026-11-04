import "server-only";

import type { Sesi } from "./auth";
import { bacaIzin } from "./izin";
import { hariIniWib } from "./kalender";
import { bolehBuka, type KunciMenu } from "./navigasi";
import { daftarTagihan } from "./pengingat-bayar";
import { prisma } from "./prisma";
import { hanyaMiliknya } from "./rbac";
import { orderRekanan } from "./rekanan";
import { saldoStok } from "./stok";
import { rupiah } from "./uang";

/* ==========================================================================
   PERTANYAAN DATA (D-135) — jawaban dihitung langsung dari database, tanpa AI.
   Satu daftar dipakai dua permukaan: tombol pertanyaan cepat di /cari dan alat
   (tool) Tanya Tiska — angka yang dibaca AI sama persis dengan yang tampil.
   Tiap pertanyaan terikat satu menu: tidak boleh membuka menunya = tidak muncul
   dan tidak bisa dipanggil AI. Tidak ada HPP / margin / untung di sini.
   ========================================================================== */

export type BarisJawaban = { label: string; sub?: string; nilai?: string; href?: string };
export type JawabanData = { judul: string; ringkasan: string; baris: BarisJawaban[]; tautan?: { label: string; href: string } };
type Rentang = { dari?: string; sampai?: string };

export type Pertanyaan = {
  kunci: string;
  label: string;
  menu: KunciMenu;
  /** Contoh pertanyaan untuk tombol saran di Tanya Tiska. */
  contoh: string;
  /** Penjelasan untuk AI: kapan alat ini dipakai. */
  untukAi: string;
  /** Alat menerima rentang tanggal (YYYY-MM-DD). */
  rentang?: boolean;
  jalankan: (sesi: Sesi, r: Rentang) => Promise<JawabanData>;
};

const tgl = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const t = (d: Date | null | undefined) => (d ? tgl.format(d) : "—");
const tanggal = (s: string) => new Date(`${s}T00:00:00Z`);
const geser = (s: string, hari: number) => new Date(Date.parse(`${s}T00:00:00Z`) + hari * 86_400_000).toISOString().slice(0, 10);
const sahTanggal = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

export const PERTANYAAN: Pertanyaan[] = [
  {
    kunci: "acara",
    contoh: "Minggu ini ada acara apa saja?",
    label: "Acara 7 hari ke depan",
    menu: "event",
    rentang: true,
    untukAi: "Daftar event / acara catering (tanggal, customer, venue, jumlah tamu, status). Tanpa rentang = 7 hari ke depan.",
    async jalankan(_s, r) {
      const dari = sahTanggal(r.dari) ?? hariIniWib();
      const sampai = sahTanggal(r.sampai) ?? geser(dari, 6);
      const e = await prisma.events.findMany({
        where: { status: { not: "batal" }, first_date: { gte: tanggal(dari), lte: tanggal(sampai) } },
        orderBy: { first_date: "asc" },
        take: 50,
        select: { id: true, name: true, venue: true, first_date: true, guest_count: true, status: true, customers: { select: { name: true } } },
      });
      return {
        judul: `Acara ${t(tanggal(dari))} – ${t(tanggal(sampai))}`,
        ringkasan: e.length ? `${e.length} acara.` : "Tidak ada acara di rentang ini.",
        baris: e.map((x) => ({
          label: `${t(x.first_date)} · ${x.customers.name}${x.name && x.name !== "Event" ? ` (${x.name})` : ""}`,
          sub: [x.venue, x.guest_count ? `${x.guest_count} tamu` : null, x.status].filter(Boolean).join(" · "),
          href: `/event/${x.id}`,
        })),
        tautan: { label: "Buka Event", href: "/event" },
      };
    },
  },
  {
    kunci: "belum-lunas",
    contoh: "Siapa yang belum lunas?",
    label: "Siapa yang belum lunas?",
    menu: "tagihan",
    untukAi: "Invoice customer yang belum lunas (sisa tagihan, jatuh tempo), urut jatuh tempo. Untuk pertanyaan piutang / siapa belum bayar.",
    async jalankan(s) {
      const inv = await prisma.invoices.findMany({
        where: { ...hanyaMiliknya(s), status: { in: ["unpaid", "partial", "overdue"] } },
        orderBy: { due_date: "asc" },
        select: { id: true, invoice_number: true, due_date: true, grand_total: true, paid_amount: true, customers: { select: { name: true } } },
      });
      const hariIni = tanggal(hariIniWib());
      const sisa = inv.reduce((n, x) => n + Number(x.grand_total) - Number(x.paid_amount), 0);
      const lewat = inv.filter((x) => x.due_date < hariIni).length;
      return {
        judul: "Invoice belum lunas",
        ringkasan: inv.length ? `${inv.length} invoice, total sisa ${rupiah(sisa)}${lewat ? ` · ${lewat} sudah lewat jatuh tempo` : ""}.` : "Semua invoice sudah lunas.",
        baris: inv.slice(0, 25).map((x) => ({
          label: `${x.customers.name} · ${x.invoice_number}`,
          sub: `jatuh tempo ${t(x.due_date)}${x.due_date < hariIni ? " (lewat)" : ""}`,
          nilai: rupiah(Number(x.grand_total) - Number(x.paid_amount)),
          href: `/tagihan/${x.id}`,
        })),
        tautan: { label: "Kartu Piutang", href: "/laporan/piutang" },
      };
    },
  },
  {
    kunci: "penjualan",
    contoh: "Gimana penjualan bulan ini?",
    label: "Penjualan bulan ini",
    menu: "dasbor",
    rentang: true,
    untukAi: "Ringkasan penjualan: jumlah & nilai invoice yang terbit, dan uang masuk (payment) di rentang tanggal. Tanpa rentang = bulan berjalan. Tidak berisi HPP/untung.",
    async jalankan(s, r) {
      const hariIni = hariIniWib();
      const dari = sahTanggal(r.dari) ?? `${hariIni.slice(0, 7)}-01`;
      const sampai = sahTanggal(r.sampai) ?? hariIni;
      const milik = hanyaMiliknya(s);
      const [inv, bayar] = await Promise.all([
        prisma.invoices.aggregate({ where: { ...milik, status: { not: "cancelled" }, invoice_date: { gte: tanggal(dari), lte: tanggal(sampai) } }, _count: true, _sum: { grand_total: true } }),
        prisma.payments.aggregate({ where: { ...milik, payment_date: { gte: tanggal(dari), lte: tanggal(sampai) } }, _count: true, _sum: { total_amount: true } }),
      ]);
      return {
        judul: `Penjualan ${t(tanggal(dari))} – ${t(tanggal(sampai))}`,
        ringkasan: `${inv._count} invoice senilai ${rupiah(inv._sum.grand_total ?? 0)} · uang masuk ${rupiah(bayar._sum.total_amount ?? 0)} dari ${bayar._count} payment.`,
        baris: [
          { label: "Invoice terbit", nilai: rupiah(inv._sum.grand_total ?? 0), sub: `${inv._count} invoice` },
          { label: "Uang masuk (payment)", nilai: rupiah(bayar._sum.total_amount ?? 0), sub: `${bayar._count} payment` },
        ],
        tautan: { label: "Laporan Penjualan", href: "/laporan/penjualan" },
      };
    },
  },
  {
    kunci: "jatuh-tempo",
    contoh: "Tagihan kantor apa yang harus dibayar?",
    label: "Tagihan kantor yang harus dibayar",
    menu: "pengingat-bayar",
    untukAi: "Tagihan kantor (wifi, listrik, air, pajak, sewa, dll.) yang lewat jatuh tempo atau sudah masuk masa pengingat.",
    async jalankan() {
      const d = (await daftarTagihan("aktif", hariIniWib())).filter((x) => x.keadaan !== "nanti");
      return {
        judul: "Tagihan kantor perlu dibayar",
        ringkasan: d.length ? `${d.length} tagihan${d.some((x) => x.keadaan === "lewat") ? `, ${d.filter((x) => x.keadaan === "lewat").length} lewat jatuh tempo` : ""}.` : "Belum ada tagihan kantor yang perlu dibayar dalam waktu dekat.",
        baris: d.map((x) => ({ label: x.nama, sub: `jatuh tempo ${t(tanggal(x.jatuhTempo))}${x.sisa < 0 ? ` (lewat ${-x.sisa} hari)` : x.sisa === 0 ? " (hari ini)" : ` (${x.sisa} hari lagi)`}`, nilai: x.nominal ? rupiah(x.nominal) : undefined, href: `/pengingat-bayar/${x.id}` })),
        tautan: { label: "Pengingat Bayar", href: "/pengingat-bayar" },
      };
    },
  },
  {
    kunci: "stok-menipis",
    contoh: "Ada stok yang mau habis?",
    label: "Stok yang mau habis",
    menu: "stok",
    untukAi: "Bahan yang stoknya di bawah stok minimum.",
    async jalankan() {
      const b = await prisma.ingredients.findMany({ where: { merged_into: null, min_stock: { not: null } }, select: { id: true, code: true, name: true, usage_unit: true, min_stock: true } });
      const saldo = await saldoStok(b.map((x) => x.id));
      const kurang = b.filter((x) => (saldo.get(x.id.toString())?.toNumber() ?? 0) < Number(x.min_stock));
      return {
        judul: "Stok di bawah minimum",
        ringkasan: !b.length ? "Belum ada bahan yang punya stok minimum — isi dulu di Stok Bahan." : kurang.length ? `${kurang.length} bahan di bawah minimum.` : "Semua stok di atas minimum.",
        baris: kurang.map((x) => ({ label: `${x.code} ${x.name}`, sub: `minimum ${Number(x.min_stock)} ${x.usage_unit ?? ""}`, nilai: `${saldo.get(x.id.toString())?.toNumber() ?? 0} ${x.usage_unit ?? ""}`, href: `/bahan/${x.id}` })),
        tautan: { label: "Stok Bahan", href: "/stok" },
      };
    },
  },
  {
    kunci: "partner-fee",
    contoh: "Partner Fee mana yang siap dibayar?",
    label: "Partner Fee siap dibayar",
    menu: "rekanan",
    untukAi: "Partner Fee rekanan (EO/WO/MC/venue) yang kliennya sudah lunas dan belum dibayar.",
    async jalankan() {
      const o = (await orderRekanan()).filter((x) => x.status === "siap");
      return {
        judul: "Partner Fee siap dibayar",
        ringkasan: o.length ? `${o.length} order, total ${rupiah(o.reduce((n, x) => n + x.fee.jumlah, 0))}.` : "Tidak ada Partner Fee yang siap dibayar.",
        baris: o.map((x) => ({ label: `${x.rekanan.nama} · ${x.customer.nama}`, sub: x.nomor, nilai: rupiah(x.fee.jumlah), href: `/rekanan/${x.rekanan.id}` })),
        tautan: { label: "Rekanan", href: "/rekanan" },
      };
    },
  },
  {
    kunci: "follow-up",
    contoh: "Lead mana yang perlu di-follow-up hari ini?",
    label: "Lead yang perlu di-follow-up",
    menu: "lead",
    untukAi: "Lead (calon klien) yang jadwal follow-up-nya hari ini atau sudah lewat.",
    async jalankan() {
      const l = await prisma.leads.findMany({
        where: { next_followup_at: { lte: tanggal(hariIniWib()) }, stage: { notIn: ["selesai", "batal"] } },
        orderBy: { next_followup_at: "asc" },
        take: 30,
        select: { id: true, name: true, phone: true, stage: true, event_type: true, next_followup_at: true },
      });
      return {
        judul: "Lead perlu di-follow-up",
        ringkasan: l.length ? `${l.length} lead.` : "Tidak ada lead yang jadwal follow-up-nya hari ini / lewat.",
        baris: l.map((x) => ({ label: x.name, sub: [x.event_type, x.phone, `follow-up ${t(x.next_followup_at)}`].filter(Boolean).join(" · "), href: `/lead/${x.id}` })),
        tautan: { label: "Lead", href: "/lead" },
      };
    },
  },
  {
    kunci: "ikut-menu-pesta",
    contoh: "Ikut Menu Pesta berikutnya kapan?",
    label: "Program Ikut Menu Pesta mendatang",
    menu: "ikut-menu-pesta",
    untukAi: "Program Ikut Menu Pesta (retail) yang disetujui dan belum lewat: tanggal kirim, jumlah pesanan & pax.",
    async jalankan() {
      const p = await prisma.retail_programs.findMany({
        where: { status: "disetujui", delivery_date: { gte: tanggal(hariIniWib()) } },
        orderBy: { delivery_date: "asc" },
        select: { id: true, name: true, delivery_date: true, retail_orders: { where: { status: "aktif" }, select: { retail_order_items: { select: { pax: true } } } } },
      });
      return {
        judul: "Ikut Menu Pesta mendatang",
        ringkasan: p.length ? `${p.length} program.` : "Belum ada program mendatang yang disetujui.",
        baris: p.map((x) => ({
          label: `${t(x.delivery_date)} · ${x.name}`,
          nilai: `${x.retail_orders.length} pesanan · ${x.retail_orders.flatMap((o) => o.retail_order_items).reduce((n, i) => n + i.pax, 0)} pax`,
          href: `/ikut-menu-pesta/${x.id}`,
        })),
        tautan: { label: "Ikut Menu Pesta", href: "/ikut-menu-pesta" },
      };
    },
  },
];

/** Pertanyaan yang boleh dipakai sesi ini (menu terkait boleh dibuka). */
export async function pertanyaanUntuk(sesi: Sesi): Promise<Pertanyaan[]> {
  const izin = await bacaIzin();
  return PERTANYAAN.filter((p) => bolehBuka(sesi.peran, p.menu, izin));
}
