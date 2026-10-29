"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { calonMirip } from "@/lib/cari-mirip";
import { kunciMenu } from "@/lib/hitung/menu-dapur";
import { KATEGORI_MENU } from "@/lib/menu";
import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { uraikanRupiah } from "@/lib/uang";

export type KeadaanMenu = { sukses?: boolean; pesan?: string; galat?: Record<string, string | undefined>; /** Nama mirip menu lain — form menampilkan centang "Ini memang menu berbeda". */ mirip?: boolean; /** Nama yang diketik, supaya tidak hilang saat form dikembalikan. */ nama?: string };

const kosongNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const skema = z.object({
  /** Kosong = menu baru. */
  id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullish()),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(255),
  category: z.preprocess(kosongNull, z.enum(Object.keys(KATEGORI_MENU) as [string, ...string[]]).nullable()),
  kitchen: z.preprocess(kosongNull, z.enum(["masak", "pastry"]).nullable()),
  recipe_id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullable()),
  active: z.enum(["ya", "tidak"]),
});

/** Menu baru (tanpa id) atau ubah; dihubungkan ke resep oleh Kepala Dapur / owner (D-033). */
export async function simpanMenu(_s: KeadaanMenu, data: FormData): Promise<KeadaanMenu> {
  const sesi = await pastikanIzin("menu");
  if (!bolehUbahResep(sesi.peran)) return { pesan: "Hanya Kepala Dapur atau owner yang bisa mengubah menu." };

  const hasil = skema.safeParse(Object.fromEntries(data));
  const faktor = uraikanRupiah(data.get("portion_factor"));
  if (!hasil.success || !faktor || faktor.lte(0)) {
    const bidang = hasil.success ? {} : z.flattenError(hasil.error).fieldErrors;
    return {
      galat: {
        ...Object.fromEntries(Object.entries(bidang).map(([k, v]) => [k, v?.[0]])),
        ...(!faktor || faktor.lte(0) ? { portion_factor: "Isi angka lebih dari 0, contoh: 1 atau 0,5" } : {}),
      },
    };
  }
  const { id, recipe_id, active, ...isi } = hasil.data;

  // Cegah menu kembar (D-122): nama yang sama setelah dirapikan / sudah jadi nama lain ditolak;
  // nama mirip harus dikonfirmasi "Ini memang menu berbeda".
  const lama = id ? await prisma.menus.findUnique({ where: { id: BigInt(id) }, select: { name: true } }) : null;
  if (!lama || kunciMenu(lama.name) !== kunciMenu(isi.name)) {
    const k = kunciMenu(isi.name);
    const [lain, alias] = await Promise.all([
      prisma.menus.findMany({ where: { active: true, ...(id ? { NOT: { id: BigInt(id) } } : {}) }, select: { name: true } }),
      prisma.menu_aliases.findMany({ select: { name: true, menu_id: true, menus: { select: { name: true } } } }),
    ]);
    const sama = lain.find((m) => kunciMenu(m.name) === k);
    if (sama) return { nama: isi.name, galat: { name: `Sudah ada menu "${sama.name}". Pakai menu itu, atau ganti namanya.` } };
    const namaLain = alias.find((a) => kunciMenu(a.name) === k && a.menu_id.toString() !== id);
    if (namaLain) return { nama: isi.name, galat: { name: `"${namaLain.name}" sudah jadi nama lain dari menu "${namaLain.menus.name}".` } };
    const mirip = calonMirip(isi.name, lain, (m) => m.name, 0.75, 2);
    if (mirip.length && data.get("beda_menu") !== "ya") {
      return {
        mirip: true,
        nama: isi.name,
        galat: { name: `Mirip dengan ${mirip.map((m) => `"${m.x.name}"`).join(" dan ")}. Sudah ada? Kalau memang menu berbeda, centang di bawah lalu simpan lagi.` },
      };
    }
  }

  const kolom = {
    ...isi,
    recipe_id: recipe_id ? BigInt(recipe_id) : null,
    portion_factor: faktor.toString(),
    active: active === "ya",
    updated_at: new Date(),
  };
  let idBaru: bigint | null = null;
  try {
    if (id) await prisma.menus.update({ where: { id: BigInt(id) }, data: kolom });
    else idBaru = (await prisma.menus.create({ data: { ...kolom, created_at: kolom.updated_at }, select: { id: true } })).id;
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) return { galat: { name: "Nama menu ini sudah dipakai menu lain." } };
    return { pesan: "Menu gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/menu");
  revalidatePath("/paket", "layout");
  if (idBaru) redirect(`/menu/${idBaru}`);
  revalidatePath(`/menu/${id}`);
  return { sukses: true, pesan: "Menu disimpan." };
}

