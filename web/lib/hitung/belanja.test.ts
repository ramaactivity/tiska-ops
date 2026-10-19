import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { barisDariKebutuhan, nilaiBaris, totalBelanja } from "./belanja";
import type { BarisKebutuhan } from "./kebutuhan";

const k = (b: Partial<BarisKebutuhan>): BarisKebutuhan => ({
  idBahan: "1",
  nama: "Beras",
  satuan: "gr",
  qty: new Decimal(4200),
  kemasan: new Decimal("0.84"),
  perKemasan: new Decimal(5000),
  satuanBeli: "karung 5 kg",
  pengganti: false,
  menu: ["Nasi Putih"],
  ...b,
});

describe("daftar belanja dari kebutuhan", () => {
  it("berkemasan → satuan beli + harga kemasan; tanpa harga kemasan → per satuan × isi kemasan", () => {
    const harga = new Map([
      ["1", { perSatuan: "13.5", perKemasan: 67_500 }],
      ["2", { perSatuan: "40", perKemasan: null }],
    ]);
    const {
      baris: [beras, ayam],
    } = barisDariKebutuhan(
      [k({}), k({ idBahan: "2", nama: "Ayam", qty: new Decimal(2000), kemasan: new Decimal(2), perKemasan: new Decimal(1000), satuanBeli: "kg" })],
      harga,
    );
    expect([beras.qtyBeli.toFixed(2), beras.satuanBeli, beras.hargaPerkiraan?.toFixed(0)]).toEqual(["0.84", "karung 5 kg", "67500"]);
    expect([ayam.qtyBeli.toFixed(0), ayam.satuanBeli, ayam.hargaPerkiraan?.toFixed(0)]).toEqual(["2", "kg", "40000"]);
    // 0,84 × 67.500 = 56.700; 2 × 40.000 = 80.000
    expect(totalBelanja([beras, ayam]).total.toFixed(0)).toBe("136700");
  });

  it("tanpa kemasan → satuan pakai & harga per satuan; tanpa harga → null, dihitung terpisah", () => {
    const {
      baris: [garam, cabe],
    } = barisDariKebutuhan(
      [
        k({ idBahan: "3", nama: "Garam", qty: new Decimal(250), kemasan: null, perKemasan: null, satuanBeli: null }),
        k({ idBahan: "4", nama: "Cabe", kemasan: null, perKemasan: null }),
      ],
      new Map([["3", { perSatuan: "2.4", perKemasan: 1200 }]]),
    );
    expect([garam.qtyBeli.toFixed(0), garam.satuanBeli, garam.hargaPerkiraan?.toFixed(1)]).toEqual(["250", "gr", "2.4"]);
    expect(cabe.hargaPerkiraan).toBeNull();
    expect(totalBelanja([garam, cabe])).toEqual({ total: new Decimal(600), tanpaHarga: 1 });
    expect(nilaiBaris("1.5", "333.33").toFixed(0)).toBe("500");
  });

  it("stok dikurangkan + isi ulang ke minimum; cukup dari stok → tidak dibeli; satuan beda → stok diabaikan", () => {
    const harga = new Map([["1", { perSatuan: "13.5", perKemasan: 67_500 }]]);
    // Beras perlu 4.200 gr, stok 3.000 gr, minimum 2.000 → beli 1.200 + 2.000 = 3.200 gr = 0,64 karung
    const a = barisDariKebutuhan([k({})], harga, new Map([["1", { saldo: 3000, minimum: 2000, satuan: "gr" }]]));
    expect([a.baris[0].dariStok?.toFixed(0), a.baris[0].qtyBeli.toFixed(2), a.baris[0].satuanBeli]).toEqual(["3000", "0.64", "karung 5 kg"]);
    // Stok 10.000 gr tanpa minimum → cukup dari stok
    const b = barisDariKebutuhan([k({})], harga, new Map([["1", { saldo: 10000, minimum: null, satuan: "Gram" }]]));
    expect(b.baris).toEqual([]);
    expect(b.cukupDariStok.map((x) => [x.nama, x.qty.toFixed(0)])).toEqual([["Beras", "4200"]]);
    // Satuan stok "Liter" ≠ resep "gr" → stok diabaikan, beli penuh
    const c = barisDariKebutuhan([k({})], harga, new Map([["1", { saldo: 10000, minimum: null, satuan: "Liter" }]]));
    expect([c.baris[0].dariStok, c.baris[0].qtyBeli.toFixed(2)]).toEqual([null, "0.84"]);
  });
});
