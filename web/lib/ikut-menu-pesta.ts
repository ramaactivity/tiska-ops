import "server-only";

import type { Sesi } from "@/lib/auth";
import { hppMenuSistem } from "@/lib/biaya-paket";
import { hitungUntungPaket, type HasilUntung, nasiPutih } from "@/lib/hitung/ikut-menu-pesta";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { uraiBarisIsi } from "@/lib/slot-paket";

/* ==========================================================================
   IKUT PESEN MENU PESTA (D-115) — pembacaan database.
   Rumus murni ada di lib/hitung/ikut-menu-pesta.ts.
   ========================================================================== */

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
