import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { satuanStok } from "@/lib/hitung/stok";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

/** Daftar bahan (tanpa harga) untuk pencari di form waste/koreksi stok (D-087). */
export async function GET() {
  const sesi = await penggunaAktif();
  if (!sesi || !bolehBuka(sesi.peran, "stok", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });
  const bahan = await prisma.ingredients.findMany({ where: { merged_into: null }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, usage_unit: true, purchase_unit: true } });
  return NextResponse.json(bahan.map((b) => ({ id: b.id.toString(), label: b.name, sub: [b.code, satuanStok(b)].filter(Boolean).join(" · "), satuan: satuanStok(b) })));
}
