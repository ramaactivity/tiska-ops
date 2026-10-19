import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";

/** Bukti transfer dana uang muka (D-081) — pemegangnya sendiri atau Finance. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "uang-muka", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const m = await prisma.cash_advances.findUnique({ where: { id: BigInt(id) }, select: { holder_user_id: true, proof_path: true } });
  if (!m?.proof_path || (!bolehKelolaUang(sesi.peran) && m.holder_user_id.toString() !== sesi.id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(m.proof_path), { status: 302 });
}
