/* ==========================================================================
   CARI MIRIP (D-122) — murni, aman di browser.

   Satu mesin untuk semua pencarian & saran nama: kotak pilih-cari, daftar
   menu/resep/bahan, dan saran Rapikan Menu. Toleran terhadap huruf besar-
   kecil, tanda baca, aksen, urutan kata, kata yang menempel ("lemontea"),
   dan salah ketik tipis (beda 1 huruf di kata 4–6 huruf, 2 huruf di kata
   7+ huruf, termasuk dua huruf tertukar).
   ========================================================================== */

/** "Tumis Buncis-Jagung  Semi" → "tumis buncis jagung semi". */
export function rapikanTeks(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function kata(s: string): string[] {
  return rapikanTeks(s).split(" ").filter(Boolean);
}

/** Batas salah ketik yang masih dianggap sama untuk satu kata. */
export function toleransi(panjang: number): number {
  return panjang >= 7 ? 2 : panjang >= 4 ? 1 : 0;
}

/** Jarak edit (sisip, hapus, ganti, tukar dua huruf bersebelahan); berhenti dini di atas `maks`. */
export function jarakEdit(a: string, b: string, maks = Infinity): number {
  if (Math.abs(a.length - b.length) > maks) return maks + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let minBaris = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const beda = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + beda);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      minBaris = Math.min(minBaris, d[i][j]);
    }
    if (minBaris > maks) return maks + 1;
  }
  return d[a.length][b.length];
}

/** Seberapa cocok satu kata ketikan dengan satu kata teks (0–1). Awalan kata dihitung cocok (sedang mengetik). */
function skorKata(q: string, w: string): number {
  if (q === w) return 1;
  if (w.startsWith(q) && q.length >= 2) return 0.9;
  const t = toleransi(Math.max(q.length, w.length));
  if (!t) return 0;
  const j = jarakEdit(q, w, t);
  if (j <= t) return 0.8 - 0.1 * (j - 1);
  // Awalan dengan salah ketik ("bunics" untuk "buncis…")
  if (w.length > q.length && q.length >= 4 && jarakEdit(q, w.slice(0, q.length), 1) <= 1) return 0.6;
  return 0;
}

/**
 * Skor pencarian `q` di `teks` (0 = tidak cocok, 1 = persis memuat).
 * Semua kata ketikan harus menemukan pasangannya; urutan bebas.
 */
export function skorCari(q: string, teks: string): number {
  const rq = rapikanTeks(q);
  if (!rq) return 0;
  const rt = rapikanTeks(teks);
  if (rt.includes(rq)) return rt.startsWith(rq) ? 1 : 0.97;
  const tanpaSpasi = rq.replace(/ /g, "");
  if (tanpaSpasi.length >= 4 && rt.replace(/ /g, "").includes(tanpaSpasi)) return 0.92;
  const wt = rt.split(" ");
  let total = 0;
  for (const w of rq.split(" ")) {
    const s = Math.max(0, ...wt.map((x) => skorKata(w, x)));
    if (!s) return 0;
    total += s;
  }
  return 0.85 * (total / rq.split(" ").length);
}

/** Saring & urutkan daftar menurut kecocokan; yang tidak cocok dibuang. */
export function saringMirip<T>(q: string, daftar: T[], teks: (x: T) => string | (string | null | undefined)[], batas?: number): T[] {
  if (!rapikanTeks(q)) return batas ? daftar.slice(0, batas) : daftar;
  const hasil = daftar
    .map((x, i) => {
      const t = teks(x);
      const s = Array.isArray(t) ? Math.max(0, ...t.filter((v): v is string => Boolean(v)).map((v) => skorCari(q, v))) : skorCari(q, t);
      return { x, s, i };
    })
    .filter((h) => h.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((h) => h.x);
  return batas ? hasil.slice(0, batas) : hasil;
}

/* ---------- Kemiripan dua nama (saran menu kembar / resep / nama lain) ---------- */

/** Kata penanda bentuk sajian — tidak membedakan masakannya. */
const KATA_SAJIAN = new Set(["box", "prasmanan", "buffee", "buffet", "botol", "ml", "porsi", "cup", "pcs", "sachet", "isi", "ala", "dan", "dengan", "the"]);

export function kataInti(s: string): string[] {
  // Angka tetap dihitung: "Empal Suir 1/2" ≠ "Empal Suir", "220 ml" ≠ "330 ml".
  return [...new Set(kata(s).filter((w) => (w.length > 1 || /^\d$/.test(w)) && !KATA_SAJIAN.has(w)))];
}

/**
 * Kemiripan dua nama 0–1: irisan kata (kata salah ketik tipis dihitung sama)
 * dibagi gabungan kata. "Telur Pindang" ~ "Pindang Telur" = 1;
 * "Tumis Buncis Jagung Manis" ~ "Tumis Buncis Jagung Semi" = 0,6.
 */
export function kemiripanNama(a: string, b: string): number {
  const ka = kataInti(a);
  const kb = kataInti(b);
  if (!ka.length || !kb.length) return 0;
  const sisa = [...kb];
  let sama = 0;
  for (const w of ka) {
    const i = sisa.findIndex((x) => x === w || (toleransi(Math.max(w.length, x.length)) > 0 && jarakEdit(w, x, toleransi(Math.max(w.length, x.length))) <= toleransi(Math.max(w.length, x.length))));
    if (i >= 0) {
      sama++;
      sisa.splice(i, 1);
    }
  }
  return sama / (ka.length + kb.length - sama);
}

/** Calon teratas yang cukup mirip (≥ ambang), terurut. */
export function calonMirip<T>(nama: string, daftar: T[], teks: (x: T) => string, ambang = 0.5, batas = 3): { x: T; skor: number }[] {
  return daftar
    .map((x) => ({ x, skor: kemiripanNama(nama, teks(x)) }))
    .filter((h) => h.skor >= ambang)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, batas);
}
