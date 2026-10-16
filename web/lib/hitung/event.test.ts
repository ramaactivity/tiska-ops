import { describe, expect, it } from "vitest";

import { batasKunci, type ItemEvent, ringkasPerubahan } from "./event";

const item = (i: Partial<ItemEvent>): ItemEvent => ({
  session_date: "2026-12-20",
  session_label: "Lunch",
  session_time: null,
  item_name: "[BS-15] Ikan Dori",
  qty: "40",
  unit: "box",
  pax: null,
  day: "1",
  contents: ["Nasi Putih", "Ayam Kemangi"],
  ...i,
});

describe("event", () => {
  it("batas kunci: buffet H-5, box H-2, pukul 17.00 WIB", () => {
    expect(batasKunci("2026-12-20", true)?.toISOString()).toBe("2026-12-15T10:00:00.000Z");
    expect(batasKunci("2026-12-20", false)?.toISOString()).toBe("2026-12-18T10:00:00.000Z");
    expect(batasKunci("2026-03-01", false)?.toISOString()).toBe("2026-02-27T10:00:00.000Z");
    expect(batasKunci(null, true)).toBeNull();
  });

  it("ringkasan UPDATE: jumlah naik, menu ditukar, baris baru", () => {
    expect(
      ringkasPerubahan([item({})], [item({ qty: "50", contents: ["Nasi Putih", "Ayam Bakar Madu"] }), item({ item_name: "Stall kambing guling", qty: "1", contents: [] })]),
    ).toEqual(["• [BS-15] Ikan Dori: jumlah 40 → 50; menu Ayam Kemangi → Ayam Bakar Madu", "+ Stall kambing guling"]);
    expect(ringkasPerubahan([item({})], [item({})])).toEqual([]);
  });
});
