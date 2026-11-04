import { konfigurasiAi, type PesanChat, tanyaAi } from "@/lib/ai";
import { penggunaAktif } from "@/lib/auth";
import { bacaIzin } from "@/lib/izin";
import { hariIniWib } from "@/lib/kalender";
import { bolehBuka } from "@/lib/navigasi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/tanya — satu giliran Tanya Tiska (D-135). Body: { pesan: [{ peran, isi }] }. */
export async function POST(req: Request) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return Response.json({ pesan: "Silakan masuk dulu." }, { status: 401 });
  if (!bolehBuka(sesi.peran, "tanya", await bacaIzin())) return Response.json({ pesan: "Tidak ada akses ke Tanya Tiska." }, { status: 403 });
  if (!konfigurasiAi()) return Response.json({ pesan: "Tanya Tiska belum aktif — kunci AI belum dipasang." }, { status: 503 });
  let riwayat: PesanChat[];
  try {
    const body = (await req.json()) as { pesan?: unknown };
    riwayat = (Array.isArray(body.pesan) ? body.pesan : [])
      .filter((m): m is PesanChat => typeof m === "object" && m !== null && ((m as PesanChat).peran === "user" || (m as PesanChat).peran === "assistant") && typeof (m as PesanChat).isi === "string")
      .map((m) => ({ peran: m.peran, isi: m.isi.slice(0, 2000) }));
  } catch {
    return Response.json({ pesan: "Permintaan tidak sah." }, { status: 400 });
  }
  if (!riwayat.length || riwayat.at(-1)!.peran !== "user") return Response.json({ pesan: "Pertanyaannya kosong." }, { status: 400 });
  try {
    return Response.json(await tanyaAi(riwayat, sesi, hariIniWib()));
  } catch (e) {
    const t = (e as Error).message;
    const kuota = /\b429\b|quota|RESOURCE_EXHAUSTED/i.test(t);
    console.error("[tanya]", t);
    return Response.json({ pesan: kuota ? "Kuota AI gratis hari ini habis. Coba lagi besok, atau pakai Cari Cepat." : "AI sedang tidak bisa dihubungi. Coba lagi sebentar, atau pakai Cari Cepat." }, { status: 502 });
  }
}
