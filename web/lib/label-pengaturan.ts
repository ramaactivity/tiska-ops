import type { KunciPengaturan } from "./pengaturan-bisnis";

/* ==========================================================================
   Label bahasa sehari-hari untuk halaman Angka Bisnis. Murni.
   Satuan tiap angka: "%" persen, "Rp" rupiah, "hari", "bulan", "pax".
   ========================================================================== */

export type Satuan = "%" | "Rp" | "hari" | "bulan" | "pax";

export const KELOMPOK_PENGATURAN: {
  kunci: KunciPengaturan;
  judul: string;
  keterangan: string;
  /** label per jalur isi ("" = nilai tunggal); urutannya = urutan di layar */
  isian: [jalur: string, label: string, satuan: Satuan][];
}[] = [
  { kunci: "pbjt_pct", judul: "PBJT (pajak makanan)", keterangan: "Ditambahkan ke harga makanan & minuman.", isian: [["", "PBJT", "%"]] },
  { kunci: "ppn_pct", judul: "PPN sewa alat", keterangan: "Untuk sewa alat / jasa selain katering.", isian: [["", "PPN", "%"]] },
  {
    kunci: "layanan_perlengkapan",
    judul: "Layanan Penyediaan Perlengkapan Buffet & Stall",
    keterangan: "Dihitung dari subtotal makanan; yang dipakai yang lebih besar antara persen dan minimum.",
    isian: [
      ["bogor.pct", "Bogor — persen", "%"],
      ["bogor.min", "Bogor — minimum", "Rp"],
      ["jabodetabek.pct", "Jabodetabek — persen", "%"],
      ["jabodetabek.min", "Jabodetabek — minimum", "Rp"],
      ["set_menu_bogor.pct", "Set menu Bogor — persen", "%"],
      ["set_menu_bogor.min", "Set menu Bogor — minimum", "Rp"],
      ["set_menu_jabodetabek.pct", "Set menu Jabodetabek — persen", "%"],
      ["set_menu_jabodetabek.min", "Set menu Jabodetabek — minimum", "Rp"],
    ],
  },
  {
    kunci: "delivery_fee",
    judul: "Delivery Fee",
    keterangan: "Per kloter untuk pesanan box.",
    isian: [
      ["bogor", "Bogor", "Rp"],
      ["jabodetabek", "Jabodetabek", "Rp"],
      ["toleransi_depok_jaksel", "Toleransi Depok / Jaksel", "Rp"],
    ],
  },
  {
    kunci: "termin",
    judul: "Termin pembayaran bawaan",
    keterangan: "Bisa diubah per klien di quotation.",
    isian: [
      ["booking_fee", "Booking fee", "Rp"],
      ["dp_pct", "DP", "%"],
      ["dp_hari_sebelum_acara", "DP paling lambat (sebelum acara)", "hari"],
      ["pelunasan_hari_sebelum_acara", "Pelunasan paling lambat (sebelum acara)", "hari"],
    ],
  },
  {
    kunci: "overhead_pct",
    judul: "Overhead HPP",
    keterangan: "Tenaga kerja, gas, listrik. HPP = biaya bahan × (1 + overhead).",
    isian: [["", "Overhead", "%"]],
  },
  {
    kunci: "target_food_cost_pct",
    judul: "Target food cost",
    keterangan: "Saran harga jual = HPP ÷ target food cost.",
    isian: [["", "Target food cost", "%"]],
  },
  { kunci: "untung_aman_pct", judul: "Untung aman", keterangan: "Di atas angka ini penanda hijau.", isian: [["", "Untung aman", "%"]] },
  {
    kunci: "untung_min_pct",
    judul: "Untung minimum",
    keterangan: "Di bawah angka ini quotation wajib disetujui owner.",
    isian: [["", "Untung minimum", "%"]],
  },
  { kunci: "partner_fee_pct", judul: "Partner Fee", keterangan: "Untuk WO/vendor rekanan, dari nilai makanan & minuman.", isian: [["", "Partner Fee", "%"]] },
  {
    kunci: "materai",
    judul: "Bea materai",
    keterangan: "Dokumen di atas batas wajib materai.",
    isian: [
      ["batas", "Batas nilai dokumen", "Rp"],
      ["nilai", "Nilai materai", "Rp"],
    ],
  },
  {
    kunci: "batas_perubahan_hari",
    judul: "Batas perubahan pesanan",
    keterangan: "Setelah lewat, perubahan butuh persetujuan.",
    isian: [
      ["buffet", "Porsi/menu buffet", "hari"],
      ["box", "Nasi box", "hari"],
      ["agenda", "Waktu & agenda acara", "hari"],
    ],
  },
  { kunci: "minimum_pax", judul: "Minimum pesanan", keterangan: "Buffet & box.", isian: [["", "Minimum", "pax"]] },
  {
    kunci: "tambahan_porsi_min_pct",
    judul: "Tambahan porsi minimum",
    keterangan: "Dari total pesanan.",
    isian: [["", "Tambahan minimum", "%"]],
  },
  {
    kunci: "tarif_staf",
    judul: "Tarif staf tambahan",
    keterangan: "Per orang.",
    isian: [
      ["kitchen.per_3_jam", "Kitchen — per 3 jam", "Rp"],
      ["kitchen.per_jam_tambahan", "Kitchen — per jam tambahan", "Rp"],
      ["waiter.per_3_jam", "Waiter — per 3 jam", "Rp"],
      ["waiter.per_jam_tambahan", "Waiter — per jam tambahan", "Rp"],
      ["clear_up.per_3_jam", "Clear-up — per 3 jam", "Rp"],
      ["clear_up.per_jam_tambahan", "Clear-up — per jam tambahan", "Rp"],
    ],
  },
  {
    kunci: "opname_selisih_wajib_alasan_pct",
    judul: "Selisih stock opname",
    keterangan: "Selisih di atas ini wajib diberi alasan.",
    isian: [["", "Batas selisih", "%"]],
  },
  {
    kunci: "pembatalan",
    judul: "Refund pembatalan (S&K Bag. X)",
    keterangan: "Dihitung dari jarak tanggal batal ke tanggal acara, atas uang yang sudah dibayar. Di bawah batas terakhir: tidak dikembalikan.",
    isian: [
      ["penuh_hari", "Dikembalikan 100% bila batal paling lambat", "hari"],
      ["tingkat2_hari", "Tingkat 2 mulai", "hari"],
      ["tingkat2_pct", "Tingkat 2 dikembalikan", "%"],
      ["tingkat3_hari", "Tingkat 3 mulai", "hari"],
      ["tingkat3_pct", "Tingkat 3 dikembalikan", "%"],
      ["deposit_bulan", "Dana boleh dipakai pesanan lain selama", "bulan"],
    ],
  },
];

/** Ambil nilai pada jalur "a.b" dari objek pengaturan; "" = nilai itu sendiri. */
export function ambilJalur(nilai: unknown, jalur: string): unknown {
  if (!jalur) return nilai;
  return jalur.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], nilai);
}

/** Susun ulang objek dari pasangan jalur → angka. */
export function susunJalur(pasangan: [string, number][]): unknown {
  if (pasangan.length === 1 && pasangan[0][0] === "") return pasangan[0][1];
  const hasil: Record<string, unknown> = {};
  for (const [jalur, v] of pasangan) {
    const bagian = jalur.split(".");
    let o = hasil;
    for (const k of bagian.slice(0, -1)) o = (o[k] ??= {}) as Record<string, unknown>;
    o[bagian.at(-1)!] = v;
  }
  return hasil;
}
