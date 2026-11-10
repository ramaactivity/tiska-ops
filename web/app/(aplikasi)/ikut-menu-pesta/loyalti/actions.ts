"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { barisGratisPax, bolehDigabung } from "@/lib/hitung/loyalti";
import { hariIniWib } from "@/lib/kalender";
import { AWALAN_INVOICE_LAMA, daftarProgramLoyalti, kartuPelanggan } from "@/lib/loyalti";
import { bolehSetujuiProgram } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { hitungTotalDokumen } from "@/lib/uang";

/* Program Loyalti (D-131): aturan diatur Finance/owner; hadiah dipakai oleh siapa pun yang mengurus Ikut Menu Pesta. */

type Hasil = { ok: true; pesan: string } | { ok: false; pesan: string };
const id = z.string().regex(/^\d+$/);
const angkaOpsional = (maks: number) =>
  z
    .string()
    .regex(/^\d*$/)
    .transform((x) => (x ? Number(x) : null))
    .refine((x) => x === null || (x >= 1 && x <= maks), `Angka 1–${maks}.`);

const skema = z.object({
  id: id.nullish(),
  nama: z.string().trim().min(1, "Isi nama programnya.").max(120),
  syarat: z.number().int().min(1, "Minimal 1 pesanan.").max(100),
  minBelanja: z
    .string()
    .regex(/^\d{0,12}$/)
    .transform((x) => (x && Number(x) > 0 ? x : null)),
  jendelaHari: angkaOpsional(3650),
  hadiah: z.string().trim().min(1, "Isi hadiahnya.").max(300),
  berlakuHari: angkaOpsional(3650),
  mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal mulai."),
  // Syarat & ketentuan (D-134).
  jenis: z.enum(["stempel", "tiap_pesanan"]),
  minPax: angkaOpsional(1000),
  jenisHadiah: z.enum(["teks", "gratis_pax", "bonus"]),
  jumlahHadiah: angkaOpsional(100),
  pilihan: z.array(z.string().trim().min(1).max(100)).max(20),
  bolehGabung: z.boolean(),
  sk: z.string().trim().max(2000),
});

function segarkan() {
  revalidatePath("/ikut-menu-pesta", "layout");
}

export async function simpanProgramLoyalti(input: z.input<typeof skema>): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!bolehSetujuiProgram(sesi.peran)) return { ok: false, pesan: "Aturan loyalti diatur Finance atau owner." };
  const p = skema.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  const f = p.data;
  if (f.jenisHadiah === "gratis_pax" && !f.jumlahHadiah) return { ok: false, pesan: "Isi jumlah pax gratis." };
  const data = {
    name: f.nama,
    stamps_needed: f.syarat,
    min_order_value: f.minBelanja,
    window_days: f.jendelaHari,
    reward: f.hadiah,
    reward_valid_days: f.berlakuHari,
    starts_on: new Date(`${f.mulai}T00:00:00Z`),
    kind: f.jenis,
    min_pax: f.minPax,
    reward_type: f.jenis === "tiap_pesanan" ? "bonus" : f.jenisHadiah,
    reward_qty: f.jenisHadiah === "gratis_pax" ? f.jumlahHadiah : null,
    reward_options: f.jenisHadiah === "bonus" ? f.pilihan : [],
    stackable: f.jenis === "tiap_pesanan" ? true : f.bolehGabung,
    terms: f.sk || null,
    updated_at: new Date(),
  };
  if (f.id) await prisma.loyalty_programs.update({ where: { id: BigInt(f.id) }, data });
  else await prisma.loyalty_programs.create({ data: { ...data, created_by: BigInt(sesi.id) } });
  segarkan();
  return { ok: true, pesan: f.id ? "Program diperbarui — kartu semua pembeli dihitung ulang dengan aturan baru." : "Program loyalti dibuat." };
}

