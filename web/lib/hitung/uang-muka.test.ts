import { describe, expect, it } from "vitest";

import { cekSaldoCukup, nilaiBarisNota, saldoUangMuka, totalNota } from "./uang-muka";

describe("uang muka belanja", () => {
  it("saldo = topup − belanja − pengembalian; yang dibatalkan tidak dihitung", () => {
    const saldo = saldoUangMuka([
      { kind: "topup", amount: "500000", status: "posted" },
      { kind: "belanja", amount: "320500", status: "posted" },
      { kind: "belanja", amount: "100000", status: "batal" },
      { kind: "pengembalian", amount: "79500", status: "posted" },
    ]);
    expect(saldo.toFixed(0)).toBe("100000");
  });

  it("nota: qty desimal × harga dibulatkan per baris", () => {
    expect(nilaiBarisNota("2.35", "49000").toFixed(0)).toBe("115150");
    expect(nilaiBarisNota("0.333", "10000").toFixed(0)).toBe("3330");
    expect(totalNota([{ qty: "2.35", harga: 49000 }, { qty: 3, harga: "12500" }]).toFixed(0)).toBe("152650");
  });

  it("uang keluar melebihi saldo ditolak dengan angka kurangnya; pas = boleh", () => {
    expect(cekSaldoCukup(100000, 100000)).toBeNull();
    expect(cekSaldoCukup(100000, 152650)).toBe(
      "Saldo uang muka tidak cukup: sisa Rp 100.000, butuh Rp 152.650 (kurang Rp 52.650). Minta Finance menambah dana dulu.",
    );
  });
});
