/* ==========================================================================
   DAPUR PER BARIS — Layar Dapur per dapur (D-097). Murni.
   Dapur menu = kolom menus.kitchen bila diisi kepala dapur; selain itu
   ditebak dari kategori (dessert/buah/snack/minuman → pastry & bersih,
   lainnya → masak). Menu tak dikenal → masak.
   ========================================================================== */

export type Dapur = "masak" | "pastry";

const KATEGORI_PASTRY = new Set(["dessert", "fruit", "snack", "beverage"]);

export function dapurMenu(m: { kitchen: string | null; category: string | null } | undefined): Dapur {
  if (m?.kitchen === "masak" || m?.kitchen === "pastry") return m.kitchen;
  return m?.category && KATEGORI_PASTRY.has(m.category) ? "pastry" : "masak";
}

/** Baris isi yang menjadi tugas `dapur` — satu baris bisa milik dua dapur (mis. "Snack: Risoles + Puding"). */
export function saringIsiDapur(isi: string[], dapurBaris: (baris: string) => Set<Dapur>, dapur: Dapur): string[] {
  return isi.filter((b) => dapurBaris(b).has(dapur));
}

/* ==========================================================================
   PESANAN DARI INVOICE (26 Nov 2026). Tim tidak membuat Event untuk hampir
   semua pesanan (8 dari 101 invoice), jadi layar membaca invoice langsung.
   Hari & jam diketik di judul baris, bukan di kolom sesi (data Nov 2026):
     "Day-2: Organic-LUNCH (Korean) BUFFET [Selasa, 1 Des 2026]"
     "[SESI I PAGI - 06.00] SNACK PAGI", jam pesanan "09.30 WIB brkt dr Julang"
   ========================================================================== */

/**
 * Tanggal masak tiap baris induk invoice ("YYYY-MM-DD"; null = tampil di semua tanggal acara).
 * Satu tanggal acara → semua baris di tanggal itu. Berhari-hari: tanggal yang tertulis di judul
 * menang; bila tidak ada satu pun, "Day n" → tanggal acara ke-n. Baris tanpa keduanya ikut baris
 * di atasnya (mis. "EQUIL Sparkling Water" di bawah "Arrival … Minggu, 29 Nov 2026").
 */
export function tanggalBaris(
  nama: string[],
  tanggalAcara: string[],
  baca: { tanggal: (n: string) => string | null; hariKe: (n: string) => number | null },
): (string | null)[] {
  const acara = [...new Set(tanggalAcara)].sort();
  if (acara.length <= 1) return nama.map(() => acara[0] ?? null);
  const tertulis = nama.map(baca.tanggal);
  const pakaiTanggal = tertulis.some(Boolean);
  let terakhir: string | null = null;
  return nama.map((n, i) => {
    const k = pakaiTanggal ? null : baca.hariKe(n);
    const sendiri = pakaiTanggal ? tertulis[i] : k ? (acara[k - 1] ?? null) : null;
    if (sendiri) terakhir = sendiri;
    return terakhir;
  });
}

/** Jam pertama di teks bebas: "09.30 WIB brkt dr Julang" → "09.30", "6:00–15.00" → "06.00"; null bila tidak ada. */
export function jamPertama(teks: string | null | undefined): string | null {
  const m = /(?<!\d)([01]?\d|2[0-3])[.:]([0-5]\d)(?!\d)/.exec(teks ?? "");
  return m ? `${m[1].padStart(2, "0")}.${m[2]}` : null;
}

/** Sisa waktu untuk dibaca dari jauh: "45 menit lagi", "2 jam 10 menit lagi", "1 jam lagi"; lewat → null. */
export function teksSisa(menit: number | null): string | null {
  if (menit === null || menit < 0) return null;
  if (menit < 60) return `${menit} menit lagi`;
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return `${j} jam${m ? ` ${m} menit` : ""} lagi`;
}

/* ==========================================================================
   MODE TV (26 Nov 2026, Rama): TV dapur 32 inci dipasang tinggi, dibaca orang tua
   dari ±3–4 m → huruf ±2 cm (±60 px di 1080p), cukup ±8 baris per layar. Isi dibagi
   per halaman yang berganti sendiri; tinggi tiap blok diukur di browser.
   ========================================================================== */

