import { describe, expect, it } from "vitest";

import { hitungTotalDokumen } from "@/lib/uang";

import { isiPratinjau, type IsianPratinjau, type KopPratinjau } from "./pratinjau-dokumen";

const kop: KopPratinjau = {
  judul: "Quotation",
  nomor: null,
  perusahaan: { company_name: "PT Tiska", logo_path: null, bank_name: null, bank_account_number: null, bank_account_holder: null, bank_code: null, swift_code: null },
  ttd: { "": { nama: "Bawaan", tautan: null }, "3": { nama: "Bu Rita", tautan: "https://x/ttd.png" } },
};

const f: IsianPratinjau = {
  customer_id: "9",
  contact_person: " Pak Budi ",
  contact_phone: "",
  tanggal: "2026-10-19",
  tanggal_akhir: "2026-11-02",
  event_dates: [
    { kunci: "a", tanggal: "2026-11-10" },
    { kunci: "b", tanggal: "2026-11-09" },
    { kunci: "c", tanggal: "" },
  ],
  event_type: "Wedding",
  event_time: "",
  guest_count: "300",
  fnb_planner: "",
  venue: "Gedung A",
  order_type: "event",
  notes: "",
  service_charge_percent: "",
  service_charge_minimum: "",
  pb1_enabled: true,
  pb1_percent: "10",
  signatory_id: "",
  po_reference: "",
  show_payment_terms: false,
  payment_terms: "x",
  biaya_tambahan: [{ kunci: "t", label: "", amount: "" }],
  items: [
    {
      kunci: "1",
      item_name: "Buffet A",
      unit: "pax",
      day: "2",
      qty: "1",
      pax: "100",
      price: "50.000",
      is_compliment: false,
      children: [{ kunci: "1a", item_name: "Stall bakso", unit: "porsi", day: "", qty: "50", pax: "", price: "10000" }],
    },
    { kunci: "2", item_name: "Es buah", unit: "porsi", day: "1", qty: "20", pax: "", price: "8000", is_compliment: true, children: [] },
    { kunci: "3", item_name: "  ", unit: "", day: "1", qty: "1", pax: "", price: "", is_compliment: false, children: [] },
  ],
};

describe("pratinjau dokumen dari isian form", () => {
  it("baris, anak mengikuti hari induk, compliment nol, total = hitungTotalDokumen", () => {
    const total = hitungTotalDokumen({
      items: [
        { day: 2, qty: 1, pax: 100, price: 50000, charge_pb1: true, children: [{ day: 2, qty: 50, price: 10000 }] },
        { day: 1, qty: 20, price: 8000, is_compliment: true },
      ],
      pb1_enabled: true,
      pb1_percent: 10,
    });
    const isi = isiPratinjau(f, total, kop, [{ id: "9", nama: "CV Maju", alamat: "Bogor" }]);

    expect(isi.baris.map((b) => [b.item_name, b.subtotal, b.anak.map((a) => [a.day, a.subtotal])])).toEqual([
      ["Buffet A", "10000000", [["2", "1000000"]]],
      ["Es buah", "0", []],
    ]);
    expect(isi.grand_total).toBe(total.grand_total.toString());
    expect(isi.pelanggan).toEqual({ nama: "CV Maju", alamat: "Bogor" });
    expect(isi.kontak.nama).toBe("Pak Budi");
    expect(isi.acara.tanggal.map((t) => t.toISOString().slice(0, 10))).toEqual(["2026-11-09", "2026-11-10"]);
    expect(isi.nomor).toBe("(dibuat saat disimpan)");
    expect(isi.biaya_tambahan).toEqual([]);
    expect(isi.syarat).toBeNull();
    expect(isi.perusahaan.signature_name).toBe("Bawaan");
  });

  it("penandatangan dipilih → tanda tangannya; invoice → label & PO", () => {
    const isi = isiPratinjau(
      { ...f, signatory_id: "3", po_reference: "PO-77" },
      hitungTotalDokumen({ items: [] }),
      { ...kop, judul: "Invoice", nomor: "INV/TC/2610/004" },
      [],
    );
    expect([isi.perusahaan.signature_name, isi.perusahaan.signature_url]).toEqual(["Bu Rita", "https://x/ttd.png"]);
    expect([isi.labelNomor, isi.nomor, isi.labelTanggalKedua, isi.referensiPo]).toEqual(["No. Invoice", "INV/TC/2610/004", "Jatuh Tempo", "PO-77"]);
    expect(isi.pelanggan.nama).toBe("(customer belum dipilih)");
  });
});
