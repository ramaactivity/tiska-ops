import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import type { Sesi } from "@/lib/auth";
import { hppMenuSistem } from "@/lib/biaya-paket";
import { type AsalPesanan, cekPesanan, hitungLaporanProgram, hitungUntungPaket, type HasilUntung, jenisHari, nasiPutih, rapikanHp, rekapPorsi } from "@/lib/hitung/ikut-menu-pesta";
import { kodePelangganBerikutnya, nomorTiskaBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya } from "@/lib/peran";
import { penentuMenu } from "@/lib/menu-dapur";
import { prisma } from "@/lib/prisma";
import { uraiBarisIsi } from "@/lib/slot-paket";
import { hitungTotalDokumen } from "@/lib/uang";

/* ==========================================================================
   IKUT PESEN MENU PESTA (D-115) — pembacaan database.
   Rumus murni ada di lib/hitung/ikut-menu-pesta.ts.
   ========================================================================== */

/**
 * Pesanan yang DIHITUNG (porsi dapur, pengiriman, laporan): aktif dan bukan luar area yang ditolak.
 * Ditulis eksplisit dengan `area_status: null` — `NOT: { area_status: "ditolak" }` ikut membuang
 * pesanan dalam area (NULL) karena perbandingan SQL dengan NULL tidak pernah benar.
 */
export const PESANAN_DIHITUNG = { status: "aktif", OR: [{ area_status: null }, { area_status: { not: "ditolak" } }] } satisfies Prisma.retail_ordersWhereInput;

export type MenuAcara = { idMenu: string | null; nama: string; kategori: string | null };

/**
 * Menu yang dimasak untuk acara induk — isi paket diurai seperti Kebutuhan
 * Bahan (D-095), dicocokkan ke master menu lewat nama. Nasi putih tidak
 * ditawarkan (jawaban tim #1).
 */
export async function menuAcara(idEvent: bigint): Promise<MenuAcara[]> {
  const [items, opsi] = await Promise.all([
    prisma.event_items.findMany({ where: { event_id: idEvent }, orderBy: { sort: "asc" }, select: { item_name: true, contents: true } }),
    prisma.package_slot_options.findMany({ where: { menu_id: { not: null } }, select: { name: true, menus: { select: { name: true } } } }),
  ]);
  const kamus = new Map(opsi.map((o) => [o.name.toLowerCase(), o.menus!.name]));
  const nama = [...new Set(items.flatMap((i) => (i.contents ? i.contents.split("\n").flatMap((b) => uraiBarisIsi(b, kamus)) : [i.item_name])))].filter(
    (n) => n.trim() && !nasiPutih(n),
  );
  // Nama di dokumen → menu dapur (D-122), sama dengan Kebutuhan Bahan.
  const { cari } = await penentuMenu();
  const tentu = new Map(nama.map((n) => [n, cari(n)?.id ?? null]));
  const master = await prisma.menus.findMany({ where: { id: { in: [...tentu.values()].flatMap((id) => (id ? [BigInt(id)] : [])) } }, select: { id: true, name: true, category: true } });
  const perId = new Map(master.map((m) => [m.id.toString(), m]));
  return nama.map((n) => {
    const id = tentu.get(n);
    const m = id ? perId.get(id) : undefined;
    return { idMenu: m?.id.toString() ?? null, nama: n, kategori: m?.category ?? null };
  });
}

export type UntungPaket = HasilUntung & { idSet: string; hppPerMenu: { nama: string; hpp: number | null }[] };

export type UntungProgram = {
  paket: UntungPaket[];
  harga: number;
  kemasan: number;
  biayaAntar: number;
  amanPct: number;
  minPct: number;
  /** Untung terendah antar paket — yang dicatat saat disetujui. */
  terendahPct: number | null;
};

/**
 * Cek HPP per paket. Menolak sendiri (null) bila peran tidak boleh melihat
 * biaya — angka HPP tidak pernah keluar dari server untuk peran lain (D-006).
 */
export async function untungProgram(sesi: Pick<Sesi, "peran">, idProgram: bigint): Promise<UntungProgram | null> {
  if (!bolehLihatBiaya(sesi.peran)) return null;
  return untungProgramSistem(idProgram);
}

