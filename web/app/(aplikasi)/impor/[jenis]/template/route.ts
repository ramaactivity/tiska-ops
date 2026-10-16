import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { DEFINISI_IMPOR } from "@/lib/impor/definisi";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";

export const dynamic = "force-dynamic";

const kutip = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Template impor (D-073): .xlsx (lembar isian + petunjuk) atau .csv, berisi judul kolom + satu baris contoh. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ jenis: string }> }) {
  const sesi = await penggunaAktif();
  if (!sesi) return NextResponse.redirect(new URL("/masuk", request.url));
  const def = DEFINISI_IMPOR[(await params).jenis];
  if (!def) return new NextResponse("Tidak ditemukan.", { status: 404 });
  if (!bolehBuka(sesi.peran, def.izin, await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });

  const nama = `template-impor-${def.jenis}`;
  if (request.nextUrl.searchParams.get("format") === "csv") {
    const isi = [def.kolom.map((k) => k.judul), def.kolom.map((k) => k.contoh)].map((b) => b.map(kutip).join(",")).join("\r\n");
    return new NextResponse(`﻿${isi}\r\n`, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nama}.csv"` },
    });
  }

  const buku = new ExcelJS.Workbook();
  buku.creator = "Tiska Ops";
  const isian = buku.addWorksheet(def.judul);
  isian.columns = def.kolom.map((k) => ({ header: k.wajib ? `${k.judul} *` : k.judul, key: k.kunci, width: Math.max(16, k.contoh.length + 4) }));
  isian.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  isian.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B4FA8" } };
  isian.addRow(Object.fromEntries(def.kolom.map((k) => [k.kunci, k.contoh])));
  isian.getRow(2).font = { italic: true, color: { argb: "FF8A8F98" } };
  isian.views = [{ state: "frozen", ySplit: 1 }];
  // Semua kolom teks: nomor HP berawalan 0 tidak berubah jadi angka.
  def.kolom.forEach((_, i) => (isian.getColumn(i + 1).numFmt = "@"));

  const petunjuk = buku.addWorksheet("Petunjuk");
  petunjuk.columns = [{ width: 18 }, { width: 10 }, { width: 70 }];
  petunjuk.addRow([`Impor ${def.judul} — Tiska Ops`]).font = { bold: true, size: 14 };
  petunjuk.addRow(["1. Isi di lembar pertama mulai baris 2. Baris contoh (abu-abu) boleh ditimpa atau dihapus."]);
  petunjuk.addRow(["2. Jangan ubah judul kolom di baris 1. Kolom bertanda * wajib diisi."]);
  petunjuk.addRow([`3. ${def.duplikat}`]);
  petunjuk.addRow(["4. Simpan, lalu unggah di aplikasi. Anda akan melihat hasil pemeriksaan dulu sebelum data disimpan."]);
  petunjuk.addRow([]);
  petunjuk.addRow(["Kolom", "Wajib", "Keterangan"]).font = { bold: true };
  for (const k of def.kolom) petunjuk.addRow([k.judul, k.wajib ? "Ya" : "", `${k.ket ?? ""}${k.ket ? " · " : ""}contoh: ${k.contoh}`]);

  return new NextResponse(await buku.xlsx.writeBuffer(), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${nama}.xlsx"`,
    },
  });
}
