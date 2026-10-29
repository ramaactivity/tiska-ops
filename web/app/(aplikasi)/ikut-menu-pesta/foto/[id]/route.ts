import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { tautanUnduhBukti } from "@/lib/bukti-berkas";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/**
 * Foto bukti "sudah diantar" satu pesanan Ikut Menu Pesta (D-117): berizin program atau anggota kloternya.
 * ?jenis=transfer → bukti transfer dari pembeli (D-120), hanya kantor. Tautan 5 menit.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const transfer = new URL(request.url).searchParams.get("jenis") === "transfer";
  const o = await prisma.retail_orders.findUnique({ where: { id: BigInt(id) }, select: { delivery_photo: true, transfer_proof: true, kloter_id: true } });
  const kantor = bolehBuka(sesi.peran, "ikut-menu-pesta", await bacaIzin());
  if (transfer) {
    if (!o?.transfer_proof) return new NextResponse("Tidak ada foto.", { status: 404 });
    if (!kantor) return new NextResponse("Tidak ada akses.", { status: 403 });
    return NextResponse.redirect(await tautanUnduhBukti(o.transfer_proof), { status: 302 });
  }
  if (!o?.delivery_photo) return new NextResponse("Tidak ada foto.", { status: 404 });
  const anggota = o.kloter_id ? (await prisma.event_assignments.count({ where: { kloter_id: o.kloter_id, user_id: BigInt(sesi.id) } })) > 0 : false;
  if (!kantor && !anggota) return new NextResponse("Tidak ada akses.", { status: 403 });
  return NextResponse.redirect(await tautanUnduhBukti(o.delivery_photo), { status: 302 });
}
