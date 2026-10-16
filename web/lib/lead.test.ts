import { describe, expect, it } from "vitest";

import { statusFollowup } from "./lead";

describe("status follow-up lead", () => {
  const kini = new Date("2026-10-16T05:00:00Z"); // 12.00 WIB
  it("lewat → terlambat; hari ini → hari_ini; besok → null", () => {
    expect(statusFollowup(new Date("2026-10-15T00:00:00Z"), "tanya", kini)).toBe("terlambat");
    expect(statusFollowup(new Date("2026-10-16T00:00:00Z"), "quotation", kini)).toBe("hari_ini");
    expect(statusFollowup(new Date("2026-10-17T00:00:00Z"), "tanya", kini)).toBeNull();
  });
  it("lead selesai/batal tidak perlu follow-up; hari WIB dipakai (00.30 WIB 17 Okt sudah tanggal 17)", () => {
    expect(statusFollowup(new Date("2026-10-01T00:00:00Z"), "batal", kini)).toBeNull();
    expect(statusFollowup(new Date("2026-10-16T00:00:00Z"), "tanya", new Date("2026-10-16T17:30:00Z"))).toBe("terlambat");
    expect(statusFollowup(new Date("2026-10-17T00:00:00Z"), "tanya", new Date("2026-10-16T17:30:00Z"))).toBe("hari_ini");
  });
});
