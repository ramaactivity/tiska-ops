/* ==========================================================================
   IKUT PESEN MENU PESTA (D-115, docs/14-IKUT-MENU-PESTA.md) — murni.

   Program retail dari menu acara besar: 2–3 paket @ harga per pax (belum
   PBJT). Di sini: nama Weekend/Weekday, aturan isi paket (nasi putih tidak
   dijual, pola 2 protein + 1 sayur hanya diperingatkan), hitung untung per
   pax & titik impas untuk cek HPP, dan teks bahan flyer.
   ========================================================================== */

export const STATUS_PROGRAM = {
  diusulkan: "Menunggu cek HPP",
  dikembalikan: "Dikembalikan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
} as const;
export type StatusProgram = keyof typeof STATUS_PROGRAM;

export function nadaStatus(s: string): "baik" | "perhatian" | "netral" {
  return s === "disetujui" ? "baik" : s === "diusulkan" || s === "dikembalikan" ? "perhatian" : "netral";
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2026-09-06" → "Minggu, 06 September 2026" (format flyer). */
export function tanggalFlyer(iso: string): string {
  const t = new Date(`${iso}T00:00:00Z`);
  return `${HARI[t.getUTCDay()]}, ${String(t.getUTCDate()).padStart(2, "0")} ${BULAN[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

/** Sabtu/Minggu = Weekend, selain itu Weekday. */
export function jenisHari(iso: string): "Weekend" | "Weekday" {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6 ? "Weekend" : "Weekday";
}

export function namaProgram(iso: string): string {
  return `Ikut Pesen Menu Pesta Tiska ${jenisHari(iso)} · ${tanggalFlyer(iso)}`;
}

/** Batas order bawaan: sehari sebelum kirim pukul 14.00 WIB (flyer Weekend). Hasil: "YYYY-MM-DD", "HH.MM" (format PilihJam). */
export function batasOrderBawaan(iso: string): { tanggal: string; jam: string } {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  return { tanggal: t.toISOString().slice(0, 10), jam: "14.00" };
}

/** Nasi putih tidak dijual di paket retail (jawaban tim #1); nasi olahan boleh. */
export function nasiPutih(nama: string): boolean {
  return /\bnasi\s+putih\b/i.test(nama) || /^\s*(steam(ed)?\s+rice|white\s+rice)\s*$/i.test(nama);
}

const PROTEIN = new Set(["beef", "chicken", "fish", "seafood", "egg_tofu"]);

export type IsiPaket = { nama: string; kategori: string | null };

/** Peringatan pola isi (tidak menolak — keputusan di pengusul & penyetuju). */
export function peringatanPaket(isi: IsiPaket[]): string[] {
  const p: string[] = [];
  if (isi.length === 0) return ["Paket masih kosong."];
  const protein = isi.filter((i) => i.kategori && PROTEIN.has(i.kategori)).length;
  const sayur = isi.filter((i) => i.kategori === "vegetable").length;
  const tanpaKategori = isi.filter((i) => !i.kategori).length;
  if (protein !== 2) p.push(`Protein ${protein}, polanya 2.`);
  if (sayur !== 1) p.push(`Sayur ${sayur}, polanya 1.`);
  if (tanpaKategori) p.push(`${tanpaKategori} menu belum punya kategori — pola tidak bisa dicek penuh.`);
  if (isi.some((i) => nasiPutih(i.nama))) p.push("Ada nasi putih — tidak dijual di paket retail.");
  return p;
}

export type HasilUntung = {
  /** null = ada menu yang HPP-nya belum diketahui (tidak ditebak). */
  hppMenu: number | null;
  menuTanpaHpp: number;
  biayaPerPax: number | null;
  untungPerPax: number | null;
  untungPct: number | null;
  nada: "baik" | "perhatian" | "bahaya" | "netral";
  /** Pax minimal satu program supaya biaya antar tertutup; null bila untung ≤ 0 atau tidak diketahui. */
  impasPax: number | null;
};

/**
 * Untung per pax = harga (belum PBJT) − (HPP menu + kemasan). Biaya antar
 * per program dibagi ke titik impas, bukan ke per pax (jumlah pax belum tahu).
 */
export function hitungUntungPaket(a: {
  harga: number;
  hppMenu: (number | null)[];
  kemasan: number;
  biayaAntar: number;
  amanPct: number;
  minPct: number;
}): HasilUntung {
  const tanpa = a.hppMenu.filter((h) => h == null).length;
  if (tanpa || a.hppMenu.length === 0 || a.harga <= 0) {
    return { hppMenu: null, menuTanpaHpp: tanpa, biayaPerPax: null, untungPerPax: null, untungPct: null, nada: "netral", impasPax: null };
  }
  const hppMenu = Math.round((a.hppMenu as number[]).reduce((x, y) => x + y, 0) * 100) / 100;
  const biayaPerPax = hppMenu + a.kemasan;
  const untungPerPax = a.harga - biayaPerPax;
  const untungPct = Math.round((untungPerPax / a.harga) * 1000) / 10;
  const nada = untungPct >= a.amanPct ? "baik" : untungPct >= a.minPct ? "perhatian" : "bahaya";
  const impasPax = untungPerPax > 0 ? Math.max(1, Math.ceil(a.biayaAntar / untungPerPax)) : null;
  return { hppMenu, menuTanpaHpp: 0, biayaPerPax, untungPerPax, untungPct, nada, impasPax };
}

export type DataFlyer = {
  tanggalKirim: string;
  batasOrder: { tanggal: string; jam: string };
  paket: { judul: string; isi: string[] }[];
  harga: number;
  minPax: number;
  area: string;
  kontak: string | null;
};

/** Teks bahan flyer untuk tim sosmed — tanpa HPP. */
export function teksFlyer(d: DataFlyer): string {
  const ribu = d.harga % 1000 === 0 ? `${d.harga / 1000}K` : d.harga.toLocaleString("id-ID");
  return [
    `Open Pre-Order — Ikut Pesen Menu Pesta Tiska ${jenisHari(d.tanggalKirim)}`,
    `Pengiriman ${tanggalFlyer(d.tanggalKirim)}`,
    "",
    ...d.paket.map((p) => `${p.judul}: ${p.isi.join(" · ")}`),
    "",
    `${ribu} per pax (belum termasuk PBJT)`,
    `Minimum order ${d.minPax} pax`,
    `Free delivery area ${d.area}`,
    `Last order: ${tanggalFlyer(d.batasOrder.tanggal)} jam ${d.batasOrder.jam} WIB`,
    ...(d.kontak ? [`Pemesanan: ${d.kontak}`] : []),
  ].join("\n");
}

/* ---------- Tahap B: pesanan retail (D-116) ---------- */

export const ASAL_PESANAN = { wa: "WhatsApp", ig: "Instagram", langganan: "Langganan", teman: "Dari teman", lainnya: "Lainnya" } as const;
export type AsalPesanan = keyof typeof ASAL_PESANAN;
export const CARA_BAYAR = { transfer: "Transfer", cod: "Bayar saat kirim" } as const;

/** Aturan program untuk satu pesanan; null = boleh. Kuota hanya bila diisi (jawaban tim #4). */
export function cekPesanan(a: { pax: number[]; minPax: number; maksPax: number | null; paxTerpakai: number }): string | null {
  const total = a.pax.reduce((x, y) => x + y, 0);
  if (a.pax.some((p) => !Number.isInteger(p) || p < 0)) return "Jumlah pax harus bilangan bulat.";
  if (total === 0) return "Isi jumlah pax minimal di satu paket.";
  if (total < a.minPax) return `Minimal order ${a.minPax} pax (sekarang ${total}).`;
  if (a.maksPax != null && a.paxTerpakai + total > a.maksPax) return `Kuota tinggal ${Math.max(0, a.maksPax - a.paxTerpakai)} pax.`;
  return null;
}

/** "0812-3456 789" / "+62 812…" → "0812…" untuk mencocokkan pembeli langganan. */
export function rapikanHp(h: string): string {
  return h.replace(/\D/g, "").replace(/^62/, "0");
}

export type PaketPorsi = { idSet: string; judul: string; isi: string[] };

/** Total pax per paket & porsi per menu dari pesanan aktif — untuk dapur (tanpa harga). */
export function rekapPorsi(paket: PaketPorsi[], pesanan: { idSet: string; pax: number }[]) {
  const perPaket = new Map(paket.map((p) => [p.idSet, 0]));
  for (const x of pesanan) if (perPaket.has(x.idSet)) perPaket.set(x.idSet, perPaket.get(x.idSet)! + x.pax);
  const perMenu = new Map<string, number>();
  for (const p of paket) for (const m of p.isi) perMenu.set(m, (perMenu.get(m) ?? 0) + perPaket.get(p.idSet)!);
  return {
    paket: paket.map((p) => ({ ...p, pax: perPaket.get(p.idSet)! })),
    menu: [...perMenu.entries()].filter(([, n]) => n > 0).map(([nama, porsi]) => ({ nama, porsi })),
    totalPax: [...perPaket.values()].reduce((x, y) => x + y, 0),
  };
}
