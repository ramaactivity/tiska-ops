import { z } from "zod";

/* ==========================================================================
   ANGKA BISNIS YANG BOLEH DIUBAH TANPA DEPLOY

   Satu sumber untuk semua angka di docs/02-ATURAN-BISNIS.md: pajak, layanan
   perlengkapan, delivery fee, termin, batas untung, overhead. Mesin hitung,
   PDF, brief, dan Hermes membaca dari sini — tidak menulis angkanya sendiri.

   Pola yang sama dengan tabel izin: BAWAAN tinggal di kode, tabel
   business_settings hanya berisi angka yang SUDAH diubah owner/finance.
   Kunci yang tidak ada barisnya memakai bawaan. Satu baris menggantikan
   SATU kunci utuh (mis. seluruh "termin"), bukan sebagian isinya.

   Murni, tanpa database — pembacaannya ada di lib/pengaturan.ts.
   ========================================================================== */

const persen = z.number().min(0).max(100);
const rupiah = z.number().int().min(0);
const hari = z.number().int().min(0);
const tarifLayanan = z.object({ pct: persen, min: rupiah });
const tarifStaf = z.object({ per_3_jam: rupiah, per_jam_tambahan: rupiah });

export const SKEMA_PENGATURAN = z.object({
  /** PBJT (dulu PB1) atas harga makanan & minuman. */
  pbjt_pct: persen,
  /** PPN atas sewa alat / jasa selain katering. */
  ppn_pct: persen,
  /** HPP = biaya bahan × (1 + overhead). Tenaga kerja, gas, listrik. */
  overhead_pct: persen,
  /** Saran harga jual = HPP ÷ target food cost. */
  target_food_cost_pct: persen,
  /** Penanda untung (D-013): ≥ aman hijau, di antara kuning, < minimum wajib persetujuan owner. */
  untung_aman_pct: persen,
  untung_min_pct: persen,
  /** Layanan Penyediaan Perlengkapan Buffet & Stall = max(pct × subtotal makanan, min). */
  layanan_perlengkapan: z.object({
    bogor: tarifLayanan,
    jabodetabek: tarifLayanan,
    set_menu_bogor: tarifLayanan,
    set_menu_jabodetabek: tarifLayanan,
  }),
  delivery_fee: z.object({
    bogor: rupiah,
    jabodetabek: rupiah,
    /** Boleh dipakai sales untuk Depok/Jaksel. */
    toleransi_depok_jaksel: rupiah,
  }),
  termin: z.object({
    booking_fee: rupiah,
    dp_pct: persen,
    dp_hari_sebelum_acara: hari,
    pelunasan_hari_sebelum_acara: hari,
  }),
  /** Partner Fee untuk WO/vendor rekanan, dari nilai makanan & minuman (D-020). */
  partner_fee_pct: persen,
  /** Dokumen bernilai di atas batas wajib materai. */
  materai: z.object({ batas: rupiah, nilai: rupiah }),
  batas_perubahan_hari: z.object({ buffet: hari, box: hari, agenda: hari }),
  minimum_pax: z.number().int().min(1),
  tambahan_porsi_min_pct: persen,
  tarif_staf: z.object({ kitchen: tarifStaf, waiter: tarifStaf, clear_up: tarifStaf }),
  /** Selisih opname di atas ini wajib diberi alasan. */
  opname_selisih_wajib_alasan_pct: persen,
  /** Refund pembatalan sepihak klien (S&K Bag. X, D-102): ≥ penuh_hari → 100%, lalu dua tingkat, di bawah tingkat3_hari hangus. */
  pembatalan: z.object({
    penuh_hari: hari,
    tingkat2_hari: hari,
    tingkat2_pct: persen,
    tingkat3_hari: hari,
    tingkat3_pct: persen,
    /** Dana yang tidak dikembalikan boleh dipakai pesanan lain selama ini. */
    deposit_bulan: z.number().int().min(0).max(24),
  }),
  /**
   * Program "Ikut Pesen Menu Pesta" (D-115): harga retail per pax BELUM termasuk PBJT. Kemasan & biaya antar
   * dipakai cek HPP; 0 = belum diisi (diperingatkan, tidak ditebak).
   */
  ikut_menu_pesta: z.object({
    harga_per_pax: rupiah,
    min_pax: z.number().int().min(1),
    kemasan_per_pax: rupiah,
    biaya_antar_per_program: rupiah,
  }),
});

export type PengaturanBisnis = z.infer<typeof SKEMA_PENGATURAN>;
export type KunciPengaturan = keyof PengaturanBisnis;

/** Sumber: docs/02-ATURAN-BISNIS.md (jawaban Mas Reza & Mbak Rakhma, S&K). */
export const BAWAAN: PengaturanBisnis = {
  pbjt_pct: 10,
  ppn_pct: 11,
  overhead_pct: 30,
  target_food_cost_pct: 50,
  untung_aman_pct: 35,
  untung_min_pct: 30,
  layanan_perlengkapan: {
    bogor: { pct: 15, min: 1_500_000 },
    jabodetabek: { pct: 21, min: 2_500_000 },
    set_menu_bogor: { pct: 20, min: 2_000_000 },
    set_menu_jabodetabek: { pct: 25, min: 2_500_000 },
  },
  delivery_fee: { bogor: 50_000, jabodetabek: 250_000, toleransi_depok_jaksel: 150_000 },
  termin: {
    booking_fee: 5_000_000,
    dp_pct: 50,
    dp_hari_sebelum_acara: 30,
    pelunasan_hari_sebelum_acara: 14,
  },
  partner_fee_pct: 3.5,
  materai: { batas: 5_000_000, nilai: 10_000 },
  batas_perubahan_hari: { buffet: 5, box: 2, agenda: 3 },
  minimum_pax: 25,
  tambahan_porsi_min_pct: 10,
  tarif_staf: {
    kitchen: { per_3_jam: 350_000, per_jam_tambahan: 75_000 },
    waiter: { per_3_jam: 300_000, per_jam_tambahan: 50_000 },
    clear_up: { per_3_jam: 250_000, per_jam_tambahan: 50_000 },
  },
  opname_selisih_wajib_alasan_pct: 5,
  pembatalan: { penuh_hari: 90, tingkat2_hari: 45, tingkat2_pct: 70, tingkat3_hari: 30, tingkat3_pct: 50, deposit_bulan: 3 },
  ikut_menu_pesta: { harga_per_pax: 50_000, min_pax: 4, kemasan_per_pax: 0, biaya_antar_per_program: 0 },
};

/**
 * Bawaan ditimpa baris yang tersimpan. Baris dengan kunci tak dikenal atau
 * isi yang tidak lolos skema DIABAIKAN (dilaporkan lewat `ditolak`), supaya
 * satu baris rusak tidak membuat seluruh aplikasi berhenti menghitung.
 */
export function gabungPengaturan(baris: { key: string; value: unknown }[]): {
  pengaturan: PengaturanBisnis;
  ditolak: string[];
} {
  const pengaturan = structuredClone(BAWAAN);
  const ditolak: string[] = [];
  const bentuk = SKEMA_PENGATURAN.shape as Record<string, z.ZodType>;

  for (const { key, value } of baris) {
    const skema = bentuk[key];
    const hasil = skema?.safeParse(value);
    if (!hasil?.success) {
      ditolak.push(key);
      continue;
    }
    (pengaturan as Record<string, unknown>)[key] = hasil.data;
  }
  return { pengaturan, ditolak };
}