/** Tanpa gerbang peran — hanya untuk perhitungan server (snapshot saat disetujui). */
export async function untungProgramSistem(idProgram: bigint): Promise<UntungProgram> {
  const [p, angka] = await Promise.all([
    prisma.retail_programs.findUniqueOrThrow({
      where: { id: idProgram },
      select: {
        price_per_pax: true,
        retail_program_sets: {
          orderBy: { sort: "asc" },
          select: { id: true, retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true, menu_id: true } } },
        },
      },
    }),
    bacaPengaturanBisnis(),
  ]);
  const idMenu = [...new Set(p.retail_program_sets.flatMap((s) => s.retail_program_set_items.map((i) => i.menu_id)).filter((x): x is bigint => x != null))];
  const hpp = await hppMenuSistem(idMenu);
  const { kemasan_per_pax: kemasan, biaya_antar_per_program: biayaAntar } = angka.ikut_menu_pesta;
  const harga = Number(p.price_per_pax);
  const paket = p.retail_program_sets.map((s) => {
    const hppPerMenu = s.retail_program_set_items.map((i) => {
      const h = i.menu_id ? hpp.get(i.menu_id) : null;
      return { nama: i.name, hpp: h ? Number(h) : null };
    });
    return {
      idSet: s.id.toString(),
      hppPerMenu,
      ...hitungUntungPaket({ harga, hppMenu: hppPerMenu.map((m) => m.hpp), kemasan, biayaAntar, amanPct: angka.untung_aman_pct, minPct: angka.untung_min_pct }),
    };
  });
  const pct = paket.map((x) => x.untungPct);
  return {
    paket,
    harga,
    kemasan,
    biayaAntar,
    amanPct: angka.untung_aman_pct,
    minPct: angka.untung_min_pct,
    terendahPct: pct.length && pct.every((x) => x != null) ? Math.min(...(pct as number[])) : null,
  };
}

/* ---------- Tahap B: pesanan (D-116) ---------- */

/**
 * Porsi Ikut Menu Pesta per tanggal kirim — sumber kedua (di samping event)
 * untuk Kebutuhan Bahan, PR, dan Layar Dapur. Tanpa harga. Pesanan batal &
 * pesanan luar area yang ditolak tidak dihitung.
 */
export async function porsiProgramTanggal(tanggal: string) {
  const program = await prisma.retail_programs.findMany({
    where: { status: "disetujui", delivery_date: new Date(`${tanggal}T00:00:00Z`) },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      retail_program_sets: { orderBy: { sort: "asc" }, select: { id: true, title: true, retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true } } } },
      retail_orders: {
        where: PESANAN_DIHITUNG,
        select: { retail_order_items: { select: { set_id: true, pax: true } } },
      },
    },
  });
  return program.map((p) => ({
    id: p.id.toString(),
    nama: p.name,
    ...rekapPorsi(
      p.retail_program_sets.map((s) => ({ idSet: s.id.toString(), judul: s.title, isi: s.retail_program_set_items.map((i) => i.name) })),
      p.retail_orders.flatMap((o) => o.retail_order_items.map((i) => ({ idSet: i.set_id.toString(), pax: i.pax }))),
    ),
  }));
}

/* ---------- Tahap D: laporan (D-118) ---------- */

export type LaporanProgram = ReturnType<typeof hitungLaporanProgram> & { id: string; nama: string; tanggal: string; jenis: "Weekend" | "Weekday"; biaya: boolean };

/**
 * Laporan satu atau beberapa program disetujui. Pesanan batal & luar area
 * ditolak tidak dihitung. HPP/kemasan/antar/untung DIHAPUS di server untuk
 * peran tanpa izin biaya (D-006) — bukan sekadar disembunyikan di layar.
 */
