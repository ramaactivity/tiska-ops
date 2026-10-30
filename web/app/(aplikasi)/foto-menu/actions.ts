"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { kunciSah, SAJIAN } from "@/lib/hitung/foto-menu";
import { aksesPenuh } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { hapusBerkas, tautanUnggah, ukuranBerkas } from "@/lib/r2";
import { pastikanIzin } from "@/lib/rbac";

/* Foto Menu (D-124): unggah langsung ke R2, catat, tandai ke menu/paket, rapikan. Hapus = admin/owner saja. */

type Hasil = { ok: true; pesan: string } | { ok: false; pesan: string };
const id = z.string().regex(/^\d+$/);
const sajian = z.enum(Object.keys(SAJIAN) as [keyof typeof SAJIAN, ...(keyof typeof SAJIAN)[]]).nullable();

function segarkan() {
  revalidatePath("/foto-menu", "layout");
}

/** Menu/paket yang kehilangan foto utama (disembunyikan/dihapus) → foto tampil pertama jadi utama. */
async function pastikanUtama(target: { menu_id: bigint | null; package_id: bigint | null }[]) {
  for (const t of target) {
    const w = t.menu_id ? { menu_id: t.menu_id } : t.package_id ? { package_id: t.package_id } : null;
    if (!w || (await prisma.menu_photos.count({ where: { ...w, is_cover: true } }))) continue;
    const pertama = await prisma.menu_photos.findFirst({ where: { ...w, hidden: false }, orderBy: { id: "asc" }, select: { id: true } });
    if (pertama) await prisma.menu_photos.update({ where: { id: pertama.id }, data: { is_cover: true } });
  }
}

/** Tautan unggah sementara untuk `jumlah` foto (utama + thumbnail). */
export async function mintaUnggah(jumlah: number): Promise<{ ok: true; slot: { kunci: string; kunciThumb: string; urlUtama: string; urlThumb: string }[] } | { ok: false; pesan: string }> {
  await pastikanIzin("foto-menu");
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 20) return { ok: false, pesan: "Maksimal 20 foto per kiriman." };
  const tahun = new Date().getFullYear();
  const slot = await Promise.all(
    Array.from({ length: jumlah }, async () => {
      const kunci = `menu/${tahun}/${randomUUID()}.jpg`;
      const kunciThumb = kunci.replace(/\.jpg$/, "_t.jpg");
      return { kunci, kunciThumb, urlUtama: await tautanUnggah(kunci, "image/jpeg"), urlThumb: await tautanUnggah(kunciThumb, "image/jpeg") };
    }),
  );
  return { ok: true, slot };
}

const skemaSimpan = z
  .array(
    z.object({
      kunci: z.string().max(200),
      kunciThumb: z.string().max(200),
      lebar: z.number().int().min(1).max(10000),
      tinggi: z.number().int().min(1).max(10000),
      namaAsli: z.string().max(255).nullish(),
      idMenu: id.nullish(),
      idPaket: id.nullish(),
      sajian: sajian.optional(),
    }),
  )
  .min(1)
  .max(20);

/** Catat foto yang sudah terunggah. Berkasnya dicek ada di R2 dulu; menu/paket tanpa foto utama → foto pertama jadi utama. */
export async function simpanFoto(input: z.input<typeof skemaSimpan>): Promise<Hasil> {
  const sesi = await pastikanIzin("foto-menu");
  const cek = skemaSimpan.safeParse(input);
  if (!cek.success || !cek.data.every((f) => kunciSah(f.kunci, f.kunciThumb))) return { ok: false, pesan: "Data foto tidak sah. Coba unggah lagi." };
  const ukuran = await Promise.all(cek.data.map((f) => Promise.all([ukuranBerkas(f.kunci), ukuranBerkas(f.kunciThumb)])));
  const sampai = cek.data.filter((_, i) => ukuran[i][0] && ukuran[i][1]);
  if (!sampai.length) return { ok: false, pesan: "Foto belum terunggah. Periksa sinyal lalu coba lagi." };

  await prisma.$transaction(async (tx) => {
    for (const f of sampai) {
      const target = f.idMenu ? { menu_id: BigInt(f.idMenu) } : f.idPaket ? { package_id: BigInt(f.idPaket) } : null;
      const punyaUtama = target ? (await tx.menu_photos.count({ where: { ...target, is_cover: true } })) > 0 : true;
      await tx.menu_photos.create({
        data: {
          ...(target ?? {}),
          file_key: f.kunci,
          thumb_key: f.kunciThumb,
          width: f.lebar,
          height: f.tinggi,
          size_bytes: ukuran[cek.data.indexOf(f)][0]!,
          original_name: f.namaAsli ?? null,
          serving: f.sajian ?? null,
          is_cover: !punyaUtama,
          uploaded_by: BigInt(sesi.id),
        },
      });
    }
  });
  segarkan();
  const gagal = cek.data.length - sampai.length;
  return { ok: true, pesan: `${sampai.length} foto tersimpan.${gagal ? ` ${gagal} gagal terunggah — coba lagi.` : ""}` };
}

