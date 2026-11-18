import { describe, expect, it } from "vitest";

import { labelSesi, tanggalSesiPendek } from "./sesi";

describe("label sesi", () => {
  it("tanggal teks dibaca lokal, tidak mundur sehari", () => {
    expect(labelSesi({ tanggal: "2026-10-20", jenis: "Lunch", jam: "11.00–13.00" })).toBe("Selasa, 20 Oktober 2026 · LUNCH · 11.00–13.00 WIB ready to serve");
    expect(labelSesi({ jenis: "Breakfast", jam: "07.00 WIB" })).toBe("BREAKFAST · 07.00 WIB ready to serve");
    expect(tanggalSesiPendek("2026-10-20")).toBe("Sel, 20 Okt");
  });

  it("isian kosong dilewati; semuanya kosong → string kosong", () => {
    expect(labelSesi({ jenis: "Dinner" })).toBe("DINNER");
    expect(labelSesi({ tanggal: null, jenis: " ", jam: null })).toBe("");
  });
});