export async function aktifkanProgramLoyalti(idProgram: string, aktif: boolean): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!bolehSetujuiProgram(sesi.peran)) return { ok: false, pesan: "Aturan loyalti diatur Finance atau owner." };
  if (!id.safeParse(idProgram).success) return { ok: false, pesan: "Program tidak dikenal." };
  await prisma.loyalty_programs.update({ where: { id: BigInt(idProgram) }, data: { active: aktif, updated_at: new Date() } });
  segarkan();
  return { ok: true, pesan: aktif ? "Program aktif lagi." : "Program dihentikan — stempel & hadiah tidak dihitung lagi. Riwayat pemakaian tetap ada." };
}

const awalanCatatan = (hadiah: string) => `🎁 Hadiah loyalti: ${hadiah}`;

/** Total invoice dihitung ulang dari baris-barisnya (potongan "gratis pax" = baris minus, PBJT ikut turun). */
async function hitungUlangInvoice(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], idInvoice: bigint) {
  const inv = await tx.invoices.findUniqueOrThrow({
    where: { id: idInvoice },
    select: { pb1_enabled: true, pb1_percent: true, delivery_amount: true, invoice_items: { where: { parent_id: null }, select: { qty: true, pax: true, price: true, charge_pb1: true, charge_service: true } } },
  });
  const t = hitungTotalDokumen({
    items: inv.invoice_items.map((i) => ({ qty: i.qty, pax: i.pax, price: i.price, charge_pb1: i.charge_pb1, charge_service: i.charge_service })),
    pb1_enabled: inv.pb1_enabled,
    pb1_percent: inv.pb1_percent ?? 0,
    delivery_amount: inv.delivery_amount,
  });
  await tx.invoices.update({ where: { id: idInvoice }, data: { subtotal: t.subtotal.toString(), pb1_amount: t.pb1_amount.toString(), grand_total: t.grand_total.toString(), updated_at: new Date() } });
}

/**
 * Pakai hadiah (kunci "<idProgram>:<idPesananPenutup>"). Dicek ulang dari riwayat: hanya hadiah yang masih tersedia.
 * S&K (D-134): hadiah barang / gratis pax wajib dipakai di PESANAN BERIKUTNYA (dicatat sesudah pesanan penutup),
 * tidak bisa digabung bila salah satu programnya tidak bisa digabung, pilihan bonus wajib dipilih,
 * "gratis X pax" memotong invoice pesanan itu (hanya selama belum ada pembayaran).
 */
