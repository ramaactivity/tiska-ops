import { describe, expect, it } from "vitest";

import { gridBulan, labelTanggal, rapikanJam } from "./kalender";

describe("kalender", () => {
  it("Oktober 2026: 1 Okt hari Kamis → grid mulai Senin 28 Sep", () => {
    const g = gridBulan(2026, 9);
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ tanggal: "2026-09-28", hari: 28, diBulanIni: false });
    expect(g[3]).toEqual({ tanggal: "2026-10-01", hari: 1, diBulanIni: true });
    expect(g.filter((x) => x.diBulanIni)).toHaveLength(31);
  });

  it("label tanggal & jam dirapikan", () => {
    expect(labelTanggal("2026-10-20")).toBe("Sel, 20 Okt 2026");
    expect(rapikanJam("5")).toBe("05.00");
    expect(rapikanJam("05:30")).toBe("05.30");
    expect(rapikanJam("1130")).toBe("11.30");
    expect(rapikanJam("25.00")).toBeNull();
  });
});