export async function laporanProgram(sesi: Pick<Sesi, "peran">, idProgram?: bigint[]): Promise<LaporanProgram[]> {
  const biaya = bolehLihatBiaya(sesi.peran);
  const [program, angka] = await Promise.all([
    prisma.retail_programs.findMany({
      where: { status: "disetujui", ...(idProgram ? { id: { in: idProgram } } : {}) },
      orderBy: { delivery_date: "desc" },
      select: {
        id: true,
        name: true,
        delivery_date: true,
        retail_orders: {
          where: PESANAN_DIHITUNG,
          select: {
            source: true,
            customer_id: true,
            invoice_id: true,
            cod_collected: true,
            retail_order_items: { select: { set_id: true, pax: true } },
            invoices: { select: { subtotal: true, delivery_amount: true, grand_total: true, paid_amount: true, status: true } },
          },
        },
        event_kloters: { select: { event_assignments: { where: { honor_status: { in: ["dikunci", "dibayar"] } }, select: { fee: true } } } },
      },
    }),
    bacaPengaturanBisnis(),
  ]);
  // Pembeli baru = invoice pesanan ini adalah invoice (tidak batal) PERTAMA customer-nya.
  const pelanggan = [...new Set(program.flatMap((p) => p.retail_orders.map((o) => o.customer_id)))];
  const pertama = new Map(
    (
      await prisma.invoices.groupBy({ by: ["customer_id"], where: { customer_id: { in: pelanggan }, status: { not: "cancelled" } }, _min: { id: true } })
    ).map((g) => [g.customer_id.toString(), g._min.id]),
  );
  const hasil: LaporanProgram[] = [];
  for (const p of program) {
    const hppPerSet = new Map<string, number | null>();
    if (biaya) for (const x of (await untungProgramSistem(p.id)).paket) hppPerSet.set(x.idSet, x.hppMenu);
    const honor = p.event_kloters.flatMap((k) => k.event_assignments).reduce((s, a) => s + Number(a.fee ?? 0), 0);
    const r = hitungLaporanProgram({
      pesanan: p.retail_orders.map((o) => {
        const i = o.invoices;
        const lunas = i?.status === "paid";
        return {
          paket: o.retail_order_items.map((x) => ({ idSet: x.set_id.toString(), pax: x.pax })),
          subtotal: Number(i?.subtotal ?? 0),
          ongkir: Number(i?.delivery_amount ?? 0),
          total: Number(i?.grand_total ?? 0),
          dibayar: Number(i?.paid_amount ?? 0),
          tunaiBelumDisetor: o.cod_collected !== null && !lunas ? Number(o.cod_collected) : 0,
          asal: o.source,
          baru: o.invoice_id !== null && pertama.get(o.customer_id.toString()) === o.invoice_id,
        };
      }),
      hppPerSet,
      kemasanPerPax: angka.ikut_menu_pesta.kemasan_per_pax,
      honorAntar: honor > 0 ? honor : null,
      perkiraanAntar: angka.ikut_menu_pesta.biaya_antar_per_program,
    });
    const tanggal = p.delivery_date.toISOString().slice(0, 10);
    hasil.push({
      ...r,
      ...(biaya ? {} : { hpp: null, kemasan: 0, antar: 0, untung: null, untungPerPax: null, untungPct: null }),
      id: p.id.toString(),
      nama: p.name,
      tanggal,
      jenis: jenisHari(tanggal),
      biaya,
    });
  }
  return hasil;
}

