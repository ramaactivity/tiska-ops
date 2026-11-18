/**
 * Saran isian form quotation/invoice (D-069). Murni — dipakai server (digabung
 * dengan yang pernah dipakai) dan browser (chip cepat). Yang paling sering
 * dipakai tampil lebih dulu supaya penulisan seragam.
 */
export type SaranDokumen = {
  jenisAcara: string[];
  venue: string[];
  planner: string[];
  satuan: string[];
  biaya: string[];
};

export const JENIS_ACARA_UMUM = ["Pernikahan", "Gathering", "Rapat / meeting", "Seminar", "Ulang tahun", "Syukuran", "Pengajian", "Arisan", "Outing", "Lamaran"];
/** Satuan baku (D-199) — dari yang benar-benar dipakai di dokumen; ditulis huruf kecil supaya seragam di cetakan. */
export const SATUAN_UMUM = ["porsi", "pax", "box", "pcs", "paket", "tampah", "set", "botol", "cup", "gelas", "kg", "liter", "ekor", "tumpeng", "pasang", "unit", "orang", "titik", "hari"];
const SATUAN_BAKU = new Set(SATUAN_UMUM);

/** "Pax" / " BOX " → "pax" / "box"; satuan lain (mis. "Tampah kecil") dibiarkan seperti diketik, hanya dirapikan spasinya. */
export function rapikanSatuan(teks: string | null | undefined): string {
  const t = (teks ?? "").trim().replace(/\s+/g, " ");
  return SATUAN_BAKU.has(t.toLowerCase()) ? t.toLowerCase() : t;
}

/** Vol. berisi angka saja ("1", "2") hampir pasti salah kolom — maksudnya Qty. */
export const satuanBerupaAngka = (teks: string | null | undefined) => /^\d+([.,]\d+)?$/.test((teks ?? "").trim());
export const BIAYA_UMUM = ["Tim servis", "Sewa alat", "Transport", "Dekorasi", "Potongan", "Pembulatan"];

/** Urutkan menurut seberapa sering dipakai, lalu tambahkan saran umum yang belum ada. */
export function gabungSaran(dipakai: (string | null | undefined)[], umum: readonly string[] = [], batas = 30): string[] {
  const hitung = new Map<string, { teks: string; n: number }>();
  for (const t of dipakai) {
    const teks = (t ?? "").trim();
    if (!teks) continue;
    const k = teks.toLowerCase();
    const ada = hitung.get(k);
    if (ada) ada.n += 1;
    else hitung.set(k, { teks, n: 1 });
  }
  const urut = [...hitung.values()].sort((a, b) => b.n - a.n).map((x) => x.teks);
  const kecil = new Set(urut.map((s) => s.toLowerCase()));
  return [...urut, ...umum.filter((u) => !kecil.has(u.toLowerCase()))].slice(0, batas);
}