/** Tandai banyak foto ke satu menu / paket (atau lepas tanda: dua-duanya null), sekalian bentuk sajian. */
export async function tandaiFoto(ids: string[], tujuan: { idMenu?: string | null; idPaket?: string | null }, sajianBaru?: string | null): Promise<Hasil> {
  await pastikanIzin("foto-menu");
  if (!ids.length || !ids.every((x) => id.safeParse(x).success)) return { ok: false, pesan: "Pilih fotonya dulu." };
  if ((tujuan.idMenu && !id.safeParse(tujuan.idMenu).success) || (tujuan.idPaket && !id.safeParse(tujuan.idPaket).success)) return { ok: false, pesan: "Tujuan tidak sah." };
  const s = sajianBaru === undefined ? undefined : sajian.safeParse(sajianBaru);
  if (s && !s.success) return { ok: false, pesan: "Bentuk sajian tidak dikenal." };
  const menu_id = tujuan.idMenu ? BigInt(tujuan.idMenu) : null;
  const package_id = !menu_id && tujuan.idPaket ? BigInt(tujuan.idPaket) : null;
  const asal = await prisma.menu_photos.findMany({ where: { id: { in: ids.map(BigInt) } }, distinct: ["menu_id", "package_id"], select: { menu_id: true, package_id: true } });
  await prisma.$transaction(async (tx) => {
    await tx.menu_photos.updateMany({
      where: { id: { in: ids.map(BigInt) } },
      data: { menu_id, package_id, is_cover: false, ...(s?.success ? { serving: s.data } : {}), updated_at: new Date() },
    });
    // Menu/paket tujuan belum punya foto utama → foto pertama jadi utama.
    if (menu_id || package_id) {
      const w = menu_id ? { menu_id } : { package_id };
      if (!(await tx.menu_photos.count({ where: { ...w, is_cover: true } })))
        await tx.menu_photos.update({ where: { id: BigInt(ids[0]) }, data: { is_cover: true } });
    }
  });
  await pastikanUtama(asal);
  segarkan();
  return { ok: true, pesan: menu_id || package_id ? `${ids.length} foto ditandai.` : `${ids.length} foto dikembalikan ke "Belum ditandai".` };
}

export async function aturFoto(idFoto: string, isi: { sajian?: string | null; keterangan?: string | null }): Promise<Hasil> {
  await pastikanIzin("foto-menu");
  if (!id.safeParse(idFoto).success) return { ok: false, pesan: "Foto tidak dikenal." };
  const s = isi.sajian === undefined ? undefined : sajian.safeParse(isi.sajian);
  if (s && !s.success) return { ok: false, pesan: "Bentuk sajian tidak dikenal." };
  const keterangan = isi.keterangan === undefined ? undefined : (isi.keterangan ?? "").trim().slice(0, 300) || null;
  await prisma.menu_photos.update({
    where: { id: BigInt(idFoto) },
    data: { ...(s?.success ? { serving: s.data } : {}), ...(keterangan !== undefined ? { caption: keterangan } : {}), updated_at: new Date() },
  });
  segarkan();
  return { ok: true, pesan: "Foto diperbarui." };
}

export async function jadikanUtama(idFoto: string): Promise<Hasil> {
  await pastikanIzin("foto-menu");
  if (!id.safeParse(idFoto).success) return { ok: false, pesan: "Foto tidak dikenal." };
  const f = await prisma.menu_photos.findUnique({ where: { id: BigInt(idFoto) }, select: { menu_id: true, package_id: true } });
  if (!f || (!f.menu_id && !f.package_id)) return { ok: false, pesan: "Tandai fotonya ke menu atau paket dulu." };
  const w = f.menu_id ? { menu_id: f.menu_id } : { package_id: f.package_id };
  await prisma.$transaction([
    prisma.menu_photos.updateMany({ where: { ...w, is_cover: true }, data: { is_cover: false } }),
    prisma.menu_photos.update({ where: { id: BigInt(idFoto) }, data: { is_cover: true, hidden: false, updated_at: new Date() } }),
  ]);
  segarkan();
  return { ok: true, pesan: "Jadi foto utama." };
}

/** Sembunyikan / tampilkan lagi — semua yang boleh membuka Foto Menu. Foto tersembunyi tidak ikut dikirim. */
export async function sembunyikanFoto(ids: string[], sembunyi: boolean): Promise<Hasil> {
  await pastikanIzin("foto-menu");
  if (!ids.length || !ids.every((x) => id.safeParse(x).success)) return { ok: false, pesan: "Pilih fotonya dulu." };
  const target = await prisma.menu_photos.findMany({ where: { id: { in: ids.map(BigInt) } }, distinct: ["menu_id", "package_id"], select: { menu_id: true, package_id: true } });
  await prisma.menu_photos.updateMany({
    where: { id: { in: ids.map(BigInt) } },
    data: { hidden: sembunyi, ...(sembunyi ? { is_cover: false } : {}), updated_at: new Date() },
  });
  await pastikanUtama(target);
  segarkan();
  return { ok: true, pesan: sembunyi ? `${ids.length} foto disembunyikan.` : `${ids.length} foto ditampilkan lagi.` };
}

/** Hapus permanen (database + berkas R2) — hanya admin/owner (keputusan Rama 30 Okt). */
export async function hapusFoto(ids: string[]): Promise<Hasil> {
  const sesi = await pastikanIzin("foto-menu");
  if (!aksesPenuh(sesi.peran)) return { ok: false, pesan: "Hanya admin atau owner yang bisa menghapus foto. Sembunyikan saja." };
  if (!ids.length || !ids.every((x) => id.safeParse(x).success)) return { ok: false, pesan: "Pilih fotonya dulu." };
  const foto = await prisma.menu_photos.findMany({ where: { id: { in: ids.map(BigInt) } }, select: { id: true, file_key: true, thumb_key: true, menu_id: true, package_id: true } });
  await prisma.menu_photos.deleteMany({ where: { id: { in: foto.map((f) => f.id) } } });
  await pastikanUtama(foto);
  await hapusBerkas(foto.flatMap((f) => [f.file_key, f.thumb_key])).catch(() => {});
  segarkan();
  return { ok: true, pesan: `${foto.length} foto dihapus.` };
}