export type BlokHalaman = { tinggi: number; order: string | null; kepala: boolean; halamanBaru?: boolean };
export type Halaman = { blok: number[]; lanjutan: string | null };

/**
 * Bagi blok (kepala pesanan, catatan, baris menu) ke halaman setinggi `tersedia`. Halaman yang dimulai
 * di tengah pesanan diberi kepala "lanjutan" (setinggi `tinggiLanjutan`); kepala pesanan tidak dibiarkan
 * sendirian di dasar halaman; `halamanBaru` memaksa ganti halaman (bagian "Besok"). Blok yang lebih tinggi
 * dari layar tetap mendapat halaman sendiri (terpotong — jarang, isi menu yang sangat panjang).
 */
export function bagiHalaman(blok: BlokHalaman[], tinggiLanjutan: number, tersedia: number): Halaman[] {
  const hasil: Halaman[] = [];
  let h = 0;
  for (let i = 0; i < blok.length; i++) {
    const b = blok[i];
    const kini = hasil.at(-1);
    const berikut = blok[i + 1];
    const muat = kini && !b.halamanBaru && h + b.tinggi <= tersedia && (!b.kepala || (berikut !== undefined && !berikut.kepala && h + b.tinggi + berikut.tinggi <= tersedia));
    if (muat) {
      kini.blok.push(i);
      h += b.tinggi;
      continue;
    }
    const lanjutan = !b.kepala && b.order ? b.order : null;
    hasil.push({ blok: [i], lanjutan });
    h = (lanjutan ? tinggiLanjutan : 0) + b.tinggi;
  }
  return hasil;
}

/**
 * Label sesi yang diketik tim di depan nama baris: "[SESI I PAGI - 06.00] SNACK PAGI" →
 * { sesi: "SESI I PAGI - 06.00", nama: "SNACK PAGI" }. Tanpa kurung di depan → sesi null.
 */
export function pisahSesi(nama: string): { sesi: string | null; nama: string } {
  const m = /^\s*\[([^\]]+)\]\s*[-:;,]?\s*/.exec(nama);
  return m ? { sesi: m[1].trim(), nama: nama.slice(m[0].length).trim() } : { sesi: null, nama: nama.trim() };
}

/**
 * Nama tempat saja untuk layar dapur — alamat lengkap urusan sopir (Rama 26 Nov):
 * "PURI BEGAWAN - Jalan Raya Pajajaran No 5-7. Bogor" → "PURI BEGAWAN";
 * "Vila Bogor Indah #Blok DD-10/ No. 2-3 (masuk Pos …)" → "Vila Bogor Indah".
 */
export function namaTempat(tempat: string | null | undefined): string | null {
  const t = (tempat ?? "").split(/\s+[-–]\s+|,|\(|#|@|\bJl\.?\s|\bJalan\s|\bNo\.?\s*\d/i)[0]?.trim();
  return t || null;
}

/**
 * Nama baris panjang dipecah untuk layar TV: judul pendek + keterangan (data Nov 2026):
 * "FAMILY BERKAT [Nasi Keranjang 30x30]; Nasi Liwet Kecombrang (Isi 5 porsi)" → "FAMILY BERKAT" + "Nasi Keranjang 30x30 · Nasi Liwet …";
 * "Packaging: 4 set Keranjang Bambu + sleeve + pita" → "Packaging" + "4 set Keranjang Bambu + sleeve + pita".
 * Judul yang terlalu pendek (< 3 huruf) tidak dipecah.
 */
export function pecahNama(nama: string): { utama: string; detail: string | null } {
  const i = nama.search(/\s*(\[|;|:\s)/);
  const utama = i > 0 ? nama.slice(0, i).trim() : "";
  if (utama.length < 3) return { utama: nama.trim(), detail: null };
  const detail = nama
    .slice(i)
    .replace(/[[\]]/g, " ")
    .replace(/^\s*[;:]\s*/, "")
    .replace(/\s*;\s*/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { utama, detail: detail || null };
}
