import { describe, expect, it } from "vitest";

import { dapurMenu, saringIsiDapur } from "./dapur-layar";

describe("dapur per baris (D-097)", () => {
  it("kolom kitchen menang; kategori jadi tebakan; tak dikenal → masak", () => {
    expect(dapurMenu({ kitchen: "pastry", category: "chicken" })).toBe("pastry");
    expect(dapurMenu({ kitchen: null, category: "dessert" })).toBe("pastry");
    expect(dapurMenu({ kitchen: null, category: "beverage" })).toBe("pastry");
    expect(dapurMenu({ kitchen: null, category: "chicken" })).toBe("masak");
    expect(dapurMenu(undefined)).toBe("masak");
  });
  it("saring baris per dapur; baris campuran ikut di keduanya", () => {
    const peta: Record<string, ("masak" | "pastry")[]> = { "Soup: Soto": ["masak"], "Dessert: Puding": ["pastry"], "Snack: Risoles + Puding": ["masak", "pastry"] };
    const isi = Object.keys(peta);
    const f = (b: string) => new Set(peta[b]);
    expect(saringIsiDapur(isi, f, "pastry")).toEqual(["Dessert: Puding", "Snack: Risoles + Puding"]);
    expect(saringIsiDapur(isi, f, "masak")).toEqual(["Soup: Soto", "Snack: Risoles + Puding"]);
  });
});
