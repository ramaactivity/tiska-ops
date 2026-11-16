"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GRUP_CETAKAN, type GrupCetakan } from "@/lib/hitung/cetakan";
import { aksesPenuh } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Cetakan (D-182): ubah & tambah data katalog. Tahap 1 hanya admin/owner (Rama yang memesan ke percetakan). */

type Hasil = { ok: true; pesan: string } | { ok: false; pesan: string };
const angkaId = z.string().regex(/^\d+$/);
const teks = (maks: number) => z.string().trim().max(maks);
const angka = (pesan: string) => z.number({ error: pesan }).positive(pesan).nullable();

const skema = z.object({
  id: angkaId.nullish(),
  nama: z.string().trim().min(2, "Isi nama cetakan.").max(150),
  grup: z.enum(Object.keys(GRUP_CETAKAN) as [GrupCetakan, ...GrupCetakan[]], { error: "Pilih kelompok." }),
  jenis: z.enum(["stok", "pesanan"]),
  bentuk: z.enum(["persegi", "lingkaran"]),
  lebarMm: angka("Lebar harus angka lebih dari 0."),
  tinggiMm: angka("Tinggi harus angka lebih dari 0."),
  bahan: teks(100),
  finishing: teks(255),
  isiPerA3: z.number().int("Isi per A3 harus bilangan bulat.").positive().nullable(),
  hargaPerA3: z.number().int().min(0).nullable(),
  catatanHarga: teks(255),
  judulChat: teks(150),
  ukuranChat: teks(100),
  canva: teks(500),
  catatan: teks(2000),
  percetakanId: angkaId.nullish(),
});

export async function simpanCetakan(input: z.input<typeof skema>): Promise<Hasil> {
  const sesi = await pastikanIzin("cetakan");
  if (!aksesPenuh(sesi.peran)) return { ok: false, pesan: "Hanya admin atau owner yang bisa mengubah katalog cetakan." };
  const p = skema.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  const d = p.data;
  if (d.canva && !/^https:\/\/(www\.)?canva\.(com|link)\//i.test(d.canva)) return { ok: false, pesan: "Link Canva harus diawali https://www.canva.com/ atau https://canva.link/." };
  const kosong = (s: string) => s || null;
  const data = {
    name: d.nama,
    grup: d.grup,
    kind: d.jenis,
    shape: d.bentuk,
    width_mm: d.lebarMm,
    height_mm: d.tinggiMm,
    material: kosong(d.bahan),
    finishing: kosong(d.finishing),
    pcs_per_sheet: d.isiPerA3,
    price_per_sheet: d.hargaPerA3,
    price_note: kosong(d.catatanHarga),
    chat_label: kosong(d.judulChat),
    size_text: kosong(d.ukuranChat),
    canva_url: kosong(d.canva),
    // Link pendek canva.link tidak memuat id desain: id lama dipertahankan, bukan dihapus.
    ...(d.canva.match(/\/design\/(D[\w-]{10})/) ? { canva_design_id: d.canva.match(/\/design\/(D[\w-]{10})/)![1] } : {}),
    notes: kosong(d.catatan),
    supplier_id: d.percetakanId ? BigInt(d.percetakanId) : null,
    updated_at: new Date(),
  };
  try {
    if (d.id) {
      const ada = await prisma.print_items.update({ where: { id: BigInt(d.id) }, data, select: { id: true } }).catch(() => null);
      if (!ada) return { ok: false, pesan: "Cetakan ini sudah dihapus. Muat ulang halaman." };
    } else {
      await prisma.print_items.create({ data: { ...data, created_by: BigInt(sesi.id) } });
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("print_items_canva_unik")) return { ok: false, pesan: "Desain Canva ini sudah dipakai cetakan lain." };
    throw e;
  }
  revalidatePath("/cetakan");
  return { ok: true, pesan: d.id ? "Data cetakan diperbarui." : "Cetakan ditambahkan." };
}
