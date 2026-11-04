import "server-only";

import type { PilihanPelanggan } from "@/components/form-dokumen";

import { prisma } from "./prisma";
import { BIAYA_UMUM, gabungSaran, JENIS_ACARA_UMUM, SATUAN_UMUM, type SaranDokumen } from "./saran-dokumen";

/** Daftar pilihan untuk formulir penawaran dan tagihan. Hanya yang aktif. */
export async function pilihanForm(): Promise<{
  pelanggan: PilihanPelanggan[];
  saran: SaranDokumen;
}> {
  const [pelanggan, penawaranTerakhir, satuanTerakhir, biayaTerakhir, tim] = await Promise.all([
    prisma.customers.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, customer_code: true, pic_name: true, phone: true, address: true, partner_id: true },
    }),
    // Saran isian (D-069): dari 400 quotation terakhir — yang sering dipakai muncul lebih dulu.
    prisma.quotations.findMany({ orderBy: { id: "desc" }, take: 400, select: { event_type: true, venue: true, fnb_planner: true } }),
    prisma.quotation_items.findMany({ where: { unit: { not: null } }, orderBy: { id: "desc" }, take: 800, select: { unit: true } }),
    prisma.quotation_charges.findMany({ orderBy: { id: "desc" }, take: 300, select: { label: true } }),
    prisma.users.findMany({ where: { is_active: true, role: { in: ["sales", "bizdev", "owner"] } }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return {
    pelanggan: pelanggan.map((p) => ({
      id: p.id.toString(),
      nama: p.name,
      kode: p.customer_code,
      contact_person: p.pic_name,
      phone: p.phone,
      alamat: p.address,
      rekanan: p.partner_id?.toString() ?? null,
    })),
    saran: {
      jenisAcara: gabungSaran(penawaranTerakhir.map((q) => q.event_type), JENIS_ACARA_UMUM),
      venue: gabungSaran(penawaranTerakhir.map((q) => q.venue), [], 40),
      planner: gabungSaran([...penawaranTerakhir.map((q) => q.fnb_planner), ...tim.map((u) => u.name)]),
      satuan: gabungSaran(satuanTerakhir.map((x) => x.unit), SATUAN_UMUM),
      biaya: gabungSaran(biayaTerakhir.map((x) => x.label), BIAYA_UMUM),
    },
  };
}

/** Tanggal dalam bentuk yang dipahami input type="date". */
export function hariIni(tambahHari = 0): string {
  const t = new Date();
  t.setDate(t.getDate() + tambahHari);
  return t.toISOString().slice(0, 10);
}

export function tanggalUntukInput(nilai: Date | null): string {
  return nilai ? nilai.toISOString().slice(0, 10) : "";
}

/**
 * Menyiapkan daftar tanggal acara untuk formulir.
 *
 * Dokumen yang dibuat SEBELUM tanggal acara menjadi daftar hanya punya satu
 * kolom tanggal dan satu kolom jumlah hari. Membuka dokumen itu dengan
 * daftar kosong lalu menyimpannya akan MENGHAPUS tanggal acaranya — tanpa
 * peringatan, karena memang tidak ada yang salah menurut aturan barunya.
 *
 * Jadi daftar yang kosong diisi dari kolom lamanya: satu tanggal untuk acara
 * sehari, dan berurutan sebanyak jumlah harinya untuk acara yang lebih
 * panjang. Itu pembacaan yang setia atas arti kedua kolom itu.
 */
export function tanggalAcaraUntukFormulir(
  daftar: { event_date: Date }[],
  cadanganTanggal: Date | null,
  cadanganHari: number | null,
): string[] {
  if (daftar.length > 0) return daftar.map((b) => tanggalUntukInput(b.event_date));
  if (!cadanganTanggal) return [];

  const hari = Math.max(1, Math.min(cadanganHari ?? 1, 31));
  return Array.from({ length: hari }, (_, i) => {
    const t = new Date(cadanganTanggal);
    t.setUTCDate(t.getUTCDate() + i);
    return tanggalUntukInput(t);
  });
}

