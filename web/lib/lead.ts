/* ==========================================================================
   CRM DASAR — label & aturan lead (01-SPEC A, D-047). Murni.
   ========================================================================== */

export const TAHAP_LEAD = {
  tanya: "Tanya-tanya",
  quotation: "Quotation",
  dp: "DP",
  test_food: "Test food",
  final: "Final",
  berjalan: "Berjalan",
  selesai: "Selesai",
  batal: "Batal",
} as const;
export type TahapLead = keyof typeof TAHAP_LEAD;

export const SUMBER_LEAD = {
  wa: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  website: "Website",
  rekanan: "Rekanan (WO/vendor)",
  repeat: "Repeat order",
  lainnya: "Lainnya",
} as const;

export const JENIS_AKTIVITAS = {
  chat: "Chat",
  telepon: "Telepon",
  kirim_pl: "Kirim pricelist",
  kirim_quo: "Kirim quotation",
  catatan: "Catatan",
} as const;

export const BENTUK_LEAD = ["Nasi box", "Snack box", "Buffet", "Stall", "Set menu", "Tumpeng / tampah"] as const;

/** Lead yang masih perlu diurus (belum selesai/batal). */
export const TAHAP_AKTIF: TahapLead[] = ["tanya", "quotation", "dp", "test_food", "final", "berjalan"];

/** "terlambat" bila tanggal follow-up sudah lewat, "hari_ini" bila hari ini (WIB); selain itu null. */
export function statusFollowup(tanggal: Date | null, tahap: string, sekarang = new Date()): "terlambat" | "hari_ini" | null {
  if (!tanggal || !(TAHAP_AKTIF as string[]).includes(tahap)) return null;
  const hariWib = (t: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(t);
  // Kolom DATE dibaca Prisma sebagai tengah malam UTC → bandingkan sebagai teks tanggal.
  const target = tanggal.toISOString().slice(0, 10);
  const kini = hariWib(sekarang);
  return target < kini ? "terlambat" : target === kini ? "hari_ini" : null;
}
