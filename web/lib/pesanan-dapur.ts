import "server-only";

import { type Dapur, dapurMenu, jamPertama, saringIsiDapur, tanggalBaris } from "./dapur-layar";
import { hariKeDalamNama, tanggalDalamNama } from "./hari-berikutnya";
import { porsiProgramTanggal } from "./ikut-menu-pesta";
import { penentuMenu } from "./menu-dapur";
import { prisma } from "./prisma";
import { uraiBarisIsi } from "./slot-paket";
import { keteranganRincian } from "./baris-cetak";
import { teksJumlahBaris } from "./uang";

/* ==========================================================================
   PESANAN SATU TANGGAL UNTUK LAYAR DAPUR — TANPA HARGA.

   Sumber utama INVOICE (26 Nov 2026): hanya 8 dari 101 invoice yang pernah
   dibuatkan Event, jadi layar yang hanya membaca Event kosong hampir setiap
   hari. Event tetap dibaca untuk kloter (jadwal angkut) dan untuk quotation
   disetujui yang belum punya invoice. Ikut Menu Pesta dibaca dari programnya.
   Harga hanya dipakai di server untuk membedakan baris judul ("STARTER")
   dari baris pesanan; tidak ada angka uang di hasil fungsi ini.
   ========================================================================== */

export type StatusKirim = "berangkat" | "tiba" | "selesai";

export type OrderLayar = {
  id: string;
  nama: string;
  tempat: string | null;
  /** Jam pesanan seperti diketik tim ("06.00–15.00", "09.30 WIB brkt dr Julang"). */
  jamTeks: string | null;
  /** Jam pertama di jamTeks ("06.00") untuk urutan & hitung mundur; null bila tidak ada. */
  jam: string | null;
  /** Catatan untuk dapur & tim (D-212): "jangan pedas", "sayur lebih empuk". */
  catatanDapur: string | null;
  items: {
    nama: string;
    /** null = baris judul kelompok ("STARTER"), tanpa jumlah. */
    jumlah: string | null;
    jam: string | null;
    isi: string[];
    /** Catatan di bawah menu & sub-item (D-208, D-224). */
    catatan: string[];
    /** Jumlah yang diketik pada isi paket ("120 pax"), per nama isi — sama dengan PO to Kitchen (D-106). */
    ket?: Record<string, string>;
  }[];
  kloter: { id: string; no: number; jam: string; status: StatusKirim | null; dapur: string[] }[];
};

const tgl = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);
const ANGKA = (n: { toString(): string }) => Number(n.toString());

function statusKloter(k: { id: bigint; no: number; depart_time: string; kloter_tracking: { status: string }[] }): OrderLayar["kloter"][number] {
  return {
    id: k.id.toString(),
    no: k.no,
    jam: k.depart_time,
    status: (["selesai", "tiba", "berangkat"].find((s) => k.kloter_tracking.some((t) => t.status === s)) ?? null) as StatusKirim | null,
    dapur: k.kloter_tracking.map((t) => t.status).filter((s) => ["dimasak", "packing", "siap"].includes(s)),
  };
}

