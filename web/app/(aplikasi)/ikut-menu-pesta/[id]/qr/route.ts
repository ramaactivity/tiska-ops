import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { asalSitus } from "@/lib/asal-situs";
import { penggunaAktif } from "@/lib/auth";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** QR link form pesan online (D-120) — PNG 1200 px untuk flyer, diunduh tim sosmed. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "ikut-menu-pesta", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const p = await prisma.retail_programs.findUnique({ where: { id: BigInt(id) }, select: { slug: true } });
  if (!p?.slug) return new NextResponse("Program belum punya link (belum disetujui).", { status: 404 });
  const png = await QRCode.toBuffer(`${await asalSitus()}/pesan/${p.slug}`, { width: 1200, margin: 2, errorCorrectionLevel: "M" });
  return new NextResponse(new Uint8Array(png), {
    headers: { "content-type": "image/png", "content-disposition": `attachment; filename="qr-${p.slug}.png"`, "cache-control": "no-store" },
  });
}
