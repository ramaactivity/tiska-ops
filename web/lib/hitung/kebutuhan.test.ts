import { describe, expect, it } from "vitest";

import { hitungKebutuhan, type ResepKebutuhan } from "./kebutuhan";

const nasi: ResepKebutuhan = {
  porsiPerBatch: 10,
  baris: [{ idBahan: "1", nama: "Beras", satuan: "gr", qtyPerBatch: 1000, perKemasan: 5000, satuanBeli: "karung 5 kg", pengganti: false }],
};
const ayam: ResepKebutuhan = {
  porsiPerBatch: 8,
  baris: [
    { idBahan: "2", nama: "Ayam potong", satuan: "gr", qtyPerBatch: 800, perKemasan: null, satuanBeli: null, pengganti: false },
    { idBahan: "1", nama: "Beras", satuan: "gr", qtyPerBatch: 80, perKemasan: 5000, satuanBeli: "karung 5 kg", pengganti: false },
  ],
};

describe("kebutuhan bahan", () => {
  it("dijumlah per bahan lintas menu; faktor porsi; perkiraan kemasan dibulatkan ke atas", () => {
    const h = hitungKebutuhan([
      { menu: "Nasi Putih", porsi: 40, faktor: 1, resep: nasi },
      { menu: "Ayam Kemangi", porsi: 40, faktor: "0.5", resep: ayam },
    ]);
    // Beras: 40 × 100 gr + 40 × 10 gr × 0,5 = 4.000 + 200 = 4.200 gr ≈ 0,84 karung
    expect(h.bahan.map((b) => [b.nama, b.qty.toFixed(2), b.kemasan?.toFixed(2) ?? null, b.menu.join("+")])).toEqual([
      ["Ayam potong", "2000.00", null, "Ayam Kemangi"],
      ["Beras", "4200.00", "0.84", "Nasi Putih+Ayam Kemangi"],
    ]);
    expect(h.tanpaResep).toEqual([]);
  });

  it("menu tanpa resep / porsi batch kosong dilaporkan, porsinya dijumlah", () => {
    const h = hitungKebutuhan([
      { menu: "Serundeng", porsi: 40, faktor: 1, resep: null },
      { menu: "Serundeng", porsi: 20, faktor: 1, resep: null },
      { menu: "Sambal", porsi: 10, faktor: 1, resep: { porsiPerBatch: null, baris: [] } },
    ]);
    expect(h.bahan).toEqual([]);
    expect(h.tanpaResep).toEqual([{ menu: "Serundeng", porsi: 60 }, { menu: "Sambal", porsi: 10 }]);
  });
});
