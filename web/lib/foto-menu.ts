import "server-only";

import type { Prisma } from "@prisma/client";

import { buatPenebakMenu } from "./hitung/foto-menu";
import { menuAcara } from "./ikut-menu-pesta";
import { penentuMenu } from "./menu-dapur";
import { prisma } from "./prisma";
import { alamatPublik } from "./r2";

/* Foto Menu (D-124) — pembacaan untuk halaman galeri. TANPA harga. */

export type FotoTampil = {
  id: string;
  thumb: string;
  utama: string;
  lebar: number;
  tinggi: number;
  sajian: string | null;
  keterangan: string | null;
  utamaMenu: boolean;
  sembunyi: boolean;
  namaAsli: string | null;
  tujuan: string | null;
  /** Acara asal foto (diunggah dari event / HP tim). */
  acara: string | null;
  /** Tebakan menu dari nama file / folder (hanya foto belum ditandai). */
  saran: { id: string; nama: string } | null;
};

export async function daftarFoto(where: Prisma.menu_photosWhereInput): Promise<FotoTampil[]> {
  const foto = await prisma.menu_photos.findMany({
    where,
    orderBy: [{ is_cover: "desc" }, { hidden: "asc" }, { created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      file_key: true,
      thumb_key: true,
      width: true,
      height: true,
      serving: true,
      caption: true,
      is_cover: true,
      hidden: true,
      original_name: true,
      menus: { select: { name: true } },
      packages: { select: { code: true, name: true } },
      events: { select: { name: true, customers: { select: { name: true } } } },
    },
  });
  const perluTebak = foto.some((f) => !f.menus && !f.packages && f.original_name);
  const tebak = perluTebak
    ? buatPenebakMenu(
        await penentuMenu(),
        (await prisma.menus.findMany({ where: { active: true, merged_into: null }, select: { id: true, name: true } })).map((m) => ({ id: m.id.toString(), nama: m.name })),
      )
    : () => null;
  return foto.map((f) => ({
    id: f.id.toString(),
    thumb: alamatPublik(f.thumb_key),
    utama: alamatPublik(f.file_key),
    lebar: f.width,
    tinggi: f.height,
    sajian: f.serving,
    keterangan: f.caption,
    utamaMenu: f.is_cover,
    sembunyi: f.hidden,
    namaAsli: f.original_name,
    tujuan: f.menus?.name ?? (f.packages ? `${f.packages.code} ${f.packages.name}` : null),
    acara: f.events ? `${f.events.customers.name}${f.events.name && f.events.name !== "Event" ? ` · ${f.events.name}` : ""}` : null,
    saran: !f.menus && !f.packages ? tebak(f.original_name) : null,
  }));
}

/** Pilihan menu (beserta nama lainnya) & paket untuk "Tandai ke…". Dengan `idEvent`: menu acara itu di urutan teratas. */
export async function opsiTujuan(idEvent?: bigint) {
  const [menu, paket] = await Promise.all([
    prisma.menus.findMany({ where: { active: true, merged_into: null }, orderBy: { name: "asc" }, select: { id: true, name: true, menu_aliases: { select: { name: true } } } }),
    prisma.packages.findMany({ where: { status: "aktif" }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]);
  const dariAcara = new Set(idEvent ? (await menuAcara(idEvent)).flatMap((m) => (m.idMenu ? [m.idMenu] : [])) : []);
  const urut = [...menu.filter((m) => dariAcara.has(m.id.toString())), ...menu.filter((m) => !dariAcara.has(m.id.toString()))];
  return {
    menu: urut.map((m) => ({
      id: m.id.toString(),
      label: m.name,
      sub: dariAcara.has(m.id.toString()) ? "menu acara ini" : m.menu_aliases.length ? `juga: ${m.menu_aliases.map((a) => a.name).join(", ")}` : undefined,
    })),
    paket: paket.map((p) => ({ id: p.id.toString(), label: `${p.code} ${p.name}` })),
  };
}

export type KelompokFoto = { judul: string; href: string; jumlah: number; foto: { id: string; thumb: string; utama: string; tujuan: string }[] };

/**
 * Foto untuk dokumen (Paket / Quotation, D-125): foto paketnya + foto tiap menu di dalamnya, foto utama dulu,
 * maks 6 per kelompok. `nama` = isi yang hanya berupa teks — dicocokkan lewat penentu menu dapur (tanpa tebakan "mirip").
 */
export async function fotoDokumen({ paket = [], menu = [], nama = [] }: { paket?: bigint[]; menu?: bigint[]; nama?: string[] }): Promise<KelompokFoto[]> {
  const idMenu = [...menu];
  if (nama.length) {
    const { cari } = await penentuMenu();
    for (const n of nama) {
      const t = cari(n);
      if (t && t.cara !== "mirip") idMenu.push(BigInt(t.id));
    }
  }
  const urutMenu = [...new Set(idMenu.map(String))].map(BigInt);
  if (!paket.length && !urutMenu.length) return [];
  const foto = await prisma.menu_photos.findMany({
    where: { hidden: false, OR: [{ package_id: { in: paket } }, { menu_id: { in: urutMenu } }] },
    orderBy: [{ is_cover: "desc" }, { id: "asc" }],
    select: { id: true, menu_id: true, package_id: true, file_key: true, thumb_key: true, menus: { select: { name: true } }, packages: { select: { code: true, name: true } } },
  });
  const kelompok = (kunci: "package_id" | "menu_id", id: bigint): KelompokFoto | null => {
    const f = foto.filter((x) => x[kunci] === id);
    if (!f.length) return null;
    const judul = kunci === "package_id" ? `${f[0].packages!.code} ${f[0].packages!.name}` : f[0].menus!.name;
    return {
      judul,
      href: kunci === "package_id" ? `/foto-menu/p/${id}` : `/foto-menu/m/${id}`,
      jumlah: f.length,
      foto: f.slice(0, 6).map((x) => ({ id: x.id.toString(), thumb: alamatPublik(x.thumb_key), utama: alamatPublik(x.file_key), tujuan: judul })),
    };
  };
  return [...[...new Set(paket.map(String))].map((p) => kelompok("package_id", BigInt(p))), ...urutMenu.map((m) => kelompok("menu_id", m))].filter((k): k is KelompokFoto => k !== null);
}
