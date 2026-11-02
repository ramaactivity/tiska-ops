import "server-only";

import type { Prisma } from "@prisma/client";

import { jenisTautan } from "./hitung/aset";
import { prisma } from "./prisma";

/* Aset Digital (D-127) — pembacaan untuk halaman Aset & bagian dokumentasi di Event. */

export type AsetTampil = {
  id: string;
  judul: string;
  url: string;
  kategori: string;
  catatan: string | null;
  sematkan: boolean;
  jenis: ReturnType<typeof jenisTautan>;
  acara: { id: string; nama: string } | null;
};

const tglAcara = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const namaAcara = (e: { name: string; first_date: Date | null; customers: { name: string } }) =>
  `${e.customers.name}${e.name && e.name !== "Event" ? ` · ${e.name}` : ""}${e.first_date ? ` · ${tglAcara.format(e.first_date)}` : ""}`;

export async function daftarAset(where: Prisma.digital_assetsWhereInput = {}): Promise<AsetTampil[]> {
  const a = await prisma.digital_assets.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updated_at: "desc" }, { id: "desc" }],
    select: { id: true, title: true, url: true, category: true, note: true, pinned: true, events: { select: { id: true, name: true, first_date: true, customers: { select: { name: true } } } } },
  });
  return a.map((x) => ({
    id: x.id.toString(),
    judul: x.title,
    url: x.url,
    kategori: x.category,
    catatan: x.note,
    sematkan: x.pinned,
    jenis: jenisTautan(x.url),
    acara: x.events ? { id: x.events.id.toString(), nama: namaAcara(x.events) } : null,
  }));
}

/** Pilihan acara untuk "Dokumentasi acara": 13 bulan terakhir + yang akan datang, terbaru dulu. */
export async function opsiAcara() {
  const e = await prisma.events.findMany({
    where: { status: { not: "batal" }, first_date: { gte: new Date(Date.now() - 400 * 86_400_000) } },
    orderBy: { first_date: "desc" },
    take: 400,
    select: { id: true, name: true, first_date: true, customers: { select: { name: true } } },
  });
  return e.map((x) => ({ id: x.id.toString(), label: namaAcara(x) }));
}
