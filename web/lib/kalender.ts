/* ==========================================================================
   KALENDER — logika murni untuk PilihTanggal (D-059). Tanggal = "YYYY-MM-DD"
   (tanpa zona waktu, tidak bergeser sehari). Minggu dimulai Senin.
   ========================================================================== */

export const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const HARI_PENDEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const dua = (n: number) => String(n).padStart(2, "0");
export const isoTanggal = (y: number, m: number, d: number) => `${y}-${dua(m + 1)}-${dua(d)}`;

export function uraiTanggal(t: string | null | undefined): { y: number; m: number; d: number } | null {
  const c = t ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(t) : null;
  return c ? { y: Number(c[1]), m: Number(c[2]) - 1, d: Number(c[3]) } : null;
}

/** 6 minggu × 7 hari untuk bulan `m` (0–11) tahun `y`. */
export function gridBulan(y: number, m: number): { tanggal: string; hari: number; diBulanIni: boolean }[] {
  const awal = new Date(Date.UTC(y, m, 1));
  const geser = (awal.getUTCDay() + 6) % 7; // Senin = 0
  return Array.from({ length: 42 }, (_, i) => {
    const t = new Date(Date.UTC(y, m, 1 - geser + i));
    return { tanggal: isoTanggal(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()), hari: t.getUTCDate(), diBulanIni: t.getUTCMonth() === m };
  });
}

/** "2026-10-20" → "Sel, 20 Okt 2026". */
export function labelTanggal(t: string): string {
  const u = uraiTanggal(t);
  if (!u) return t;
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(u.y, u.m, u.d)));
}

export function hariIniWib(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

/** Pilihan cepat periode laporan (Rama, 18 Nov 2026). Rentang penuh: minggu Senin–Minggu, bulan tanggal 1–akhir. */
export const PERIODE_CEPAT = [
  { nilai: "hari-ini", label: "Hari ini" },
  { nilai: "minggu-ini", label: "Minggu ini" },
  { nilai: "bulan-ini", label: "Bulan ini" },
  { nilai: "bulan-lalu", label: "Bulan lalu" },
  { nilai: "tahun-ini", label: "Tahun ini" },
] as const;
export type PeriodeCepat = (typeof PERIODE_CEPAT)[number]["nilai"];

export function rentangPeriode(periode: PeriodeCepat, hariIni = hariIniWib()): { dari: string; sampai: string } {
  const { y, m, d } = uraiTanggal(hariIni)!;
  // Date.UTC menormalkan tanggal 0 / minus (akhir bulan lalu, mundur ke Senin) tanpa geser zona waktu.
  const t = (yy: number, mm: number, dd: number) => {
    const x = new Date(Date.UTC(yy, mm, dd));
    return isoTanggal(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  };
  const keSenin = (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7;
  switch (periode) {
    case "hari-ini":
      return { dari: hariIni, sampai: hariIni };
    case "minggu-ini":
      return { dari: t(y, m, d - keSenin), sampai: t(y, m, d - keSenin + 6) };
    case "bulan-ini":
      return { dari: t(y, m, 1), sampai: t(y, m + 1, 0) };
    case "bulan-lalu":
      return { dari: t(y, m - 1, 1), sampai: t(y, m, 0) };
    case "tahun-ini":
      return { dari: t(y, 0, 1), sampai: t(y, 11, 31) };
  }
}

/** Periode cepat yang persis sama dengan rentang terpilih, atau null (tanggal dipilih sendiri). */
export function periodeAktif(dari: string, sampai: string, hariIni = hariIniWib()): PeriodeCepat | null {
  return PERIODE_CEPAT.find(({ nilai }) => {
    const r = rentangPeriode(nilai, hariIni);
    return r.dari === dari && r.sampai === sampai;
  })?.nilai ?? null;
}

/** "5.3" / "05:30" / "530" → "05.30"; tidak sah → null. */
export function rapikanJam(teks: string): string | null {
  const t = teks.trim().replace(":", ".");
  const m = /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(t) ?? /^(\d{1,2})(\d{2})$/.exec(t);
  if (!m) return null;
  const j = Number(m[1]);
  const mn = Number(m[2] ?? 0);
  return j < 24 && mn < 60 ? `${dua(j)}.${dua(mn)}` : null;
}