/* ---------- Rapikan Menu (D-122): satu menu dapur, banyak nama jual ---------- */

type Hasil = { ok: boolean; pesan: string };
const idSah = (v: string) => /^\d+$/.test(v);
async function bolehRapikan() {
  const sesi = await pastikanIzin("menu");
  return bolehUbahResep(sesi.peran) ? sesi : null;
}
function segarkan() {
  revalidatePath("/menu", "layout");
  revalidatePath("/paket", "layout");
  revalidatePath("/kebutuhan-bahan");
}

/** Pilihan paket bernama `nama` yang belum tersambung → sambungkan ke menu ini. */
async function sambungkanPilihanBernama(tx: Pick<typeof prisma, "package_slot_options">, nama: string, idMenu: bigint) {
  const k = kunciMenu(nama);
  const opsi = await tx.package_slot_options.findMany({ where: { menu_id: null }, select: { id: true, name: true } });
  const id = opsi.filter((o) => kunciMenu(o.name) === k).map((o) => o.id);
  if (id.length) await tx.package_slot_options.updateMany({ where: { id: { in: id } }, data: { menu_id: idMenu } });
  return id.length;
}

/**
 * Gabungkan menu kembar ke satu menu dapur. Semua yang menunjuk menu lain
 * (isi paket, pilihan paket, isi quotation/invoice, Ikut Menu Pesta, nama lainnya)
 * dipindah ke induk; nama menu lain jadi nama lain induk; menu lain dinonaktifkan
 * dan diberi penunjuk induk — tidak dihapus. Teks dokumen yang sudah tercetak tidak berubah.
 */
