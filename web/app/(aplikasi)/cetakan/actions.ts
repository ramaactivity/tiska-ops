"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GRUP_CETAKAN, type GrupCetakan, ringkasPermintaan, tambahanStok } from "@/lib/hitung/cetakan";
import { pesanCetakDiminta, pesanCetakDiputus } from "@/lib/hitung/notifikasi";
import { hariIniWib } from "@/lib/kalender";
import { kirimNanti } from "@/lib/push";
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
  satuanStok: z.enum(["lembar", "pcs"]).default("lembar"),
  stokMin: z.number().int().min(0, "Stok minimum tidak boleh minus.").nullable().default(null),
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
    stock_unit: d.satuanStok,
    min_stock: d.stokMin,
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

/* ---------- Tahap 2 (D-183): minta cetak & stok ---------- */

const skemaMinta = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal dibutuhkan."),
  catatan: teks(500),
  baris: z
    .array(z.object({ itemId: angkaId, varianId: angkaId.nullable(), lembar: z.number().int().min(1).max(500) }))
    .min(1, "Pilih minimal satu cetakan."),
});

/** Dapur / sales / siapa pun yang boleh membuka Cetakan mengajukan permintaan; pemegang cetakan (admin) dapat notifikasi. */
export async function mintaCetak(input: z.input<typeof skemaMinta>): Promise<Hasil> {
  const sesi = await pastikanIzin("cetakan");
  const p = skemaMinta.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  if (p.data.tanggal < hariIniWib()) return { ok: false, pesan: "Tanggal dibutuhkan sudah lewat." };
  const ids = [...new Set(p.data.baris.map((b) => BigInt(b.itemId)))];
  const item = await prisma.print_items.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, name: true, print_item_variants: { select: { id: true, name: true } } } });
  const baris = p.data.baris.map((b) => {
    const i = item.find((x) => x.id === BigInt(b.itemId));
    const v = b.varianId ? i?.print_item_variants.find((x) => x.id === BigInt(b.varianId!)) : null;
    return { i, v, b };
  });
  if (baris.some((x) => !x.i || (x.b.varianId && !x.v))) return { ok: false, pesan: "Ada cetakan yang sudah tidak ada. Muat ulang halaman." };
  const dibuat = await prisma.print_requests.create({
    data: {
      requested_by: BigInt(sesi.id),
      needed_date: new Date(`${p.data.tanggal}T00:00:00Z`),
      note: p.data.catatan || null,
      print_request_lines: { create: baris.map((x) => ({ item_id: x.i!.id, variant_id: x.v?.id ?? null, sheets: x.b.lembar })) },
    },
    select: { id: true },
  });
  const ringkas = ringkasPermintaan(baris.map((x) => ({ nama: x.i!.name, varian: x.v?.name ?? null, lembar: x.b.lembar })));
  kirimNanti(["admin"], pesanCetakDiminta(sesi.nama, ringkas, p.data.tanggal, dibuat.id.toString()));
  revalidatePath("/cetakan");
  return { ok: true, pesan: "Permintaan terkirim. Kabarnya muncul di tab Permintaan." };
}

const AKSI_PUTUS = { setujui: "disetujui", perlu_tanya: "perlu_tanya", tolak: "ditolak" } as const;

