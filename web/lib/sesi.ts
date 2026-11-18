import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/* ==========================================================================
   SESI PER HARI (01-SPEC E.2, D-041) — satu baris quotation/invoice boleh
   ditandai tanggal, jenis sesi, dan jam: "Sen, 20 Okt 2026 · Lunch ·
   11.00–13.00". Dipakai form, detail, cetak, lembar dapur, Excel. Murni.
   ========================================================================== */

export const JENIS_SESI = ["Breakfast", "Coffee Break", "Lunch", "Dinner", "Stall", "Snack"] as const;

/** "2026-10-20" dibaca sebagai tanggal lokal, bukan UTC (yang bisa mundur sehari). */
function bacaTanggal(t: Date | string): Date | null {
  if (t instanceof Date) return Number.isNaN(t.getTime()) ? null : t;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Tanggal pendek untuk tombol sesi: "Sen, 20 Okt". */
export function tanggalSesiPendek(t: Date | string): string {
  const d = bacaTanggal(t);
  return d ? format(d, "EEE, d MMM", { locale: localeId }) : "";
}

/** Label lengkap; kosong bila tidak ada satu pun isian sesi. */
export function labelSesi(s: { tanggal?: Date | string | null; jenis?: string | null; jam?: string | null }): string {
  const d = s.tanggal ? bacaTanggal(s.tanggal) : null;
  // Gaya judul yang biasa diketik tim (D-217): "Minggu, 25 Oktober 2026 · BREAKFAST · 07.00 WIB ready to serve".
  const jam = s.jam?.trim() ?? "";
  const jamTulis = jam ? `${jam}${/wib/i.test(jam) ? "" : " WIB"} ready to serve` : "";
  return [d ? format(d, "EEEE, d MMMM yyyy", { locale: localeId }) : "", s.jenis?.trim().toUpperCase() ?? "", jamTulis]
    .filter(Boolean)
    .join(" · ");
}
