import { describe, expect, it } from "vitest";

import { DEFINISI_IMPOR, petakanBaris } from "./definisi";

describe("petakanBaris", () => {
  it("judul longgar & urutan bebas", () => {
    const r = petakanBaris(DEFINISI_IMPOR.customer, [
      ["telepon", "NAMA *", "Lain"],
      [" 0812 ", "Ibu Sari", "x"],
    ]);
    expect(r.kolomHilang).toEqual([]);
    expect(r.baris[0]).toMatchObject({ name: "Ibu Sari", phone: "0812", email: "" });
  });
  it("kolom wajib hilang dilaporkan", () => {
    expect(petakanBaris(DEFINISI_IMPOR.customer, [["PIC"], ["a"]]).kolomHilang).toEqual(["Nama"]);
  });
});
