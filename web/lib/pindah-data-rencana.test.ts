import { describe, expect, it } from "vitest";

import { cariKembar, type DataLama, saranUser, susunRencana, TABEL_LAMA } from "./pindah-data-rencana";

function lamaKosong(): DataLama {
  const d = Object.fromEntries(TABEL_LAMA.map((t) => [t, []])) as unknown as DataLama;
  d.users = [];
  d.signatories = [];
  return d;
}

describe("cariKembar", () => {
  const c = [
    { id: "644", name: "Meet The Bride - WO", phone: "0813-1676-2304" },
    { id: "1452", name: "MEET THE BRIDE - WO", phone: "0813-1676-2304" },
    { id: "689", name: "Meet The Bride - WO", phone: "0819-0592-3522" },
    { id: "315", name: "Ibu Mona", phone: "0822-9929-8877" },
    { id: "1792", name: "Ibu Santi-Mona Sabatina", phone: "0822 9929 8877" },
    { id: "7", name: "House of Sekar", phone: null },
  ];

  it("mengelompokkan nama sama atau HP sama; saran hanya menggabung nama sama", () => {
    const k = cariKembar(c, { "644": 2, "689": 1 });
    expect(k).toHaveLength(2);
    const mtb = k.find((g) => g.anggota.includes("644"))!;
    expect(mtb.anggota.sort()).toEqual(["1452", "644", "689"]);
    expect(mtb.saran.utama).toBe("644");
    expect(mtb.saran.ikut.sort()).toEqual(["1452", "689"]);
    const mona = k.find((g) => g.anggota.includes("315"))!;
    expect(mona.saran.ikut).toEqual([]);
  });
});

describe("saranUser", () => {
  const baru = [
    { id: "10", username: "rama", name: "Ramadan Saputra" },
    { id: "39", username: "rahma", name: "Ariz Rakhma" },
  ];
  it("username dulu, lalu nama", () => {
    expect(saranUser({ username: "rama", name: "Rama" }, baru)).toBe("10");
    expect(saranUser({ username: "rakhma", name: "Ariz Rakhma" }, baru)).toBe("39");
    expect(saranUser({ username: "tiya", name: "Tiya" }, baru)).toBeNull();
  });
});

describe("susunRencana", () => {
  const lama = lamaKosong();
  lama.customers = [
    { id: "1", name: "A", created_by: "408" },
    { id: "2", name: "a", created_by: "3" },
  ];
  lama.quotations = [
    {
      id: "5",
      customer_id: "2",
      created_by: "3",
      cancelled_by: null,
      signatory_id: "14",
      grand_total: "100",
    },
  ];
  lama.invoices = [
    {
      id: "6",
      customer_id: "2",
      created_by: "408",
      cancelled_by: null,
      signatory_id: "16",
      grand_total: "1000.5",
    },
  ];
  lama.payments = [{ id: "7", customer_id: "1", created_by: "408", total_amount: "400" }];

  const k = {
    user: { "408": "10", "3": null },
    penandatangan: { "14": "baru", "16": "3", "1": "baru" },
    gabung: [{ utama: "1", ikut: ["2"] }],
    hapusOperasional: true,
  };

  it("memetakan user, penandatangan, dan customer yang digabung", () => {
    const r = susunRencana(lama, k);
    expect(r.baris.customers.map((x) => x.id)).toEqual(["1"]);
    expect(r.baris.customers[0].created_by).toBe("10");
    expect(r.baris.quotations[0]).toMatchObject({
      customer_id: "1",
      created_by: null,
      signatory_id: "baru:14",
    });
    expect(r.baris.invoices[0]).toMatchObject({
      customer_id: "1",
      created_by: "10",
      signatory_id: "3",
    });
    expect(r.penandatanganBaru).toEqual(["14"]); // "1" tidak dipakai dokumen mana pun
    expect(r.ringkasan).toMatchObject({
      customer: 1,
      customerDigabung: 1,
      totalInvoice: 1000.5,
      totalPayment: 400,
    });
  });

  it("menolak akun lama yang belum dicocokkan", () => {
    expect(() => susunRencana(lama, { ...k, user: { "408": "10" } })).toThrow(/#3/);
  });
});
