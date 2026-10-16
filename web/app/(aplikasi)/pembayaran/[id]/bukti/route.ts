import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** Membuka bukti transfer pembayaran (D-071) — tautan bertanda tangan 5 menit. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "pembayaran", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const p = await prisma.payments.findUnique({ where: { id: BigInt(id) }, select: { transfer_proof: true } });
  if (!p?.transfer_proof) return new NextResponse("Tidak ada bukti.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(p.transfer_proof), { status: 302 });
}