export async function pakaiHadiah(kunci: string, idPesanan: string | null, catatan: string, pilihan: string | null = null): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  const m = new RegExp(`^(\\d+):(${AWALAN_INVOICE_LAMA})?(\\d+)$`).exec(kunci);
  if (!m || (idPesanan && !id.safeParse(idPesanan).success) || catatan.length > 300 || (pilihan && pilihan.length > 100)) return { ok: false, pesan: "Isian tidak sah." };
  // Pesanan penutup = pesanan Ikut Menu Pesta, atau invoice lama yang ditandai (semua pesanan Ikut Menu Pesta lebih baru).
  const dariInvoiceLama = Boolean(m[2]);
  const penutup = dariInvoiceLama
    ? await prisma.invoices.findUnique({ where: { id: BigInt(m[3]) }, select: { customer_id: true } })
    : await prisma.retail_orders.findUnique({ where: { id: BigInt(m[3]) }, select: { customer_id: true } });
  if (!penutup) return { ok: false, pesan: "Hadiah tidak ditemukan." };
  const kartu = (await kartuPelanggan(hariIniWib(), [penutup.customer_id])).get(penutup.customer_id.toString());
  const kp = kartu?.find((k) => k.program.id === m[1]);
  const h = kp?.kartu.hadiah.find((x) => x.kunci === kunci);
  if (!kp || !h || h.status !== "tersedia") return { ok: false, pesan: h?.status === "dipakai" ? "Hadiah ini sudah dipakai." : h?.status === "hangus" ? "Hadiah ini sudah hangus." : "Hadiah tidak tersedia." };
  const program = kp.program;
  if (program.jenisHadiah !== "teks" && !idPesanan) return { ok: false, pesan: "Hadiah ini dipakai di pesanan — buka pesanan pembeli di halaman program lalu tekan Pakai hadiah." };
  if (program.pilihan.length && !program.pilihan.includes(pilihan ?? "")) return { ok: false, pesan: `Pilih salah satu: ${program.pilihan.join(", ")}.` };
  let potong: { pax: number; harga: number } | null = null;
  if (idPesanan) {
    const o = await prisma.retail_orders.findUnique({
      where: { id: BigInt(idPesanan) },
      select: {
        customer_id: true,
        status: true,
        invoice_id: true,
        invoices: { select: { paid_amount: true } },
        retail_programs: { select: { price_per_pax: true } },
        retail_order_items: { select: { pax: true } },
        loyalty_redemptions: { select: { program_id: true } },
      },
    });
    if (!o || o.customer_id !== penutup.customer_id || o.status !== "aktif") return { ok: false, pesan: "Pesanan itu bukan milik pembeli ini / sudah batal." };
    if (!dariInvoiceLama && BigInt(idPesanan) <= BigInt(m[3])) return { ok: false, pesan: "Hadiah ditukar pada pesanan berikutnya — bukan pesanan yang menghasilkan hadiah ini atau sebelumnya." };
    const semua = await daftarProgramLoyalti();
    const sudah = o.loyalty_redemptions.map((r) => ({ stackable: semua.find((p) => p.id === r.program_id.toString())?.bolehGabung ?? true }));
    if (!bolehDigabung({ stackable: program.bolehGabung }, sudah)) return { ok: false, pesan: "Pesanan ini sudah memakai hadiah lain — hadiah tidak bisa digabung." };
    if (program.jenisHadiah === "gratis_pax") {
      if (!o.invoice_id || Number(o.invoices?.paid_amount ?? 0) > 0) return { ok: false, pesan: "Invoice pesanan ini sudah ada pembayaran — gratis pax harus dipakai sebelum pembeli membayar." };
      potong = barisGratisPax(program.jumlahHadiah ?? 1, Number(o.retail_programs.price_per_pax), o.retail_order_items.reduce((n, i) => n + i.pax, 0));
    }
  }
  const teks = `${program.hadiah}${pilihan ? ` — ${pilihan}` : ""}`;
  try {
    await prisma.$transaction(async (tx) => {
      let idBaris: bigint | null = null;
      if (idPesanan && potong) {
        const o = await tx.retail_orders.findUniqueOrThrow({ where: { id: BigInt(idPesanan) }, select: { invoice_id: true } });
        const b = await tx.invoice_items.create({
          data: { invoice_id: o.invoice_id!, item_name: `Hadiah loyalti — gratis ${potong.pax} pax (${program.nama})`, unit: "pax", qty: 1, pax: potong.pax, price: potong.harga, subtotal: potong.harga * potong.pax, charge_service: false, charge_pb1: true, created_at: new Date(), updated_at: new Date() },
          select: { id: true },
        });
        idBaris = b.id;
        await hitungUlangInvoice(tx, o.invoice_id!);
      }
      await tx.loyalty_redemptions.create({
        data: { program_id: BigInt(m[1]), customer_id: penutup.customer_id, reward_key: kunci, reward: program.hadiah, choice: pilihan, invoice_item_id: idBaris, retail_order_id: idPesanan ? BigInt(idPesanan) : null, note: catatan.trim() || null, used_by: BigInt(sesi.id) },
      });
      if (idPesanan) {
        const o = await tx.retail_orders.findUniqueOrThrow({ where: { id: BigInt(idPesanan) }, select: { notes: true } });
        await tx.retail_orders.update({ where: { id: BigInt(idPesanan) }, data: { notes: [awalanCatatan(teks), o.notes].filter(Boolean).join(" · "), updated_at: new Date() } });
      }
    });
  } catch {
    return { ok: false, pesan: "Hadiah ini baru saja dipakai orang lain. Muat ulang halaman." };
  }
  segarkan();
  return { ok: true, pesan: potong ? `Hadiah dipakai — invoice dipotong ${potong.pax} pax & dihitung ulang.` : idPesanan ? "Hadiah dipakai di pesanan ini — tertulis di catatan pesanan untuk dapur & pengantar." : "Hadiah ditandai sudah dipakai." };
}