/** Pemegang cetakan memutus permintaan: setujui (lalu dipesankan), perlu ditanya, atau tolak — peminta dapat kabar. */
export async function putuskanPermintaan(idPermintaan: string, aksi: keyof typeof AKSI_PUTUS, balasan: string): Promise<Hasil> {
  const sesi = await pastikanIzin("cetakan");
  if (!aksesPenuh(sesi.peran)) return { ok: false, pesan: "Hanya pemegang cetakan (admin/owner) yang memutus permintaan." };
  if (!angkaId.safeParse(idPermintaan).success || !(aksi in AKSI_PUTUS)) return { ok: false, pesan: "Permintaan tidak dikenal." };
  const teksBalasan = balasan.trim().slice(0, 500);
  if (aksi !== "setujui" && !teksBalasan) return { ok: false, pesan: aksi === "tolak" ? "Tulis alasannya supaya peminta mengerti." : "Tulis pertanyaannya." };
  const status = AKSI_PUTUS[aksi];
  const ubah = await prisma.print_requests.updateMany({
    where: { id: BigInt(idPermintaan), status: { in: ["diajukan", "perlu_tanya"] } },
    data: { status, reply: teksBalasan || null, decided_by: BigInt(sesi.id), decided_at: new Date(), updated_at: new Date() },
  });
  if (!ubah.count) return { ok: false, pesan: "Permintaan ini sudah diputus atau dibatalkan. Muat ulang halaman." };
  const p = await prisma.print_requests.findUnique({ where: { id: BigInt(idPermintaan) }, select: { requested_by: true } });
  if (p && p.requested_by !== BigInt(sesi.id)) kirimNanti([p.requested_by], pesanCetakDiputus(status, teksBalasan || null, idPermintaan));
  revalidatePath("/cetakan");
  return { ok: true, pesan: { setujui: "Disetujui. Isinya bisa langsung dimasukkan ke pesan percetakan.", perlu_tanya: "Pertanyaan terkirim ke peminta.", tolak: "Permintaan ditolak." }[aksi] };
}

/** Peminta membatalkan permintaannya sendiri selama belum disetujui. */
export async function batalkanPermintaan(idPermintaan: string): Promise<Hasil> {
  const sesi = await pastikanIzin("cetakan");
  if (!angkaId.safeParse(idPermintaan).success) return { ok: false, pesan: "Permintaan tidak dikenal." };
  const ubah = await prisma.print_requests.updateMany({
    where: { id: BigInt(idPermintaan), status: { in: ["diajukan", "perlu_tanya"] }, ...(aksesPenuh(sesi.peran) ? {} : { requested_by: BigInt(sesi.id) }) },
    data: { status: "batal", updated_at: new Date() },
  });
  if (!ubah.count) return { ok: false, pesan: "Permintaan ini sudah diproses — hubungi pemegang cetakan." };
  revalidatePath("/cetakan");
  return { ok: true, pesan: "Permintaan dibatalkan." };
}

/** Cetakan sudah diambil dari percetakan → cetakan stok tetap otomatis bertambah (lembar, atau pcs = lembar × isi per A3). */
export async function tandaiDiambil(idPermintaan: string): Promise<Hasil> {
  const sesi = await pastikanIzin("cetakan");
  if (!aksesPenuh(sesi.peran)) return { ok: false, pesan: "Hanya pemegang cetakan (admin/owner) yang menandai diambil." };
  if (!angkaId.safeParse(idPermintaan).success) return { ok: false, pesan: "Permintaan tidak dikenal." };
  const id = BigInt(idPermintaan);
  const hasil = await prisma.$transaction(async (tx) => {
    const ubah = await tx.print_requests.updateMany({ where: { id, status: { in: ["disetujui", "dipesan", "menunggu_bayar", "dibayar"] } }, data: { status: "diambil", updated_at: new Date() } });
    if (!ubah.count) return null;
    const baris = await tx.print_request_lines.findMany({ where: { request_id: id }, include: { print_items: { select: { kind: true, stock_unit: true, pcs_per_sheet: true } } } });
    const stok = baris.filter((b) => b.print_items.kind === "stok");
    if (stok.length)
      await tx.print_stock_movements.createMany({
        data: stok.map((b) => ({ item_id: b.item_id, variant_id: b.variant_id, kind: "masuk", qty: tambahanStok(b.sheets, b.print_items.stock_unit, b.print_items.pcs_per_sheet), note: `Diambil dari percetakan (permintaan #${idPermintaan})`, request_id: id, created_by: BigInt(sesi.id) })),
      });
    return (await tx.print_requests.findUnique({ where: { id }, select: { requested_by: true } }))!.requested_by;
  });
  if (hasil == null) return { ok: false, pesan: "Permintaan ini belum disetujui atau sudah ditutup." };
  if (hasil !== BigInt(sesi.id)) kirimNanti([hasil], pesanCetakDiputus("diambil", null, idPermintaan));
  revalidatePath("/cetakan");
  return { ok: true, pesan: "Ditandai sudah diambil. Stok cetakan bertambah." };
}

