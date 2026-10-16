/* ==========================================================================
   PENAGIHAN — kelompok "langkah berikutnya" Kartu Piutang (D-060). Murni.

   tagih     : ada invoice lewat jatuh tempo dan belum ada kabar
   menunggu  : lewat jatuh tempo tetapi sudah dihubungi ≤3 hari lalu, atau
               ada janji bayar yang tanggalnya belum lewat
   segera    : belum lewat, jatuh tempo terdekat ≤7 hari lagi
   belum     : jatuh tempo lebih dari 7 hari lagi
   ========================================================================== */

export type KelompokTagih = "tagih" | "menunggu" | "segera" | "belum";

export const URUTAN_TAGIH: KelompokTagih[] = ["tagih", "menunggu", "segera", "belum"];
export const LABEL_TAGIH: Record<KelompokTagih, { judul: string; ket: string }> = {
  tagih: { judul: "Tagih sekarang", ket: "Lewat jatuh tempo dan belum ada kabar." },
  menunggu: { judul: "Menunggu jawaban", ket: "Sudah dihubungi atau sudah janji bayar." },
  segera: { judul: "Segera jatuh tempo", ket: "Jatuh tempo dalam 7 hari ke depan." },
  belum: { judul: "Belum perlu ditagih", ket: "Jatuh tempo lebih dari 7 hari lagi." },
};

const hari = (dari: string, ke: string) => Math.round((Date.parse(`${ke}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / 86_400_000);

export function kelompokTagih(
  m: { tempo: string[]; kontakTerakhir: string | null; janji: string | null },
  hariIni: string,
): { kelompok: KelompokTagih; terlambat: number; menujuTempo: number } {
  const terlambat = Math.max(0, ...m.tempo.map((t) => hari(t, hariIni)));
  const menujuTempo = Math.min(...m.tempo.map((t) => hari(hariIni, t)).filter((x) => x >= 0), Infinity);
  if (terlambat > 0) {
    const baruDihubungi = m.kontakTerakhir !== null && hari(m.kontakTerakhir, hariIni) <= 3;
    const janjiAktif = m.janji !== null && m.janji >= hariIni;
    return { kelompok: baruDihubungi || janjiAktif ? "menunggu" : "tagih", terlambat, menujuTempo };
  }
  return { kelompok: menujuTempo <= 7 ? "segera" : "belum", terlambat, menujuTempo };
}

const rp = (v: string | number) => `Rp ${Math.round(Number(v)).toLocaleString("id-ID")}`;
const tgl = (t: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/** Draf pengingat WA — gaya admin Tiska (CLAUDE.md): pendek, sopan, tanpa basa-basi. Admin tetap bisa mengubahnya. */
export function pesanPengingat(invoice: { nomor: string; sisa: string; tempo: string }[]): string {
  if (!invoice.length) return "";
  const total = invoice.reduce((s, i) => s + Number(i.sisa), 0);
  const rincian =
    invoice.length === 1
      ? `invoice ${invoice[0].nomor} sebesar ${rp(invoice[0].sisa)} (jatuh tempo ${tgl(invoice[0].tempo)})`
      : `${invoice.length} invoice dengan total ${rp(total)}:\n${invoice.map((i) => `- ${i.nomor}: ${rp(i.sisa)} (jatuh tempo ${tgl(i.tempo)})`).join("\n")}`;
  return `Selamat siang Kak, kami dari Tiska Catering mau mengingatkan ${rincian}.\n\nMohon info jadwal pembayarannya ya, Kak. Terima kasih.`;
}

/** Nomor HP Indonesia → format wa.me (62…); null bila tidak terbaca. */
export function nomorWa(hp: string | null): string | null {
  const angka = (hp ?? "").replace(/\D/g, "");
  if (angka.length < 9) return null;
  return angka.startsWith("62") ? angka : angka.startsWith("0") ? `62${angka.slice(1)}` : `62${angka}`;
}