/** Batalkan pemakaian (salah tekan): hadiah tersedia lagi, catatan hadiah & potongan invoice dihapus. */
export async function batalPakaiHadiah(kunci: string): Promise<Hasil> {
  await pastikanIzin("ikut-menu-pesta");
  const r = await prisma.loyalty_redemptions.findUnique({ where: { reward_key: kunci }, select: { id: true, reward: true, choice: true, retail_order_id: true, invoice_item_id: true } });
  if (!r) return { ok: false, pesan: "Pemakaian tidak ditemukan." };
  if (r.invoice_item_id) {
    const b = await prisma.invoice_items.findUnique({ where: { id: r.invoice_item_id }, select: { invoices: { select: { paid_amount: true } } } });
    if (b && Number(b.invoices.paid_amount) > 0) return { ok: false, pesan: "Invoice sudah ada pembayaran — potongan gratis pax tidak bisa dibatalkan di sini." };
  }
  const teks = `${r.reward}${r.choice ? ` — ${r.choice}` : ""}`;
  await prisma.$transaction(async (tx) => {
    await tx.loyalty_redemptions.delete({ where: { id: r.id } });
    if (r.invoice_item_id) {
      const b = await tx.invoice_items.findUnique({ where: { id: r.invoice_item_id }, select: { invoice_id: true } });
      if (b) {
        await tx.invoice_items.delete({ where: { id: r.invoice_item_id } });
        await hitungUlangInvoice(tx, b.invoice_id);
      }
    }
    if (r.retail_order_id) {
      const o = await tx.retail_orders.findUnique({ where: { id: r.retail_order_id }, select: { notes: true } });
      const sisa = (o?.notes ?? "").split(" · ").filter((x) => x !== awalanCatatan(teks)).join(" · ");
      await tx.retail_orders.update({ where: { id: r.retail_order_id }, data: { notes: sisa || null, updated_at: new Date() } });
    }
  });
  segarkan();
  return { ok: true, pesan: "Pemakaian dibatalkan — hadiah tersedia lagi." };
}

/**
 * Tandai invoice lama sebagai pesanan Ikut Menu Pesta (permintaan Rama 10 Nov 2026) supaya ikut jadi stempel
 * loyalti; `pax` null = batal ditandai. Tanpa batas tanggal — kurun stempel program yang menentukan.
 */
export async function tandaiInvoiceLama(idInvoice: string, pax: number | null): Promise<Hasil> {
  await pastikanIzin("ikut-menu-pesta");
  if (!id.safeParse(idInvoice).success || (pax !== null && (!Number.isInteger(pax) || pax < 1 || pax > 1000))) return { ok: false, pesan: "Isian tidak sah." };
  const inv = await prisma.invoices.findUnique({ where: { id: BigInt(idInvoice) }, select: { status: true, _count: { select: { retail_orders: true } } } });
  if (!inv) return { ok: false, pesan: "Invoice tidak ditemukan." };
  if (inv._count.retail_orders) return { ok: false, pesan: "Invoice ini milik pesanan Ikut Menu Pesta — sudah otomatis dihitung." };
  if (pax !== null && inv.status === "cancelled") return { ok: false, pesan: "Invoice batal tidak dihitung." };
  await prisma.invoices.update({ where: { id: BigInt(idInvoice) }, data: { loyalty_pax: pax } });
  revalidatePath(`/tagihan/${idInvoice}`);
  segarkan();
  return { ok: true, pesan: pax ? `Dihitung sebagai pesanan Ikut Menu Pesta (${pax} pax).` : "Tidak dihitung lagi untuk loyalti." };
}
