import { z } from "zod";

import { type SinyalLayar, UMUR_PENGUMUMAN_MS } from "@/lib/kontrol-dapur";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Sinyal Layar Dapur (Kontrol Dapur MVP): TV melaporkan statusnya dan menerima kendali dari dashboard. */

const Laporan = z.object({
  layar: z.string().regex(/^[a-z0-9-]{8,64}$/),
  suara: z.boolean(),
  penuh: z.boolean(),
  ukuran: z.string().max(20),
  tayang: z.string().max(300).nullable(),
  dapur: z.enum(["masak", "pastry"]).nullable(),
  dibacakan: z
    .string()
    .regex(/^\d{1,18}$/)
    .nullable(),
});

export async function POST(permintaan: Request) {
  let idPengguna: bigint;
  try {
    idPengguna = BigInt((await pastikanIzin("layar-dapur")).id);
  } catch {
    return Response.json(
      { galat: "Sesi berakhir. Masuk kembali di layar ini." },
      { status: 401 },
    );
  }
  const d = Laporan.safeParse(await permintaan.json().catch(() => null));
  if (!d.success)
    return Response.json(
      { galat: "Laporan layar tidak dikenali." },
      { status: 400 },
    );
  const l = d.data;

  const status = {
    last_seen: new Date(),
    sound: l.suara,
    fullscreen: l.penuh,
    size: l.ukuran,
    showing: l.tayang,
    kitchen: l.dapur,
    user_id: idPengguna,
  };
  await prisma.kitchen_screens.upsert({
    where: { id: l.layar },
    create: { id: l.layar, ...status },
    update: status,
  });
  if (l.dibacakan) {
    await prisma.kitchen_announcements.updateMany({
      where: { id: BigInt(l.dibacakan), read_at: null },
      data: { read_at: new Date(), read_screen: l.layar },
    });
  }

  const [k, p] = await Promise.all([
    prisma.kitchen_controls.findUnique({ where: { id: 1 } }),
    prisma.kitchen_announcements.findFirst({
      where: { created_at: { gte: new Date(Date.now() - UMUR_PENGUMUMAN_MS) } },
      orderBy: { id: "desc" },
      // Rekaman TIDAK ikut dibaca di sini (polling tiap 6 dtk) — TV mengunduhnya sekali lewat /layar-dapur/suara/[id].
      select: { id: true, text: true, audio_type: true, audio_ms: true },
    }),
  ]);
  const jawaban: SinyalLayar = {
    mode: k?.mode === "tahan" ? "tahan" : "otomatis",
    perintah:
      k?.command === "next" || k?.command === "prev" || k?.command === "ulang"
        ? k.command
        : null,
    seq: k?.command_seq ?? 0,
    running:
      k?.running_active && k.running_text?.trim()
        ? k.running_text.trim()
        : null,
    pengumuman: p
      ? {
          id: p.id.toString(),
          teks: p.text,
          suara: Boolean(p.audio_type),
          ms: p.audio_ms,
        }
      : null,
  };
  return Response.json(jawaban);
}
