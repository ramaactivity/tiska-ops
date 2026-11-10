import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** Foto bukti biaya sewa ke-n (D-147); tautan bertanda tangan 5 menit. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "biaya-sewa", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const { id, n } = await params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(n)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const s = await prisma.rental_costs.findUnique({ where: { id: BigInt(id) }, select: { proof_paths: true } });
  const jalur = (s?.proof_paths as string[] | undefined)?.[Number(n)];
  if (!jalur) return new NextResponse("Tidak ada foto.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(jalur), { status: 302 });
}
