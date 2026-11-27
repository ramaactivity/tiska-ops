import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Putar pesan suara: dibuka TV (izin layar-dapur) dan operator (izin kontrol-dapur). */
export async function GET(
  _: Request,
  { params }: RouteContext<"/layar-dapur/suara/[id]">,
) {
  const boleh = await pastikanIzin("layar-dapur")
    .then(() => true)
    .catch(() =>
      pastikanIzin("kontrol-dapur")
        .then(() => true)
        .catch(() => false),
    );
  if (!boleh) return new Response("Tidak boleh", { status: 401 });
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id))
    return new Response("Tidak ditemukan", { status: 404 });
  const p = await prisma.kitchen_announcements.findUnique({
    where: { id: BigInt(id) },
    select: { audio: true, audio_type: true },
  });
  if (!p?.audio || !p.audio_type)
    return new Response("Tidak ditemukan", { status: 404 });
  return new Response(new Uint8Array(p.audio), {
    headers: {
      "content-type": p.audio_type,
      "cache-control": "private, max-age=86400",
    },
  });
}
