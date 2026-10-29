import "server-only";

import type { Prisma } from "@prisma/client";

import type { Sesi } from "@/lib/auth";
import { hppMenuSistem } from "@/lib/biaya-paket";
import { hitungLaporanProgram, hitungUntungPaket, type HasilUntung, jenisHari, nasiPutih, rekapPorsi } from "@/lib/hitung/ikut-menu-pesta";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { uraiBarisIsi } from "@/lib/slot-paket";

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
  const master = await prisma.menus.findMany({ where: { name: { in: nama } }, select: { id: true, name: true, category: true } });
  const perNama = new Map(master.map((m) => [m.name, m]));
  return nama.map((n) => {
    const m = perNama.get(n);
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
  const per = new Map<string, { id: string; nama: string; hp: string; alamat: string; pesanan: number; belanja: number; terakhir: string; program: string }>();
  for (const x of o) {
    const k = x.customer_id.toString();
    const ada = per.get(k);
    const tgl = x.retail_programs.delivery_date.toISOString().slice(0, 10);
    if (!ada) per.set(k, { id: k, nama: x.customers.name, hp: x.phone, alamat: x.address, pesanan: 1, belanja: Number(x.invoices?.grand_total ?? 0), terakhir: tgl, program: x.retail_programs.name });
    else {
      ada.pesanan += 1;
      ada.belanja += Number(x.invoices?.grand_total ?? 0);
      if (tgl > ada.terakhir) Object.assign(ada, { terakhir: tgl, program: x.retail_programs.name, hp: x.phone, alamat: x.address });
    }
  }
  return [...per.values()].sort((a, b) => b.pesanan - a.pesanan || b.terakhir.localeCompare(a.terakhir));
}
