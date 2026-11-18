import { describe, expect, it } from "vitest";

import { gabungSaran } from "./saran-dokumen";

describe("saran dokumen", () => {
  it("yang paling sering dipakai di depan, saran umum menyusul tanpa dobel", () => {
    expect(gabungSaran(["Gathering", "pernikahan", "Pernikahan", null, " "], ["Pernikahan", "Seminar"])).toEqual(["pernikahan", "Gathering", "Seminar"]);
  });
});
