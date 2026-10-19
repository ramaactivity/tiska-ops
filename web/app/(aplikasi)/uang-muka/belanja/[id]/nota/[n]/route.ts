import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";

/** Foto nota ke-n (D-081) — pemegangnya sendiri atau Finance; tautan bertanda tangan 5 menit. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "uang-muka", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const { id, n } = await params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(n)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const b = await prisma.purchases.findUnique({ where: { id: BigInt(id) }, select: { holder_user_id: true, receipt_paths: true } });
  if (!b || (!bolehKelolaUang(sesi.peran) && b.holder_user_id.toString() !== sesi.id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const jalur = (b.receipt_paths as string[])[Number(n)];
  if (!jalur) return new NextResponse("Tidak ada foto.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(jalur), { status: 302 });
}
