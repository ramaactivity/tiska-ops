/* ==========================================================================
   ULANG TAHUN KARYAWAN (D-109). Murni.

   Tanggal & bulan wajib, tahun opsional. 29 Februari dirayakan 28 Februari
   pada tahun biasa — supaya tidak ada ulang tahun yang terlewat.
   ========================================================================== */

export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export type UlangTahun = { nama: string; hari: number; bulan: number };

const kabisat = (t: number) => (t % 4 === 0 && t % 100 !== 0) || t % 400 === 0;
const hariDalamBulan = (bulan: number, tahun: number) => new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();

/** Tanggal ulang tahun sah (29 Februari boleh). */
export function tanggalSah(hari: number, bulan: number): boolean {
  return Number.isInteger(hari) && Number.isInteger(bulan) && bulan >= 1 && bulan <= 12 && hari >= 1 && hari <= hariDalamBulan(bulan, 2024);
}

/** Berapa hari lagi ulang tahun berikutnya dari hariIni ("YYYY-MM-DD", WIB); 0 = hari ini. */
export function hariMenuju(u: Pick<UlangTahun, "hari" | "bulan">, hariIni: string): number {
  const [t, b, h] = hariIni.split("-").map(Number);
  const pada = (tahun: number) => Date.UTC(tahun, u.bulan - 1, u.bulan === 2 && u.hari === 29 && !kabisat(tahun) ? 28 : u.hari);
  const kini = Date.UTC(t, b - 1, h);
  const ini = pada(t);
  return Math.round(((ini >= kini ? ini : pada(t + 1)) - kini) / 86_400_000);
}

/** Yang berulang tahun dalam n hari ke depan (0 = hari ini), urut terdekat. */
export function mendatang<T extends Pick<UlangTahun, "hari" | "bulan">>(daftar: T[], hariIni: string, n: number): (T & { lagi: number })[] {
  return daftar
    .map((u) => ({ ...u, lagi: hariMenuju(u, hariIni) }))
    .filter((u) => u.lagi <= n)
    .sort((a, b) => a.lagi - b.lagi);
}

/** Teks daftar siap kirim WA, format daftar tim yang sudah biasa dipakai. Tanggal sama digabung "A & B". */
export function teksDaftarWa(daftar: UlangTahun[]): string {
  const baris = [`🎂 *DAFTAR ULANG TAHUN TIM/ KARYAWAN TC* 🎂`];
  for (let b = 1; b <= 12; b++) {
    const diBulan = daftar.filter((u) => u.bulan === b);
    if (!diBulan.length) continue;
    baris.push("", `📅 *${BULAN[b - 1].toUpperCase()}*`);
    const perHari = new Map<number, string[]>();
    for (const u of diBulan.sort((x, y) => x.hari - y.hari || x.nama.localeCompare(y.nama))) perHari.set(u.hari, [...(perHari.get(u.hari) ?? []), u.nama]);
    for (const [h, nama] of perHari) baris.push(`- ${String(h).padStart(2, "0")} ${BULAN[b - 1]} – ${nama.join(" & ")}`);
  }
  return baris.join("\n");
}
