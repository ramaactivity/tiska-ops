import { describe, expect, it } from "vitest";

import { barangKloter, nomorDo } from "./delivery-order";

describe("delivery order", () => {
  it("nomor dari quotation + kloter", () => {
    expect(nomorDo("QUO/TC/2610/007", 2)).toBe("DO/TC/2610/007-K2");
    expect(nomorDo("QUO/TC/2610/007")).toBe("DO/TC/2610/007");
  });
  it("barang per kloter lewat jam; tidak ada yang cocok → semua", () => {
    const items = [{ n: "cb", session_time: "10.00" }, { n: "box", session_time: "13:30" }, { n: "x", session_time: null }];
    expect(barangKloter(items, "13.30").map((i) => i.n)).toEqual(["box"]);
    expect(barangKloter(items, "9.00").map((i) => i.n)).toEqual(["cb", "box", "x"]);
  });
});
