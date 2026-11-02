import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** Kwitansi ber-e-meterai (D-130) — tautan bertanda tangan 5 menit. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "pembayaran", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const p = await prisma.payments.findUnique({ where: { id: BigInt(id) }, select: { receipt_stamped_path: true } });
  if (!p?.receipt_stamped_path) return new NextResponse("Belum ada kwitansi ber-e-meterai.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(p.receipt_stamped_path), { status: 302 });
}
