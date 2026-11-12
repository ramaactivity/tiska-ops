/* ==========================================================================
   NAMA ACARA vs JENIS ACARA (D-163) — murni, aman di browser.

   `event_type` di quotation/invoice = NAMA acara ("BRIN Business Lunch (Guest
   Visit)") — dipakai cetakan, daftar, Excel, brief. `event_category` = JENIS
   acara, pilihan tetap di bawah, untuk laporan & pencarian. Jenis ditebak dari
   nama bila belum dipilih; sales bisa menggantinya.
   ========================================================================== */

export const JENIS_ACARA = {
  meeting: "Meeting / business lunch",
  seminar: "Seminar / workshop",
  gathering: "Gathering / party",
  pernikahan: "Pernikahan / lamaran",
  pengajian: "Pengajian / keagamaan",
  ulang_tahun: "Ulang tahun",
  peresmian: "Peresmian / grand opening",
  sosial: "Sosial / santunan",
  internal: "Internal",
  lainnya: "Lainnya",
} as const;
export type JenisAcara = keyof typeof JENIS_ACARA;

/** Urutan cek penting: "Pengajian Syukuran Pernikahan" adalah pengajian, "Lunch Meeting" adalah meeting. */
const POLA: [JenisAcara, RegExp][] = [
  ["pengajian", /\b(pengajian|kajian|yasin|tahlil|manasik|maulid|isra|halal ?bihalal|syukuran|aqiqah|khitan)/i],
  ["pernikahan", /\b(pernikahan|resepsi|wedding|matrimony|akad|lamaran|siraman|ngunduh|engagement)/i],
  ["ulang_tahun", /\b(ultah|ulang tahun|birthday|anniversary)/i],
  ["peresmian", /\b(peresmian|grand opening|opening|launching|launch)\b/i],
  ["sosial", /\b(santunan|yatim|bakti sosial|baksos|donasi|charity|bazaar|bazar)/i],
  ["seminar", /\b(seminar|workshop|training|pelatihan|webinar|session|sosialisasi|kunjungan kerja|bimtek|konferensi|conference)/i],
  // Gathering sebelum meeting: "Lunch Gathering" & "Family Lunch" adalah gathering, bukan rapat.
  ["gathering", /\b(gathering|party|farewell|reuni|outing|family|perpisahan|arisan)/i],
  ["meeting", /\b(meeting|rapat|lunch|dinner|breakfast|business|visit|kunjungan|coffee break)/i],
  ["internal", /\binternal\b/i],
];

export function tebakJenisAcara(nama: string | null | undefined): JenisAcara | null {
  if (!nama?.trim()) return null;
  return POLA.find(([, pola]) => pola.test(nama))?.[0] ?? null;
}
