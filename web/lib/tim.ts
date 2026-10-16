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
