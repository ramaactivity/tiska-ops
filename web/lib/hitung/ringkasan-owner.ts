/* ==========================================================================
   RINGKASAN HARIAN OWNER (01-SPEC G "Ringkasan WA owner", D-093). Murni.

   Tiga teks siap kirim: malam (rencana besok + yang belum siap), pagi
   (keberangkatan hari ini), sore (rekap hari ini). Satu generator untuk
   halaman Operasional sekarang dan Hermes nanti (10-HERMES-WIKI).
   ========================================================================== */

export type KloterRingkas = { no: number; jam: string; captain: string | null; status: string[] };
export type EventRingkas = { nama: string; pelanggan: string; venue: string | null; kloter: KloterRingkas[]; peringatan: string[] };
export type TindakanRingkas = { prMenunggu: number; honorMenunggu: number; hutangJatuhTempo: number };

const hariPanjang = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

const LABEL_STATUS: Record<string, string> = {
  dimasak: "🍳 dimasak",
  packing: "📦 packing",
  siap: "✅ siap angkut",
  berangkat: "🚐 berangkat",
  tiba: "📍 sampai",
  selesai: "🏁 selesai",
};
const URUT = ["dimasak", "packing", "siap", "berangkat", "tiba", "selesai"];
const statusTerakhir = (s: string[]) => [...URUT].reverse().find((x) => s.includes(x)) ?? null;

function tindakan(t: TindakanRingkas): string[] {
  return [
    t.prMenunggu ? `• ${t.prMenunggu} PR belanja menunggu persetujuan Finance` : null,
    t.honorMenunggu ? `• ${t.honorMenunggu} absen tim/DW menunggu dikunci Finance` : null,
    t.hutangJatuhTempo ? `• ${t.hutangJatuhTempo} hutang supplier jatuh tempo (hari ini/lewat)` : null,
  ].filter((x): x is string => Boolean(x));
}

/** Malam: rencana besok + yang belum siap. */
export function ringkasanMalam(besok: string, event: EventRingkas[], t: TindakanRingkas): string {
  const baris = [`🌙 *Rencana besok — ${hariPanjang(besok)}*`, ""];
  if (!event.length) baris.push("Tidak ada event besok.");
  event.forEach((e, i) => {
    const k = e.kloter[0];
    baris.push(`${i + 1}. ${e.nama} (${e.pelanggan})${k ? ` — berangkat ${k.jam}` : ""}${e.venue ? ` · ${e.venue}` : ""}`);
  });
  const belum = event.flatMap((e) => e.peringatan.map((p) => `• ${e.nama}: ${p}`));
  if (belum.length) baris.push("", "⚠️ *Belum siap:*", ...belum);
  const tt = tindakan(t);
  if (tt.length) baris.push("", "📌 *Menunggu tindakan:*", ...tt);
  return baris.join("\n");
}

/** Pagi: keberangkatan hari ini, urut jam. */
export function ringkasanPagi(hariIni: string, event: EventRingkas[]): string {
  const baris = [`☀️ *Keberangkatan hari ini — ${hariPanjang(hariIni)}*`, ""];
  const kloter = event.flatMap((e) => e.kloter.map((k) => ({ e, k }))).sort((a, b) => a.k.jam.localeCompare(b.k.jam));
  if (!kloter.length) baris.push(event.length ? "Event hari ini belum punya kloter." : "Tidak ada event hari ini.");
  for (const { e, k } of kloter) {
    const st = statusTerakhir(k.status);
    baris.push(`${k.jam} · ${e.nama} — kloter ${k.no}${k.captain ? ` (captain ${k.captain})` : " (⚠️ tanpa captain)"}${st ? ` · ${LABEL_STATUS[st]}` : ""}`);
  }
  const belum = event.flatMap((e) => e.peringatan.map((p) => `• ${e.nama}: ${p}`));
  if (belum.length) baris.push("", "⚠️ *Perlu perhatian:*", ...belum);
  return baris.join("\n");
}

/** Sore: rekap kloter hari ini + yang menunggu tindakan. */
export function ringkasanSore(hariIni: string, event: EventRingkas[], t: TindakanRingkas): string {
  const baris = [`🌇 *Rekap hari ini — ${hariPanjang(hariIni)}*`, ""];
  if (!event.length) baris.push("Tidak ada event hari ini.");
  for (const e of event) {
    const st = e.kloter.map((k) => statusTerakhir(k.status));
    const semuaSelesai = e.kloter.length > 0 && st.every((s) => s === "selesai");
    baris.push(`• ${e.nama} (${e.pelanggan}) — ${semuaSelesai ? "🏁 selesai" : e.kloter.length ? e.kloter.map((k, i) => `kloter ${k.no}: ${st[i] ? LABEL_STATUS[st[i]!] : "belum ada status"}`).join(", ") : "tanpa kloter"}`);
  }
  const tt = tindakan(t);
  if (tt.length) baris.push("", "📌 *Menunggu tindakan:*", ...tt);
  return baris.join("\n");
}
