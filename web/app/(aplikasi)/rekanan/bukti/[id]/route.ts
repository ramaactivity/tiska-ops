import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** Bukti transfer Partner Fee (D-132) per invoice — tautan bertanda tangan 5 menit. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "rekanan", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const f = await prisma.partner_fees.findUnique({ where: { invoice_id: BigInt(id) }, select: { proof_path: true } });
  if (!f?.proof_path) return new NextResponse("Tidak ada bukti.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(f.proof_path), { status: 302 });
}