/** Pembeli retail Ikut Menu Pesta — untuk ditawari program berikutnya (admin kirim manual lewat WA). */
export async function pembeliRetail() {
  const o = await prisma.retail_orders.findMany({
    where: { status: "aktif" },
    orderBy: { id: "desc" },
    select: {
      customer_id: true,
      recipient_name: true,
      phone: true,
      address: true,
      retail_programs: { select: { name: true, delivery_date: true } },
      invoices: { select: { grand_total: true } },
      customers: { select: { name: true } },
    },
  });
  // Invoice lama yang ditandai sebagai pesanan Ikut Menu Pesta (loyalty_pax) — pembeli sebelum program dicatat di Tiska Ops.
  const lama = await prisma.invoices.findMany({
    where: { loyalty_pax: { not: null }, status: { not: "cancelled" }, retail_orders: { none: {} } },
    select: { customer_id: true, invoice_number: true, event_date: true, invoice_date: true, grand_total: true, contact_phone: true, customers: { select: { name: true, phone: true, address: true } } },
  });
  const per = new Map<string, { id: string; nama: string; hp: string; alamat: string; pesanan: number; belanja: number; terakhir: string; program: string }>();
  for (const x of lama) {
    const k = x.customer_id.toString();
    const tgl = (x.event_date ?? x.invoice_date).toISOString().slice(0, 10);
    const ada = per.get(k);
    const program = `Invoice lama ${x.invoice_number}`;
    if (!ada) per.set(k, { id: k, nama: x.customers.name, hp: x.contact_phone || x.customers.phone || "", alamat: x.customers.address ?? "", pesanan: 1, belanja: Number(x.grand_total), terakhir: tgl, program });
    else {
      ada.pesanan += 1;
      ada.belanja += Number(x.grand_total);
      if (tgl > ada.terakhir) Object.assign(ada, { terakhir: tgl, program });
    }
  }
  for (const x of o) {
    const k = x.customer_id.toString();
    const ada = per.get(k);
    const tgl = x.retail_programs.delivery_date.toISOString().slice(0, 10);
    if (!ada) per.set(k, { id: k, nama: x.customers.name, hp: x.phone, alamat: x.address, pesanan: 1, belanja: Number(x.invoices?.grand_total ?? 0), terakhir: tgl, program: x.retail_programs.name });
    else {
      ada.pesanan += 1;
      ada.belanja += Number(x.invoices?.grand_total ?? 0);
      if (tgl >= ada.terakhir) Object.assign(ada, { terakhir: tgl, program: x.retail_programs.name, hp: x.phone, alamat: x.address });
    }
  }
  return [...per.values()].sort((a, b) => b.pesanan - a.pesanan || b.terakhir.localeCompare(a.terakhir));
}

/* ---------- Pesanan (Tahap B D-116, dipakai juga form online Tahap E D-119) ---------- */

export type DataPesanan = {
  idProgram: string;
  nama: string;
  hp: string;
  alamat: string;
  maps?: string | null;
  jam?: string | null;
  catatan?: string | null;
  asal: AsalPesanan;
  bayar: "transfer" | "cod";
  luarArea: boolean;
  ongkir: number;
  paket: { idSet: string; pax: number }[];
};

/**
 * Satu pesanan = customer (dikenali lewat nomor HP) + invoice retail + baris pesanan, dalam satu transaksi.
 * `oleh` = akun kantor yang mencatat; null = pembeli sendiri lewat form online.
 */
