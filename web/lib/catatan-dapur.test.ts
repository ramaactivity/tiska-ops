import { describe, expect, it } from "vitest";

import { sambungCatatan, tampakCatatan, teksCatatan } from "./catatan-dapur";

const b = (item_name: string, price = "0", children: unknown[] = []) => ({ item_name, price, children });

describe("baris yang sebenarnya catatan (QUO/TC/2611/006)", () => {
  it("NOTED tanpa harga & isi → catatan, awalan dibuang", () => {
    const n = "NOTED: 65 pax -> dibagi 2 area [55 pax di area umum - 10 pax di area VIP]";
    expect(tampakCatatan(b(n))).toBe(true);
    expect(teksCatatan(n)).toBe("65 pax -> dibagi 2 area [55 pax di area umum - 10 pax di area VIP]");
  });

  it.each(["Note - sambal dipisah", "NB: datang jam 9", "Catatan: tanpa MSG", "Ket. meja VIP 10 pax", "INFO tamu muslim semua"])("%s → catatan", (n) => {
    expect(tampakCatatan(b(n, ""))).toBe(true);
  });

  it("berharga, berisi, atau bukan berawalan catatan → bukan", () => {
    expect(tampakCatatan(b("NOTED: tambahan", "50.000"))).toBe(false);
    expect(tampakCatatan(b("NOTED: menu luar", "0", [{}]))).toBe(false);
    expect(tampakCatatan(b("Nasi Kuning Noted"))).toBe(false);
    expect(tampakCatatan(b("Infused Water"))).toBe(false);
    expect(tampakCatatan(b("Nota-nota"))).toBe(false);
    expect(tampakCatatan(b("Notebook rental"))).toBe(false);
    expect(tampakCatatan(b("Information desk snack"))).toBe(false);
    expect(teksCatatan("Ket. meja VIP 10 pax")).toBe("meja VIP 10 pax");
  });

  it("disambung di baris baru tanpa baris kosong", () => {
    expect(sambungCatatan("", "a")).toBe("a");
    expect(sambungCatatan("a\n", " b ")).toBe("a\nb");
  });
});
