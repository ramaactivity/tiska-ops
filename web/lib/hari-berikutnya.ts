/* ==========================================================================
   SALIN KE HARI BERIKUTNYA (D-217)

   Pesanan berhari-hari diketik satu baris per hari dengan nomor hari dan
   tanggal di judulnya, dalam gaya tiap orang (data 18 Nov 2026):
     "[DAY 9] Minggu, 15 November 2026 - Lunch & Dinner Box"   (Mbak Rakhma)
     "DAY-1 [Sabtu, 7 Nov 2026] Lunch & Dinner Box: …"         (Rita)
     "Day 1 - LUNCH BUFFET [Nusantara]"                          (Mas Reza)
   Judul hari berikutnya dibuat dari judul itu sendiri: nomor hari +1 dan
   tanggal maju ke tanggal acara berikutnya (atau +1 hari), gaya tulisannya
   dipertahankan persis. Tanpa nomor hari maupun tanggal → null.
   ========================================================================== */

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const POLA_HARI_KE = /\b(day)(\s*-?\s*)(\d+)\b/i;
const POLA_TANGGAL = new RegExp(
  `(?:(${HARI.join("|")}|Jum'at),?\\s+)?(\\d{1,2})\\s+(${[...BULAN, ...BULAN_PENDEK, "Ags", "Agt"].join("|")})\\.?\\s+(\\d{4})`,
  "i",
);

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function bacaBulan(teks: string): { bulan: number; pendek: boolean } | null {
  const t = teks.toLowerCase();
  const panjang = BULAN.findIndex((b) => b.toLowerCase() === t);
  if (panjang >= 0) return { bulan: panjang, pendek: false };
  const pendek = BULAN_PENDEK.findIndex((b) => b.toLowerCase() === t);
  if (pendek >= 0) return { bulan: pendek, pendek: true };
  return t === "ags" || t === "agt" ? { bulan: 7, pendek: true } : null;
}

/**
 * @param tanggalAcara tanggal acara dokumen ("2026-11-15"); tanggal berikutnya diambil dari sini bila ada, selain itu +1 hari.
 */
export function judulHariBerikutnya(nama: string, tanggalAcara: string[] = []): string | null {
  let hasil = nama;
  let berubah = false;

  const hariKe = POLA_HARI_KE.exec(hasil);
  if (hariKe) {
    hasil = hasil.replace(POLA_HARI_KE, `${hariKe[1]}${hariKe[2]}${Number(hariKe[3]) + 1}`);
    berubah = true;
  }

  const tgl = POLA_TANGGAL.exec(hasil);
  const bln = tgl ? bacaBulan(tgl[3]) : null;
  if (tgl && bln) {
    const kini = new Date(Number(tgl[4]), bln.bulan, Number(tgl[2]));
    const urut = [...new Set(tanggalAcara.filter(Boolean))].sort();
    const dariAcara = urut.find((t) => t > iso(kini));
    const besok = dariAcara ? new Date(`${dariAcara}T00:00:00`) : new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() + 1);
    const bulanBaru = bln.pendek ? BULAN_PENDEK[besok.getMonth()] : BULAN[besok.getMonth()];
    const namaBulan = tgl[3] === tgl[3].toUpperCase() ? bulanBaru.toUpperCase() : bulanBaru;
    // Gaya asli dipertahankan: ada/tidaknya nama hari & koma, bulan panjang/pendek, huruf besar nama hari.
    const namaHari = tgl[1] ? HARI[besok.getDay()] : "";
    const hariTulis = tgl[1] && tgl[1] === tgl[1].toUpperCase() ? namaHari.toUpperCase() : namaHari;
    const koma = tgl[1] && tgl[0].slice(tgl[1].length).startsWith(",") ? "," : "";
    const baru = `${namaHari ? `${hariTulis}${koma} ` : ""}${besok.getDate()} ${namaBulan} ${besok.getFullYear()}`;
    hasil = hasil.replace(tgl[0], baru);
    berubah = true;
  }

  return berubah ? hasil : null;
}
