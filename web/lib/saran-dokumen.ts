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
export const SATUAN_UMUM = ["box", "porsi", "pax", "paket", "set", "tumpeng", "unit", "orang", "titik", "hari"];
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
