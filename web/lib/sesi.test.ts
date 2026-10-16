import { describe, expect, it } from "vitest";

import { labelSesi, tanggalSesiPendek } from "./sesi";

describe("label sesi", () => {
  it("tanggal teks dibaca lokal, tidak mundur sehari", () => {
    expect(labelSesi({ tanggal: "2026-10-20", jenis: "Lunch", jam: "11.00–13.00" })).toBe("Sel, 20 Okt 2026 · Lunch · 11.00–13.00");
    expect(tanggalSesiPendek("2026-10-20")).toBe("Sel, 20 Okt");
  });

  it("isian kosong dilewati; semuanya kosong → string kosong", () => {
    expect(labelSesi({ jenis: "Dinner" })).toBe("Dinner");
    expect(labelSesi({ tanggal: null, jenis: " ", jam: null })).toBe("");
  });
});
