/**
 * Pengurai CSV kecil (D-073): tanda kutip ganda, koma ATAU titik koma
 * (Excel berbahasa Indonesia menyimpan CSV dengan ";"), BOM, CRLF.
 */
export function uraiCsv(teks: string): string[][] {
  const t = teks.replace(/^﻿/, "");
  const barisPertama = t.split(/\r?\n/, 1)[0] ?? "";
  const pemisah = (barisPertama.match(/;/g)?.length ?? 0) > (barisPertama.match(/,/g)?.length ?? 0) ? ";" : ",";
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = "";
  let kutip = false;
  for (let i = 0; i < t.length; i++) {
    const h = t[i];
    if (kutip) {
      if (h === '"' && t[i + 1] === '"') {
        sel += '"';
        i++;
      } else if (h === '"') kutip = false;
      else sel += h;
    } else if (h === '"') kutip = true;
    else if (h === pemisah) {
      baris.push(sel);
      sel = "";
    } else if (h === "\n" || h === "\r") {
      if (h === "\r" && t[i + 1] === "\n") i++;
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = "";
    } else sel += h;
  }
  if (sel !== "" || baris.length) {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil.filter((b) => b.some((s) => s.trim() !== ""));
}
