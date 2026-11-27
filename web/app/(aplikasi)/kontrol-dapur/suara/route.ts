import {
  DURASI_SUARA_MAKS_MS,
  JENIS_SUARA,
  UKURAN_SUARA_MAKS,
} from "@/lib/kontrol-dapur";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Pesan suara Kontrol Dapur: rekaman dari HP/laptop operator (badan permintaan = berkas audio mentah). */
export async function POST(permintaan: Request) {
  let sesi;
  try {
    sesi = await pastikanIzin("kontrol-dapur");
  } catch {
    return Response.json(
      { galat: "Sesi berakhir. Masuk kembali." },
      { status: 401 },
    );
  }
  const jenis = (permintaan.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!JENIS_SUARA.includes(jenis))
    return Response.json(
      { galat: "Format rekaman tidak dikenali." },
      { status: 415 },
    );
  const isi = Buffer.from(await permintaan.arrayBuffer());
  if (isi.length < 500)
    return Response.json({ galat: "Rekaman terlalu pendek." }, { status: 400 });
  if (isi.length > UKURAN_SUARA_MAKS)
    return Response.json(
      { galat: "Rekaman terlalu panjang (maks. 1 menit)." },
      { status: 413 },
    );
  const ms = Math.min(
    DURASI_SUARA_MAKS_MS,
    Math.max(0, Number(new URL(permintaan.url).searchParams.get("ms")) || 0),
  );
  const p = await prisma.kitchen_announcements.create({
    data: {
      text: `Pesan suara dari ${sesi.nama}`,
      created_by: BigInt(sesi.id),
      audio: isi,
      audio_type: jenis,
      audio_ms: ms || null,
    },
    select: { id: true },
  });
  return Response.json({ id: p.id.toString() });
}