export async function gabungkanMenu(idInduk: string, idLain: string[], idResep: string | null): Promise<Hasil> {
  const sesi = await bolehRapikan();
  if (!sesi) return { ok: false, pesan: "Hanya Kepala Dapur, admin, atau owner yang bisa merapikan menu." };
  const lain = [...new Set(idLain)].filter((x) => x !== idInduk);
  if (!idSah(idInduk) || !lain.length || !lain.every(idSah) || (idResep !== null && !idSah(idResep))) return { ok: false, pesan: "Pilih menu induk dan minimal satu menu yang digabung." };
  const semua = await prisma.menus.findMany({
    where: { id: { in: [idInduk, ...lain].map(BigInt) } },
    select: { id: true, name: true, active: true, recipe_id: true, category: true, kitchen: true, merged_into: true },
  });
  const induk = semua.find((m) => m.id.toString() === idInduk);
  if (!induk || semua.length !== lain.length + 1) return { ok: false, pesan: "Menu tidak ditemukan. Muat ulang halaman." };
  if (induk.merged_into) return { ok: false, pesan: `"${induk.name}" sudah digabung ke menu lain — pilih induk yang aktif.` };
  const anak = semua.filter((m) => m !== induk);
  // Induk tanpa resep memakai resep menu yang digabung (bila ada).
  const resep = idResep ? BigInt(idResep) : (induk.recipe_id ?? anak.find((m) => m.recipe_id)?.recipe_id ?? null);
  const I = induk.id;

  await prisma.$transaction(async (tx) => {
    for (const m of anak) {
      const w = { menu_id: m.id };
      await tx.package_items.updateMany({ where: w, data: { menu_id: I } });
      await tx.package_slot_options.updateMany({ where: w, data: { menu_id: I } });
      await tx.retail_program_set_items.updateMany({ where: w, data: { menu_id: I } });
      await tx.quotation_items.updateMany({ where: w, data: { menu_id: I } });
      await tx.quotation_items.updateMany({ where: { swapped_from_menu_id: m.id }, data: { swapped_from_menu_id: I } });
      await tx.invoice_items.updateMany({ where: w, data: { menu_id: I } });
      await tx.invoice_items.updateMany({ where: { swapped_from_menu_id: m.id }, data: { swapped_from_menu_id: I } });
      await tx.menu_aliases.updateMany({ where: w, data: { menu_id: I } });
      await tx.menus.updateMany({ where: { merged_into: m.id }, data: { merged_into: I } });
      const k = kunciMenu(m.name);
      if (k && k !== kunciMenu(induk.name) && !(await tx.menu_aliases.findUnique({ where: { name_key: k } }))) {
        await tx.menu_aliases.create({ data: { menu_id: I, name: m.name, name_key: k, created_by: BigInt(sesi.id) } });
      }
      await tx.menus.update({ where: { id: m.id }, data: { active: false, merged_into: I, updated_at: new Date() } });
    }
    await tx.menus.update({
      where: { id: I },
      data: {
        recipe_id: resep,
        category: induk.category ?? anak.find((m) => m.category)?.category ?? null,
        kitchen: induk.kitchen ?? anak.find((m) => m.kitchen)?.kitchen ?? null,
        active: true,
        updated_at: new Date(),
      },
    });
  });
  segarkan();
  return { ok: true, pesan: `${anak.length} menu digabung ke "${induk.name}".` };
}

/** Tambah nama lain (nama jual) ke menu dapur. */
export async function tambahNamaLain(idMenu: string, nama: string): Promise<Hasil> {
  const sesi = await bolehRapikan();
  if (!sesi) return { ok: false, pesan: "Hanya Kepala Dapur, admin, atau owner yang bisa merapikan menu." };
  const t = nama.trim();
  const k = kunciMenu(t);
  if (!idSah(idMenu) || k.length < 2 || t.length > 255) return { ok: false, pesan: "Tulis nama lainnya." };
  const m = await prisma.menus.findUnique({ where: { id: BigInt(idMenu) }, select: { id: true, name: true, active: true } });
  if (!m?.active) return { ok: false, pesan: "Menu tidak aktif." };
  if (kunciMenu(m.name) === k) return { ok: false, pesan: "Itu nama menunya sendiri — tidak perlu ditambah." };
  const menuLain = (await prisma.menus.findMany({ where: { active: true, NOT: { id: m.id } }, select: { name: true } })).find((x) => kunciMenu(x.name) === k);
  if (menuLain) return { ok: false, pesan: `"${menuLain.name}" masih menu sendiri. Kalau sama, pakai Gabungkan supaya paket & resepnya ikut pindah.` };
  const ada = await prisma.menu_aliases.findUnique({ where: { name_key: k }, select: { menu_id: true, menus: { select: { name: true } } } });
  if (ada) return ada.menu_id === m.id ? { ok: true, pesan: "Nama lain ini sudah ada." } : { ok: false, pesan: `Sudah jadi nama lain dari "${ada.menus.name}".` };
  const n = await prisma.$transaction(async (tx) => {
    await tx.menu_aliases.create({ data: { menu_id: m.id, name: t, name_key: k, created_by: BigInt(sesi.id) } });
    return sambungkanPilihanBernama(tx, t, m.id);
  });
  segarkan();
  return { ok: true, pesan: `"${t}" sekarang dihitung sebagai "${m.name}".${n ? ` ${n} pilihan paket ikut tersambung.` : ""}` };
}

