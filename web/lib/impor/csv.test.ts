import { describe, expect, it } from "vitest";

import { uraiCsv } from "./csv";

describe("uraiCsv", () => {
  it("koma, kutip, koma di dalam kutip, baris kosong dibuang", () => {
    expect(uraiCsv('Nama,Alamat\r\n"PT A, Tbk","Jl. ""Baru"" 1"\r\n\r\nB,\n')).toEqual([
      ["Nama", "Alamat"],
      ["PT A, Tbk", 'Jl. "Baru" 1'],
      ["B", ""],
    ]);
  });
  it("titik koma (Excel Indonesia) + BOM", () => {
    expect(uraiCsv("﻿Nama;Telepon\nIbu Sari;0812")).toEqual([
      ["Nama", "Telepon"],
      ["Ibu Sari", "0812"],
    ]);
  });
});
