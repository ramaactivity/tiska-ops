import { describe, expect, it } from "vitest";

import { bacaUrut, urutkan } from "./urut";

describe("urut", () => {
  it("kolom tak dikenal → bawaan; minus = menurun", () => {
    expect(bacaUrut("-nilai", ["nilai", "nomor"], "-nomor")).toEqual({ kolom: "nilai", arah: "desc" });
    expect(bacaUrut("x", ["nilai", "nomor"], "-nomor")).toEqual({ kolom: "nomor", arah: "desc" });
    expect(bacaUrut(undefined, ["nilai"], "nilai")).toEqual({ kolom: "nilai", arah: "asc" });
  });
  it("angka, teks, null di akhir", () => {
    const d = [{ v: 2 }, { v: null }, { v: 10 }];
    expect(urutkan(d, (x) => x.v, "desc").map((x) => x.v)).toEqual([10, 2, null]);
    expect(urutkan(["b", "A", "c"], (x) => x, "asc")).toEqual(["A", "b", "c"]);
  });
});
