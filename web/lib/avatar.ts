/**
 * Avatar orang. users.avatar berisi salah satu:
 *   "w.<kode>"          wajah gambar Tiska (D-108), berkas public/wajah/<kode>.webp
 *   "<seed>[|hijab]"    Notionists lama (D-061) — tetap tampil sampai diganti
 *   kosong              jenis kelamin diisi → wajah Tiska yang sesuai, dipilih tetap dari
 *                       username (tiap orang beda, tidak acak tiap dibuka) — D-111;
 *                       belum diisi → Notionists dari username (jangan jadi wajah kembar)
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

export type JenisKelamin = "L" | "P";
export const LABEL_JENIS_KELAMIN: Record<JenisKelamin, string> = { L: "Laki-laki", P: "Perempuan" };

// Penanda tiap wajah (D-111), dicek mata dari 96 gambarnya. j & p seluruhnya perempuan,
// l seluruhnya laki-laki; c, k, x campuran. Netral boleh dipilih siapa saja.
const WAJAH_PEREMPUAN = new Set(["c02", "c04", "c06", "c08", "c10", "c12", "c14", "c16", "k03", "k04", "k09", "k11", "k14", "k16", "x07", "x08", "x09", "x10", "x12", "x13"]);
const WAJAH_NETRAL = new Set(["x11", "x15", "x16"]);

/** "L" / "P" / "N" (netral) untuk kode wajah Tiska ("w.c02" atau "c02"). */
export function jenisWajah(kode: string): JenisKelamin | "N" {
  const k = kode.replace(/^w\./, "");
  if (k[0] === "j" || k[0] === "p" || WAJAH_PEREMPUAN.has(k)) return "P";
  return WAJAH_NETRAL.has(k) ? "N" : "L";
}

/** Wajah sekelompok yang cocok untuk jenis kelamin itu (+ netral); belum diisi = semua. */
export function wajahUntuk(kelompok: string, jk: JenisKelamin | null | undefined): string[] {
  return wajahKelompok(kelompok).filter((w) => !jk || jenisWajah(w) === jk || jenisWajah(w) === "N");
}

/** Wajah bawaan sesuai jenis kelamin, tetap per username (bukan netral, supaya tiap orang beda). */
export function wajahBawaan(username: string, jk: JenisKelamin): string {
  const kolam = KELOMPOK_WAJAH.flatMap((k) => wajahKelompok(k.kode)).filter((w) => jenisWajah(w) === jk);
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return kolam[h % kolam.length];
}

export function wajahKelompok(kode: string): string[] {
  return Array.from({ length: 16 }, (_, i) => `w.${kode}${String(i + 1).padStart(2, "0")}`);
}

/** Berkas gambar untuk kode wajah Tiska; null bila bukan wajah Tiska. */
export function berkasWajah(seed: string): string | null {
  return /^w\.[ljpckx](0[1-9]|1[0-6])$/.test(seed) ? `/wajah/${seed.slice(2)}.webp` : null;
}

export function uraiAvatar(avatar: string | null | undefined, username: string, jk?: JenisKelamin | string | null): PilihanAvatar {
  const [seed, gaya] = (avatar ?? "").split("|");
  if (seed) return { seed, hijab: gaya === "hijab" };
  return { seed: jk === "L" || jk === "P" ? wajahBawaan(username, jk) : username, hijab: false };
}

export function tulisAvatar(p: PilihanAvatar, username: string): string | null {
  if (p.seed === username && !p.hijab) return null;
  return `${p.seed}${p.hijab && !berkasWajah(p.seed) ? "|hijab" : ""}`;
}

export function urlAvatar(p: PilihanAvatar): string {
  return berkasWajah(p.seed) ?? `/avatar?s=${encodeURIComponent(p.seed)}${p.hijab ? "&h=1" : ""}`;
}
