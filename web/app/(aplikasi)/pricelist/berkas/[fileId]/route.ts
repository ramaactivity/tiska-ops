import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { tautanUnduh } from "@/lib/pricelist-berkas";
import { prisma } from "@/lib/prisma";

/**
 * Membuka versi mana pun (termasuk versi lama/arsip) untuk orang dalam yang
 * login & berizin Pricelist. Klien memakai /pl/<slug>, bukan ini.
 */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi || sesi.wajibGantiSandi) return NextResponse.redirect(new URL("/masuk", request.url));
  if (!bolehBuka(sesi.peran, "pricelist", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const { fileId } = await params;
  if (!/^\d+$/.test(fileId)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const f = await prisma.pricelist_files.findUnique({ where: { id: BigInt(fileId) }, select: { file_path: true, light_path: true } });
  if (!f) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const ringan = new URL(request.url).searchParams.get("jenis") === "ringan" && f.light_path;
  return NextResponse.redirect(await tautanUnduh(ringan ? f.light_path! : f.file_path), { status: 302 });
}
