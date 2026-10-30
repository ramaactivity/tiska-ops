import "server-only";

import type { Prisma } from "@prisma/client";

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
    },
  });
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
  }));
}

/** Pilihan menu (beserta nama lainnya) & paket untuk "Tandai ke…". */
export async function opsiTujuan() {
  const [menu, paket] = await Promise.all([
    prisma.menus.findMany({ where: { active: true, merged_into: null }, orderBy: { name: "asc" }, select: { id: true, name: true, menu_aliases: { select: { name: true } } } }),
    prisma.packages.findMany({ where: { status: "aktif" }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]);
  return {
    menu: menu.map((m) => ({ id: m.id.toString(), label: m.name, sub: m.menu_aliases.length ? `juga: ${m.menu_aliases.map((a) => a.name).join(", ")}` : undefined })),
    paket: paket.map((p) => ({ id: p.id.toString(), label: `${p.code} ${p.name}` })),
  };
}
