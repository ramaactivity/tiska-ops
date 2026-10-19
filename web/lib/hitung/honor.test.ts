import { describe, expect, it } from "vitest";

import { feeUsulan, rapikanJam, statusKerja } from "./honor";

describe("honor tim & DW", () => {
  it("status kerja: tanpa akun = freelance; akun tanpa status = tetap", () => {
    expect(statusKerja(false, null)).toBe("freelance");
    expect(statusKerja(true, null)).toBe("tetap");
    expect(statusKerja(true, "freelance")).toBe("freelance");
  });

  it("fee usulan dari tarif peran × status; tidak hadir 0; tarif kosong null", () => {
    const tarif = [
      { role: "steward", employment: "tetap", amount: "100000" },
      { role: "steward", employment: "freelance", amount: 150000 },
      { role: "dw", employment: "freelance", amount: "125000" },
    ];
    expect(feeUsulan(tarif, "steward", "tetap", true)).toBe(100000);
    expect(feeUsulan(tarif, "steward", "freelance", null)).toBe(150000);
    expect(feeUsulan(tarif, "dw", "freelance", true)).toBe(125000);
    expect(feeUsulan(tarif, "steward", "tetap", false)).toBe(0);
    expect(feeUsulan(tarif, "driver", "tetap", true)).toBeNull();
  });

  it("jam datang/pulang dirapikan", () => {
    expect(["7.30", "07:30", "730", "7", "23.59"].map(rapikanJam)).toEqual(["07.30", "07.30", "07.30", "07.00", "23.59"]);
    expect(["24.00", "7.75", "abc", ""].map(rapikanJam)).toEqual([null, null, null, null]);
  });
});
