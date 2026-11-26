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
