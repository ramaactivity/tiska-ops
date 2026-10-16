import { describe, expect, it } from "vitest";

import { awalanKode, kodeBerikutnya } from "./kode-master";

describe("kodeBerikutnya", () => {
  it("mengikuti lebar angka data lama", () => {
    expect(kodeBerikutnya("MC1-", ["MC1-001", "MC1-547", "MC2-063"])).toBe("MC1-548");
    expect(kodeBerikutnya("BS-", ["BS-1", "BS-9", "BS-24"])).toBe("BS-25");
    expect(kodeBerikutnya("PR-", ["PR-01", "PR-20"])).toBe("PR-21");
  });
  it("mengabaikan kode berawalan lain atau berekor bukan angka", () => {
    expect(kodeBerikutnya("Gcs-", ["Gcs-332", "Gcs-x", "Gcsx-999"])).toBe("Gcs-333");
  });
  it("tanpa data lama mulai dari 001", () => {
    expect(kodeBerikutnya("LN-", [])).toBe("LN-001");
  });
  it("awalanKode", () => {
    expect(awalanKode("PR-07")).toBe("PR-");
  });
});
