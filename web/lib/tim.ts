/* ==========================================================================
   HALAMAN TIM — kalimat suara & label hari (08-TIM-PWA §3, D-052). Murni.
   Teks suara ditulis terpisah supaya dibaca alami oleh TTS id-ID:
   "Selasa, sepuluh November. Berangkat jam lima pagi dari Julang. …"
   ========================================================================== */

const ANGKA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function kataAngka(n: number): string {
  if (n < 12) return ANGKA[n];
  if (n < 20) return `${ANGKA[n - 10]} belas`;
  if (n < 100) return `${ANGKA[Math.floor(n / 10)]} puluh${n % 10 ? ` ${ANGKA[n % 10]}` : ""}`;
  return String(n);
}

/** "05.00" → "jam lima pagi"; "13.30" → "jam satu siang lewat tiga puluh menit". */
export function jamSuara(jam: string): string {
  const m = /^(\d{1,2})[.:](\d{2})$/.exec(jam.trim());
  if (!m) return `jam ${jam}`;
  const j = Number(m[1]);
  const menit = Number(m[2]);
  const waktu = j < 11 ? "pagi" : j < 15 ? "siang" : j < 18 ? "sore" : "malam";
  const j12 = j % 12 === 0 ? 12 : j % 12;
  return `jam ${kataAngka(j12)} ${waktu}${menit ? ` lewat ${kataAngka(menit)} menit` : ""}`;
}

/** "Hari ini" / "Besok" / "Sel, 10 Nov" — tanggal "YYYY-MM-DD" dibanding hari ini WIB. */
export function labelHari(tanggal: string, hariIni: string): string {
  const selisih = Math.round((Date.parse(`${tanggal}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / 86_400_000);
  if (selisih === 0) return "Hari ini";
  if (selisih === 1) return "Besok";
  const [y, mo, d] = tanggal.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, d)));
}

export function kalimatSuara(t: { tanggal: string; hariIni: string; jam: string; kendaraan: string | null; tugas: string | null; tujuan: string | null; peran: string }): string {
  const [y, mo, d] = t.tanggal.split("-").map(Number);
  const hari = labelHari(t.tanggal, t.hariIni);
  const tglPanjang = new Intl.DateTimeFormat("id-ID", { weekday: "long", month: "long", timeZone: "UTC" }).formatToParts(new Date(Date.UTC(y, mo - 1, d)));
  const namaHari = tglPanjang.find((p) => p.type === "weekday")?.value ?? "";
  const bulan = tglPanjang.find((p) => p.type === "month")?.value ?? "";
  const kalimat = [
    `${hari === "Hari ini" || hari === "Besok" ? `${hari}, ` : ""}${namaHari}, ${kataAngka(d)} ${bulan}.`,
    `Berangkat ${jamSuara(t.jam)} dari Julang.`,
    t.peran === "captain" ? "Kamu captain, pimpin tim." : null,
    t.kendaraan ? `Kamu bawa ${t.kendaraan}.` : null,
    t.tugas ? `Tugas khusus: ${t.tugas}.` : null,
    t.tujuan ? `Tujuan: ${t.tujuan}.` : null,
  ];
  return kalimat.filter(Boolean).join(" ");
}

/* ---------- Status kirim per kloter (08-TIM-PWA §5, D-054) ---------- */

export const STATUS_KIRIM = ["berangkat", "tiba", "selesai"] as const;
export type StatusKirim = (typeof STATUS_KIRIM)[number];
export const LABEL_STATUS_KIRIM: Record<StatusKirim, string> = { berangkat: "🚐 Berangkat", tiba: "✅ Sudah sampai", selesai: "🏁 Selesai" };

/** Status berikutnya yang boleh ditekan (berurutan); null bila sudah selesai. */
export function statusBerikutnya(sudah: string[]): StatusKirim | null {
  return STATUS_KIRIM.find((s) => !sudah.includes(s)) ?? null;
}

/* ---------- Layar Dapur (08-TIM-PWA §7, D-055) ---------- */

/** Menit sampai jam berangkat "05.00" pada tanggal "YYYY-MM-DD" (WIB); negatif bila lewat. */
export function menitMenuju(tanggal: string, jam: string, sekarang: Date): number | null {
  const m = /^(\d{1,2})[.:](\d{2})$/.exec(jam.trim());
  if (!m) return null;
  const target = Date.parse(`${tanggal}T${m[1].padStart(2, "0")}:${m[2]}:00+07:00`);
  return Math.round((target - sekarang.getTime()) / 60_000);
}

const AMBANG = [15, 30, 60];

/** Ambang pengumuman suara yang baru dilewati (60/30/15 menit), atau null. */
export function ambangPengumuman(menit: number | null, sudah: number[]): number | null {
  if (menit === null || menit < 0) return null;
  return AMBANG.find((a) => menit <= a && !sudah.includes(a)) ?? null;
}

/** Ambang yang dianggap sudah diumumkan bila `ambang` diumumkan — yang lebih besar ikut lewat. */
export function tandaiAmbang(ambang: number): number[] {
  return AMBANG.filter((a) => a >= ambang);
}
