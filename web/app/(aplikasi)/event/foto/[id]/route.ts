import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { eventMiliknya } from "@/lib/event-akses";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** Foto bukti "sudah sampai" (D-054): yang berizin Event (miliknya) atau anggota kloternya. Tautan 5 menit. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const t = await prisma.kloter_tracking.findUnique({ where: { id: BigInt(id) }, select: { photo_path: true, kloter_id: true, event_kloters: { select: { event_id: true } } } });
  if (!t?.photo_path) return new NextResponse("Tidak ada foto.", { status: 404 });
  const kantor =
    bolehBuka(sesi.peran, "event", await bacaIzin()) &&
    (await prisma.events.count({ where: { id: t.event_kloters.event_id, ...eventMiliknya(sesi) } })) > 0;
  const anggota = (await prisma.event_assignments.count({ where: { kloter_id: t.kloter_id, user_id: BigInt(sesi.id) } })) > 0;
  if (!kantor && !anggota) return new NextResponse("Tidak ada akses.", { status: 403 });
  return NextResponse.redirect(await tautanUnduhBukti(t.photo_path), { status: 302 });
}