export async function catatPesanan(d: DataPesanan, oleh: bigint | null) {
  const p = await prisma.retail_programs.findUnique({
    where: { id: BigInt(d.idProgram) },
    select: {
      id: true,
      name: true,
      status: true,
      price_per_pax: true,
      min_pax: true,
      max_pax: true,
      area: true,
      order_deadline: true,
      delivery_date: true,
      retail_program_sets: { select: { id: true, title: true, retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true } } } },
      retail_orders: { where: { status: "aktif" }, select: { retail_order_items: { select: { pax: true } } } },
    },
  });
  if (!p) return { ok: false as const, pesan: "Program tidak ditemukan." };
  if (p.status !== "disetujui") return { ok: false as const, pesan: "Pesanan hanya bisa dicatat untuk program yang sudah disetujui." };

  const paket = d.paket.filter((x) => x.pax > 0);
  const sah = new Map(p.retail_program_sets.map((s) => [s.id.toString(), s]));
  if (paket.some((x) => !sah.has(x.idSet))) return { ok: false as const, pesan: "Paket tidak dikenal. Muat ulang halaman." };
  const terpakai = p.retail_orders.flatMap((o) => o.retail_order_items).reduce((a, i) => a + i.pax, 0);
  const salah = cekPesanan({ pax: d.paket.map((x) => x.pax), minPax: p.min_pax, maksPax: p.max_pax, paxTerpakai: terpakai });
  if (salah) return { ok: false as const, pesan: salah };

  const angka = await bacaPengaturanBisnis();
  const harga = Number(p.price_per_pax);
  const ongkir = d.luarArea ? d.ongkir : 0; // area program gratis kirim (Bogor)
  const total = hitungTotalDokumen({
    items: paket.map((x) => ({ qty: 1, pax: x.pax, price: harga, charge_pb1: true, charge_service: false })),
    pb1_enabled: true,
    pb1_percent: angka.pbjt_pct,
    delivery_amount: ongkir,
  });
  const telat = Date.now() > p.order_deadline.getTime();
  const hariIni = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())}T00:00:00Z`);
  const hp = rapikanHp(d.hp);

  const o = await prisma.$transaction(async (tx) => {
    // Pembeli langganan dikenali lewat nomor HP — tidak dibuat dobel.
    const ada = await tx.$queryRawUnsafe<{ id: bigint }[]>(
      `SELECT id FROM customers WHERE regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^62', '0') = $1 ORDER BY id`,
      hp,
    );
    const idCustomer =
      ada[0]?.id ??
      (
        await simpanDenganKodeUnik(
          () => kodePelangganBerikutnya(tx),
          (kode) =>
            tx.customers.create({
              data: { customer_code: kode, name: d.nama, phone: d.hp, address: d.alamat, status: "active", created_by: oleh, created_at: new Date(), updated_at: new Date() },
              select: { id: true },
            }),
        )
      ).id;

    const invoice = await simpanDenganKodeUnik(
      () => nomorTiskaBerikutnya("invoices", "invoice_number", "INV", tx),
      (nomor) =>
        tx.invoices.create({
          data: {
            invoice_number: nomor,
            customer_id: idCustomer,
            invoice_date: hariIni,
            due_date: p.delivery_date,
            status: "unpaid",
            paid_amount: "0",
            order_type: "retail",
            notes: p.name,
            contact_person: d.nama,
            contact_phone: d.hp,
            venue: d.alamat,
            event_date: p.delivery_date,
            event_time: d.jam || null,
            subtotal: total.subtotal.toString(),
            service_charge_amount: "0",
            pb1_enabled: true,
            pb1_percent: angka.pbjt_pct,
            pb1_amount: total.pb1_amount.toString(),
            delivery_amount: total.delivery_amount.toString(),
            grand_total: total.grand_total.toString(),
            created_by: oleh,
            created_at: new Date(),
            updated_at: new Date(),
          },
          select: { id: true },
        }),
    );
    for (const x of paket) {
      const s = sah.get(x.idSet)!;
      const induk = await tx.invoice_items.create({
        data: {
          invoice_id: invoice.id,
          item_name: `Ikut Menu Pesta — ${s.title}`,
          unit: "pax",
          qty: 1,
          pax: x.pax,
          price: harga,
          subtotal: harga * x.pax,
          charge_service: false,
          charge_pb1: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: { id: true },
      });
      await tx.invoice_items.createMany({
        data: s.retail_program_set_items.map((i) => ({
          invoice_id: invoice.id,
          parent_id: induk.id,
          item_name: i.name,
          qty: 0,
          price: 0,
          subtotal: 0,
          charge_service: false,
          charge_pb1: false,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
    await tx.invoice_event_dates.create({ data: { invoice_id: invoice.id, event_date: p.delivery_date, created_at: new Date(), updated_at: new Date() } });

    const o = await tx.retail_orders.create({
      data: {
        program_id: p.id,
        customer_id: idCustomer,
        invoice_id: invoice.id,
        recipient_name: d.nama,
        phone: d.hp,
        address: d.alamat,
        maps_url: d.maps || null,
        receive_time: d.jam || null,
        notes: d.catatan || null,
        source: d.asal,
        payment_mode: d.bayar,
        is_late: telat,
        outside_area: d.luarArea,
        area_status: d.luarArea ? "menunggu" : null,
        delivery_fee: ongkir,
        created_by: oleh,
        // Link pribadi pembeli /pesanan/<token> (D-120) — juga untuk pesanan yang dicatat admin.
        public_token: randomUUID().replaceAll("-", ""),
        retail_order_items: { create: paket.map((x) => ({ set_id: BigInt(x.idSet), pax: x.pax, price: harga })) },
      },
      select: { id: true, public_token: true },
    });
    return o;
  });


  return { ok: true as const, id: o.id, token: o.public_token!, telat, p };
}
