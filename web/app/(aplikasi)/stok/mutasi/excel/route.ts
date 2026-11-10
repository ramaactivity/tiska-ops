import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { bacaIzin } from "@/lib/izin";
import { bacaPeriode, mutasiKeseluruhan, mutasiPerBahan } from "@/lib/laporan-mutasi";
import { bolehBuka } from "@/lib/navigasi";

export const dynamic = "force-dynamic";

/** Unduhan laporan mutasi stok (D-148) — angka ditulis sebagai ANGKA supaya bisa dijumlah di Excel. */
export async function GET(request: NextRequest) {
  const sesi = await penggunaAktif();
  if (!sesi) return NextResponse.json({ pesan: "Silakan masuk lebih dulu." }, { status: 401 });
  if (!bolehBuka(sesi.peran, "stok", await bacaIzin())) return NextResponse.json({ pesan: "Anda tidak punya akses." }, { status: 403 });

  const p = bacaPeriode(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const buku = new ExcelJS.Workbook();
  const ws = buku.addWorksheet("Mutasi");
  const angka = "#,##0.###";
  let nama = `mutasi-stok-${p.dari}-sd-${p.sampai}`;

  if (p.bahan) {
    const k = await mutasiPerBahan(p.bahan, p.dari, p.sampai);
    if (!k) return NextResponse.json({ pesan: "Bahan tidak ditemukan." }, { status: 404 });
    nama += `-${k.bahan.code}`;
    ws.addRow([`Mutasi per bahan: ${k.bahan.name} (${k.bahan.code}) · satuan ${k.bahan.satuan ?? "-"}`]).font = { bold: true };
    ws.addRow([`Periode ${p.dari} s/d ${p.sampai}`]);
    ws.addRow([]);
    ws.addRow(["Tanggal", "Jenis", "Keterangan", "Masuk", "Keluar", "Saldo"]).font = { bold: true };
    ws.addRow(["", "Saldo awal", "", null, null, k.awal.toNumber()]);
    for (const b of k.baris) {
      const q = Number(b.qty);
      ws.addRow([b.tanggal, b.jenis, b.keterangan, q > 0 ? q : null, q < 0 ? -q : null, b.saldo.toNumber()]);
    }
    ws.addRow(["", "Saldo akhir", "", null, null, k.akhir.toNumber()]).font = { bold: true };
    ws.columns = [{ width: 12 }, { width: 18 }, { width: 50 }, { width: 12, style: { numFmt: angka } }, { width: 12, style: { numFmt: angka } }, { width: 12, style: { numFmt: angka } }];
  } else {
    const r = await mutasiKeseluruhan(p.dari, p.sampai);
    ws.addRow(["Mutasi stok keseluruhan"]).font = { bold: true };
    ws.addRow([`Periode ${p.dari} s/d ${p.sampai}`]);
    ws.addRow([]);
    ws.addRow(["Kode", "Bahan", "Kategori", "Satuan", "Saldo awal", "Masuk", "Keluar", "Saldo akhir"]).font = { bold: true };
    for (const x of r) ws.addRow([x.kode, x.nama, x.kategori, x.satuan ?? "", x.awal.toNumber(), x.masuk.toNumber(), x.keluar.toNumber(), x.akhir.toNumber()]);
    ws.columns = [
      { width: 12 },
      { width: 36 },
      { width: 16 },
      { width: 10 },
      ...[0, 1, 2, 3].map(() => ({ width: 13, style: { numFmt: angka } })),
    ];
  }

  const isi = await buku.xlsx.writeBuffer();
  return new NextResponse(isi as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${nama}.xlsx"`,
    },
  });
}
