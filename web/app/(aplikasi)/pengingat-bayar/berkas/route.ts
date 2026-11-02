import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** Foto tagihan & bukti bayar (D-128) — hanya jalur yang tercatat di tagihan; tautan bertanda tangan 5 menit. */
export async function GET(request: Request) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "pengingat-bayar", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });
  const jalur = new URL(request.url).searchParams.get("j") ?? "";
  if (!/^belanja\/\d+\/[\w-]+\.jpg$/.test(jalur)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const ada = (await prisma.bills.count({ where: { photo_paths: { has: jalur } } })) + (await prisma.bill_payments.count({ where: { proof_path: jalur } }));
  if (!ada) return new NextResponse("Tidak ditemukan.", { status: 404 });
  return NextResponse.redirect(await tautanUnduhBukti(jalur), { status: 302 });
}