/** Pesanan tanggal "YYYY-MM-DD"; `dapur` → hanya isi yang menjadi tugas dapur itu (D-097). */
export async function pesananDapur(tanggal: string, dapur: Dapur | null): Promise<OrderLayar[]> {
  const hari = new Date(`${tanggal}T00:00:00Z`);
  const KLOTER = { where: { date: hari, program_id: null }, orderBy: { no: "asc" as const }, include: { kloter_tracking: { select: { status: true } } } };

  const [invoice, event, program] = await Promise.all([
    prisma.invoices.findMany({
      where: {
        cancelled_at: null,
        status: { not: "cancelled" },
        invoice_event_dates: { some: { event_date: hari } },
        // Invoice pesanan Ikut Menu Pesta sudah terhitung di kartu programnya.
        retail_orders: { none: {} },
      },
      select: {
        id: true,
        quotation_id: true,
        venue: true,
        event_time: true,
        kitchen_notes: true,
        customers: { select: { name: true } },
        invoice_event_dates: { select: { event_date: true } },
        invoice_items: {
          where: { parent_id: null, kind: null },
          orderBy: { id: "asc" },
          select: {
            item_name: true,
            qty: true,
            pax: true,
            unit: true,
            price: true,
            is_compliment: true,
            note: true,
            other_invoice_items: { orderBy: { id: "asc" }, select: { item_name: true, qty: true, pax: true, unit: true, price: true, note: true } },
          },
        },
      },
    }),
    prisma.events.findMany({
      where: {
        status: { not: "batal" },
        OR: [{ first_date: hari }, { event_items: { some: { session_date: hari } } }, { event_kloters: { some: { date: hari } } }],
      },
      include: {
        customers: { select: { name: true } },
        quotations: { select: { kitchen_notes: true, invoices: { select: { id: true }, take: 1 } } },
        event_items: { orderBy: { sort: "asc" } },
        event_kloters: KLOTER,
      },
    }),
    porsiProgramTanggal(tanggal),
  ]);

  // Kloter event milik invoice yang sudah tampil (lewat invoice_id atau quotation yang sama).
  const kloterInvoice = await prisma.event_kloters.findMany({
    where: {
      ...KLOTER.where,
      events: {
        status: { not: "batal" },
        OR: [{ invoice_id: { in: invoice.map((i) => i.id) } }, { quotation_id: { in: invoice.flatMap((i) => (i.quotation_id ? [i.quotation_id] : [])) } }],
      },
    },
    orderBy: KLOTER.orderBy,
    include: { ...KLOTER.include, events: { select: { invoice_id: true, quotation_id: true } } },
  });

  // Dapur tiap baris isi: menu master (kolom dapur, atau tebakan dari kategori); buffet "Soup: …" diurai dulu.
  const [menu, opsi] = dapur
    ? await Promise.all([
        prisma.menus.findMany({ select: { id: true, name: true, kitchen: true, category: true } }),
        prisma.package_slot_options.findMany({ where: { menu_id: { not: null } }, select: { name: true, menus: { select: { name: true } } } }),
      ])
    : [[], []];
  const perId = new Map(menu.map((m) => [m.id.toString(), m]));
  const kamus = new Map(opsi.map((o) => [o.name.toLowerCase(), o.menus!.name]));
  // Nama di dokumen → menu dapur (D-122): nama lain, beda tanda baca, menu digabung ikut dikenali.
  const { cari } = dapur ? await penentuMenu() : { cari: () => null };
  const dapurBaris = (b: string) => new Set(uraiBarisIsi(b, kamus).map((n) => dapurMenu(perId.get(cari(n)?.id ?? ""))));
  /** Baris (dengan isinya) milik dapur ini? Isinya disaring ke dapur ini. */
  const saring = (it: OrderLayar["items"][number]): OrderLayar["items"][number] | null => {
    if (!dapur) return it;
    const milik = it.isi.length ? it.isi.some((b) => dapurBaris(b).has(dapur)) : dapurBaris(it.nama).has(dapur);
    return milik ? { ...it, isi: it.isi.length ? saringIsiDapur(it.isi, dapurBaris, dapur) : it.isi } : null;
  };

  const dariInvoice: OrderLayar[] = invoice.map((inv) => {
    const tanggalItem = tanggalBaris(
      inv.invoice_items.map((b) => b.item_name),
      inv.invoice_event_dates.map((d) => tgl(d.event_date)!),
      { tanggal: tanggalDalamNama, hariKe: hariKeDalamNama },
    );
    const items = inv.invoice_items
      .filter((_, n) => tanggalItem[n] === null || tanggalItem[n] === tanggal)
      .flatMap((b) => {
        const bernilai = ANGKA(b.qty) * ANGKA(b.price) > 0 || b.is_compliment;
        const isi = b.other_invoice_items.filter((a) => ANGKA(a.price) <= 0);
        // Sub-item berharga (stall di bawah "GUBUKAN/ STALL") dimasak sebagai baris sendiri, seperti di Event.
        const berharga = b.other_invoice_items.filter((a) => ANGKA(a.price) > 0);
        return [
          {
            nama: b.item_name,
            jumlah: bernilai ? teksJumlahBaris({ qty: b.qty.toString(), pax: b.pax ?? undefined, unit: b.unit || "pax" }).toUpperCase() : null,
            jam: null,
            isi: isi.map((a) => a.item_name),
            catatan: [b.note?.trim() ?? "", ...isi.map((a) => (a.note?.trim() ? `${a.item_name}: ${a.note.trim()}` : ""))].filter(Boolean),
            ket: Object.fromEntries(
              isi.flatMap((a) => {
                const ket = keteranganRincian(ANGKA(a.qty) > 0 ? ANGKA(a.qty).toLocaleString("id-ID") : "", a.unit ?? "", a.pax && a.pax > 0 ? a.pax.toLocaleString("id-ID") : "");
                return ket ? [[a.item_name, ket]] : [];
              }),
            ),
          },
          ...berharga.map((a) => ({
            nama: a.item_name,
            jumlah: teksJumlahBaris({ qty: a.qty.toString(), pax: a.pax ?? undefined, unit: a.unit || "pax" }).toUpperCase(),
            jam: null,
            isi: [],
            catatan: a.note?.trim() ? [a.note.trim()] : [],
          })),
        ];
      });
    return {
      id: `invoice-${inv.id}`,
      nama: inv.customers.name,
      tempat: inv.venue,
      jamTeks: inv.event_time?.trim() || null,
      jam: jamPertama(inv.event_time),
      catatanDapur: inv.kitchen_notes?.trim() || null,
      items,
      kloter: kloterInvoice.filter((k) => k.events.invoice_id === inv.id || (inv.quotation_id !== null && k.events.quotation_id === inv.quotation_id)).map(statusKloter),
    };
  });

  // Event lama tanpa invoice (quotation disetujui, invoice belum dibuat) — cara baca sebelumnya.
  const sudahInvoice = new Set(invoice.map((i) => i.id.toString()));
  const dariEvent: OrderLayar[] = event
    .filter((e) => !(e.invoice_id && sudahInvoice.has(e.invoice_id.toString())) && !e.quotations.invoices.some((i) => sudahInvoice.has(i.id.toString())))
    .map((e) => {
      const items = e.event_items.filter((i) => (tgl(i.session_date) ?? tgl(e.first_date)) === tanggal);
      return {
        id: e.id.toString(),
        nama: e.customers.name,
        tempat: e.venue,
        jamTeks: null,
        jam: e.event_kloters[0]?.depart_time ?? items.find((i) => i.session_time)?.session_time ?? null,
        catatanDapur: e.quotations.kitchen_notes?.trim() || null,
        items: items.map((i) => ({
          nama: i.item_name,
          jumlah: teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }).toUpperCase(),
          jam: i.session_time,
          isi: i.contents ? i.contents.split("\n") : [],
          catatan: i.kitchen_note?.trim() ? [i.kitchen_note.trim()] : [],
        })),
        kloter: e.event_kloters.map(statusKloter),
      };
    });

  // Ikut Menu Pesta (D-116): total pax per paket, dimasak bersama; kloter antarnya (D-117) di kartu programnya.
  const kloterProgram = program.length
    ? await prisma.event_kloters.findMany({
        where: { date: hari, program_id: { in: program.map((p) => BigInt(p.id)) } },
        orderBy: { no: "asc" },
        include: { kloter_tracking: { select: { status: true } } },
      })
    : [];
  const dariProgram: OrderLayar[] = program.map((p) => ({
    id: `program-${p.id}`,
    nama: p.nama.replace(/ · .*/, ""),
    tempat: "Retail — dikirim ke pembeli",
    jamTeks: null,
    jam: null,
    catatanDapur: null,
    items: p.paket.filter((x) => x.pax > 0).map((x) => ({ nama: x.judul, jumlah: `${x.pax} PAX`, jam: null, isi: x.isi, catatan: [] })),
    kloter: kloterProgram.filter((k) => k.program_id?.toString() === p.id).map(statusKloter),
  }));

  return [...dariInvoice, ...dariEvent, ...dariProgram]
    .map((o) => {
      const items = o.items.flatMap((it) => saring(it) ?? []);
      // Judul kelompok tanpa isi yang tersisa untuk dapur ini tidak perlu tampil.
      return { ...o, items: dapur ? items.filter((it) => it.jumlah !== null || it.isi.length) : items };
    })
    .filter((o) => o.items.some((it) => it.jumlah !== null || it.isi.length) || (!dapur && o.kloter.length))
    .sort((a, b) => (a.kloter[0]?.jam ?? a.jam ?? "99").localeCompare(b.kloter[0]?.jam ?? b.jam ?? "99"));
}