export async function hapusNamaLain(idAlias: string): Promise<Hasil> {
  if (!(await bolehRapikan())) return { ok: false, pesan: "Hanya Kepala Dapur, admin, atau owner yang bisa merapikan menu." };
  if (!idSah(idAlias)) return { ok: false, pesan: "Permintaan tidak sah." };
  await prisma.menu_aliases.deleteMany({ where: { id: BigInt(idAlias) } });
  segarkan();
  return { ok: true, pesan: "Nama lain dihapus." };
}

export async function sambungkanResep(idMenu: string, idResep: string): Promise<Hasil> {
  if (!(await bolehRapikan())) return { ok: false, pesan: "Hanya Kepala Dapur, admin, atau owner yang bisa merapikan menu." };
  if (!idSah(idMenu) || !idSah(idResep)) return { ok: false, pesan: "Pilih resepnya." };
  const [m, r] = await Promise.all([
    prisma.menus.findUnique({ where: { id: BigInt(idMenu) }, select: { name: true } }),
    prisma.recipes.findUnique({ where: { id: BigInt(idResep) }, select: { name: true } }),
  ]);
  if (!m || !r) return { ok: false, pesan: "Menu atau resep tidak ditemukan." };
  await prisma.menus.update({ where: { id: BigInt(idMenu) }, data: { recipe_id: BigInt(idResep), updated_at: new Date() } });
  segarkan();
  return { ok: true, pesan: `"${m.name}" tersambung ke resep "${r.name}".` };
}

/** Nama yang belum dikenal (dari pilihan paket / dokumen) → menu baru, pilihan paket bernama sama ikut tersambung. */
export async function buatMenuDariNama(nama: string, kategori: string | null): Promise<Hasil> {
  const sesi = await bolehRapikan();
  if (!sesi) return { ok: false, pesan: "Hanya Kepala Dapur, admin, atau owner yang bisa merapikan menu." };
  const t = nama.trim();
  const k = kunciMenu(t);
  if (k.length < 2 || t.length > 255) return { ok: false, pesan: "Nama menu belum benar." };
  if (kategori && !(kategori in KATEGORI_MENU)) return { ok: false, pesan: "Kategori tidak dikenal." };
  const [menu, alias] = await Promise.all([prisma.menus.findMany({ select: { name: true } }), prisma.menu_aliases.findMany({ select: { name: true } })]);
  const ada = [...menu, ...alias].find((x) => kunciMenu(x.name) === k);
  if (ada) return { ok: false, pesan: `Sudah ada: "${ada.name}".` };
  const n = await prisma.$transaction(async (tx) => {
    const baru = await tx.menus.create({ data: { name: t, category: kategori, active: true, created_at: new Date(), updated_at: new Date() }, select: { id: true } });
    return sambungkanPilihanBernama(tx, t, baru.id);
  });
  segarkan();
  return { ok: true, pesan: `Menu "${t}" dibuat${n ? `, ${n} pilihan paket tersambung` : ""}. Sambungkan resepnya di daftar "Belum ada resep".` };
}

/** Saran yang ditandai "bukan" tidak muncul lagi. */
export async function lewatiSaran(jenis: "kembar" | "resep" | "nama", a: string, b: string): Promise<Hasil> {
  const sesi = await bolehRapikan();
  if (!sesi) return { ok: false, pesan: "Hanya Kepala Dapur, admin, atau owner yang bisa merapikan menu." };
  if (!["kembar", "resep", "nama"].includes(jenis) || !a || !b || a.length > 255 || b.length > 255) return { ok: false, pesan: "Permintaan tidak sah." };
  const [x, y] = jenis === "kembar" ? [a, b].sort() : [a, b];
  await prisma.menu_review_skips.upsert({
    where: { kind_a_key_b_key: { kind: jenis, a_key: x, b_key: y } },
    create: { kind: jenis, a_key: x, b_key: y, created_by: BigInt(sesi.id) },
    update: {},
  });
  revalidatePath("/menu/rapikan");
  return { ok: true, pesan: "Saran disembunyikan." };
}
