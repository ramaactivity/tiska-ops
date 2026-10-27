/**
 * Avatar orang. users.avatar berisi salah satu:
 *   "w.<kode>"          wajah gambar Tiska (D-108), berkas public/wajah/<kode>.webp
 *   "<seed>[|hijab]"    Notionists lama (D-061) — tetap tampil sampai diganti
 *   kosong              Notionists dari username — wajah tiap orang tetap berbeda
 *                       sampai dipilihkan wajah Tiska (jangan jadi wajah netral kembar)
 * Murni — dipakai server & browser (pemilih avatar).
 */
export type PilihanAvatar = { seed: string; hijab: boolean };

/** Kelompok wajah Tiska, masing-masing 16 wajah (01–16). */
export const KELOMPOK_WAJAH = [
  { kode: "l", label: "Laki-laki" },
  { kode: "j", label: "Berjilbab" },
  { kode: "p", label: "Perempuan" },
  { kode: "c", label: "Catering" },
  { kode: "k", label: "Seragam kerja" },
  { kode: "x", label: "Lainnya" },
] as const;

export function wajahKelompok(kode: string): string[] {
  return Array.from({ length: 16 }, (_, i) => `w.${kode}${String(i + 1).padStart(2, "0")}`);
}

/** Berkas gambar untuk kode wajah Tiska; null bila bukan wajah Tiska. */
export function berkasWajah(seed: string): string | null {
  return /^w\.[ljpckx](0[1-9]|1[0-6])$/.test(seed) ? `/wajah/${seed.slice(2)}.webp` : null;
}

export function uraiAvatar(avatar: string | null | undefined, username: string): PilihanAvatar {
  const [seed, gaya] = (avatar ?? "").split("|");
  return { seed: seed || username, hijab: gaya === "hijab" };
}

export function tulisAvatar(p: PilihanAvatar, username: string): string | null {
  if (p.seed === username && !p.hijab) return null;
  return `${p.seed}${p.hijab && !berkasWajah(p.seed) ? "|hijab" : ""}`;
}

export function urlAvatar(p: PilihanAvatar): string {
  return berkasWajah(p.seed) ?? `/avatar?s=${encodeURIComponent(p.seed)}${p.hijab ? "&h=1" : ""}`;
}
