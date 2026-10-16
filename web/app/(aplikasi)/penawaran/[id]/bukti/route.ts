import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya } from "@/lib/rbac";

/** Membuka bukti persetujuan customer (D-044) — tautan bertanda tangan 5 menit. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "penawaran", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const p = await prisma.quotations.findFirst({
    where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
    select: { client_approval_proof: true },
  });
  if (!p?.client_approval_proof) return new NextResponse("Tidak ada bukti.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(p.client_approval_proof), { status: 302 });
}