const skemaStok = z.object({
  itemId: angkaId,
  varianId: angkaId.nullable(),
  jenis: z.enum(["pakai", "masuk", "koreksi"]),
  jumlah: z.number().int().min(0).max(100_000),
  catatan: teks(255),
});

/** Catat stok: pakai (−), masuk (+), atau hitung ulang (stok fisik = jumlah; selisihnya dicatat sebagai koreksi). */
export async function catatStok(input: z.input<typeof skemaStok>): Promise<Hasil> {
  const sesi = await pastikanIzin("cetakan");
  const p = skemaStok.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  const { itemId, varianId, jenis, jumlah, catatan } = p.data;
  if (jenis !== "koreksi" && jumlah < 1) return { ok: false, pesan: "Isi jumlahnya." };
  const item = BigInt(itemId);
  const varian = varianId ? BigInt(varianId) : null;
  const ada = await prisma.print_items.findFirst({ where: { id: item, kind: "stok", ...(varian ? { print_item_variants: { some: { id: varian } } } : {}) }, select: { id: true } });
  if (!ada) return { ok: false, pesan: "Cetakan ini tidak distok (per pesanan) atau sudah tidak ada." };
  // Stok tidak boleh minus: pemakaian di atas stok tercatat ditolak — hitung ulang dulu kalau stok fisiknya beda.
  const kurang = await prisma.$transaction(async (tx) => {
    const saldo = (await tx.print_stock_movements.aggregate({ where: { item_id: item, variant_id: varian }, _sum: { qty: true } }))._sum.qty ?? 0;
    if (jenis === "pakai" && jumlah > saldo) return saldo;
    const qty = jenis === "masuk" ? jumlah : jenis === "pakai" ? -jumlah : jumlah - saldo;
    await tx.print_stock_movements.create({
      data: { item_id: item, variant_id: varian, kind: jenis, qty, counted_qty: jenis === "koreksi" ? jumlah : null, note: catatan || null, created_by: BigInt(sesi.id) },
    });
    return null;
  });
  if (kurang != null) return { ok: false, pesan: `Stok tercatat tinggal ${kurang}. Kalau stok di rak beda, pakai "Hitung ulang" dulu.` };
  revalidatePath("/cetakan");
  return { ok: true, pesan: { pakai: "Pemakaian dicatat.", masuk: "Stok masuk dicatat.", koreksi: "Stok disesuaikan dengan hitungan." }[jenis] };
}

/** Peminta menjawab pertanyaan pemegang cetakan → kembali "Menunggu", jawabannya ditambahkan ke catatan. */
export async function jawabPermintaan(idPermintaan: string, jawaban: string): Promise<Hasil> {
  const sesi = await pastikanIzin("cetakan");
  const teksJawab = jawaban.trim();
  if (!angkaId.safeParse(idPermintaan).success) return { ok: false, pesan: "Permintaan tidak dikenal." };
  if (!teksJawab) return { ok: false, pesan: "Tulis jawabannya." };
  const p = await prisma.print_requests.findFirst({ where: { id: BigInt(idPermintaan), status: "perlu_tanya", requested_by: BigInt(sesi.id) }, select: { note: true, reply: true } });
  if (!p) return { ok: false, pesan: "Permintaan ini tidak sedang menunggu jawaban Anda." };
  const catatan = [p.note, `T: ${p.reply ?? "-"}`, `J: ${teksJawab}`].filter(Boolean).join("\n").slice(-500);
  await prisma.print_requests.update({ where: { id: BigInt(idPermintaan) }, data: { status: "diajukan", note: catatan, reply: null, updated_at: new Date() } });
  kirimNanti(["admin"], { judul: `Jawaban permintaan cetak dari ${sesi.nama}`, isi: teksJawab.slice(0, 120), url: `/cetakan?tab=permintaan#p${idPermintaan}`, tag: `cetak-${idPermintaan}` });
  revalidatePath("/cetakan");
  return { ok: true, pesan: "Jawaban terkirim." };
}
