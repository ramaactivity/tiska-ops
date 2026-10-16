import "server-only";

import ExcelJS from "exceljs";

import { uraiCsv } from "./csv";

export const BATAS_BERKAS = 2 * 1024 * 1024;
export const BATAS_BARIS = 2000;

/** Isi sel ExcelJS → teks apa adanya (angka tanpa format ribuan, tanggal YYYY-MM-DD, hasil rumus). */
function teksSel(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // Sel angka Excel (0.5) ditulis dengan koma desimal seperti yang diketik orang: "0,5".
  if (typeof v === "number") return String(v).replace(".", ",");
  if (typeof v === "object") {
    if ("result" in v) return teksSel(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v);
}

/** Berkas .xlsx atau .csv → baris mentah (lembar pertama untuk Excel). */
export async function bacaBerkasImpor(berkas: File): Promise<string[][]> {
  if (berkas.size > BATAS_BERKAS) throw new Error("Berkas lebih dari 2 MB. Pecah jadi beberapa berkas.");
  const nama = berkas.name.toLowerCase();
  if (nama.endsWith(".csv")) return uraiCsv(await berkas.text());
  if (!nama.endsWith(".xlsx")) throw new Error("Pakai berkas Excel (.xlsx) atau CSV (.csv).");

  const buku = new ExcelJS.Workbook();
  try {
    await buku.xlsx.load(await berkas.arrayBuffer());
  } catch {
    throw new Error("Berkas Excel tidak bisa dibaca. Simpan ulang sebagai .xlsx lalu coba lagi.");
  }
  const lembar = buku.worksheets[0];
  if (!lembar) return [];
  const hasil: string[][] = [];
  lembar.eachRow({ includeEmpty: false }, (row) => {
    const sel: string[] = [];
    for (let i = 1; i <= lembar.columnCount; i++) sel.push(teksSel(row.getCell(i).value).trim());
    if (sel.some((s) => s !== "")) hasil.push(sel);
  });
  return hasil;
}
