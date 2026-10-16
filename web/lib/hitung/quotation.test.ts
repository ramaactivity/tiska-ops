import { describe, expect, it } from "vitest";

import { BAWAAN } from "../pengaturan-bisnis";
import { hitungTotalDokumen } from "../uang";
import { aturanLayanan, deliveryFeeBawaan, partnerFee, usulanPembulatan } from "./quotation";

/* Angka acuan dari dokumen ASLI (02-ATURAN-BISNIS §13, data/*.txt). */

describe("PDGI rev2 — buffet + stall, Sentul (Bogor), dibulatkan nett", () => {
  const layanan = aturanLayanan(BAWAAN, "bogor")!;
  const items = [
    { qty: 1, pax: 60, price: 88500 }, // I Dinner buffet PR-24 60 pax
    { qty: 1, pax: 1, price: 3500000 }, // II Stall lontong + kambing guling 1 ekor
    { qty: 1, pax: 20, price: 17500 }, // III coffee
    { qty: 1, pax: 15, price: 17500 }, // III tea
    { qty: 1, pax: 1, price: 550000 }, // III bubur kendil 1 paket
    { qty: 1, pax: 40, price: 48500 }, // IV Lunch buffet BS-15 40 pax
  ];
  const awal = hitungTotalDokumen({
    items,
    pb1_enabled: true,
    pb1_percent: BAWAAN.pbjt_pct,
    service_charge_percent: layanan.pct,
    service_charge_minimum: layanan.min,
  });

  it("subtotal 11.912.500 · PBJT 1.191.250 · layanan 15% 1.786.875 · total 14.890.625", () => {
    expect(awal.subtotal.toFixed(0)).toBe("11912500");
    expect(awal.pb1_amount.toFixed(0)).toBe("1191250");
    expect(awal.service_charge_amount.toFixed(0)).toBe("1786875");
    expect(awal.grand_total.toFixed(0)).toBe("14890625");
  });

  it("pembulatan −90.625 tampil sebagai baris → nett 14.800.000", () => {
    const pembulatan = usulanPembulatan(awal.grand_total);
    expect(pembulatan.toFixed(0)).toBe("-90625");
    const akhir = hitungTotalDokumen({
      items,
      pb1_enabled: true,
      pb1_percent: 10,
      service_charge_percent: layanan.pct,
      service_charge_minimum: layanan.min,
      pembulatan_amount: pembulatan,
    });
    expect(akhir.rounding_amount.toFixed(0)).toBe("-90625");
    expect(akhir.nett_total.toFixed(0)).toBe("14800000");
  });
});

describe("CIFOR — workshop 4 hari, layanan flat 4 × 1.800.000", () => {
  it("subtotal 44.955.000 · PBJT 4.495.500 · layanan 7.200.000 · total 56.650.500", () => {
    const h = hitungTotalDokumen({
      items: [{ qty: 1, price: 44955000 }],
      pb1_enabled: true,
      pb1_percent: 10,
      service_charge_flat: 4 * 1800000,
      // Persen & minimum diabaikan bila flat diisi.
      service_charge_percent: 15,
      service_charge_minimum: 1500000,
    });
    expect(h.pb1_amount.toFixed(0)).toBe("4495500");
    expect(h.service_charge_amount.toFixed(0)).toBe("7200000");
    expect(h.grand_total.toFixed(0)).toBe("56650500");
  });
});

describe("DIVAS — box saja di Bogor, PBJT dimatikan (klien nego, D-022)", () => {
  it("2.925.000 + delivery 50.000 = 2.975.000; tanpa layanan, tanpa minimum", () => {
    const layanan = aturanLayanan(BAWAAN, "bogor")!;
    const h = hitungTotalDokumen({
      items: [
        { qty: 1, pax: 25, price: 68500, charge_service: false },
        { qty: 1, pax: 25, price: 48500, charge_service: false },
      ],
      pb1_enabled: false,
      pb1_percent: 10,
      service_charge_percent: layanan.pct,
      service_charge_minimum: layanan.min,
      delivery_amount: deliveryFeeBawaan(BAWAAN, "bogor", { kloter: 1 })!,
    });
    expect(h.service_charge_amount.toFixed(0)).toBe("0");
    expect(h.pb1_amount.toFixed(0)).toBe("0");
    expect(h.grand_total.toFixed(0)).toBe("2975000");
  });
});

describe("SEELINDO — box + stall di Tangerang, layanan 20% hanya dari stall", () => {
  it("PBJT 5.235.600 · layanan 7.710.000 · total 65.301.600; tanpa delivery karena ada layanan", () => {
    const h = hitungTotalDokumen({
      items: [
        { qty: 1, pax: 236, price: 58500, charge_service: false }, // PR-01 box — bukan dasar layanan
        { qty: 1, pax: 150, price: 45000 }, // Sate Ponorogo
        { qty: 1, pax: 3, price: 3500000 }, // Kambing guling 3 ekor
        { qty: 1, pax: 150, price: 55000 }, // Laksa
        { qty: 1, pax: 150, price: 59500 }, // Nasi Bebek Hainan
        { qty: 1, pax: 150, price: 27500 }, // Rujak Ice Cream
      ],
      pb1_enabled: true,
      pb1_percent: 10,
      service_charge_percent: 20, // invoice memakai 20% (tabel Jabodetabek 21%, #9a)
      service_charge_minimum: 2500000,
      delivery_amount: deliveryFeeBawaan(BAWAAN, "jabodetabek", { adaLayanan: true })!,
    });
    expect(h.dasar_service_charge.toFixed(0)).toBe("38550000");
    expect(h.pb1_amount.toFixed(0)).toBe("5235600");
    expect(h.service_charge_amount.toFixed(0)).toBe("7710000");
    expect(h.delivery_amount.toFixed(0)).toBe("0");
    expect(h.grand_total.toFixed(0)).toBe("65301600");
  });
});

describe("aturan dari Angka Bisnis", () => {
  it("minimum layanan dipakai bila persen × dasar lebih kecil", () => {
    const h = hitungTotalDokumen({ items: [{ qty: 1, price: 5000000 }], service_charge_percent: 15, service_charge_minimum: 1500000 });
    expect(h.service_charge_amount.toFixed(0)).toBe("1500000");
  });

  it("sewa alat kena PPN 11%, bukan PBJT maupun layanan", () => {
    const h = hitungTotalDokumen({
      items: [
        { qty: 1, price: 1000000 },
        { qty: 4, price: 250000, charge_pb1: false, charge_service: false, charge_ppn: true }, // 4 chafing dish
      ],
      pb1_enabled: true,
      pb1_percent: 10,
      ppn_percent: BAWAAN.ppn_pct,
    });
    expect(h.pb1_amount.toFixed(0)).toBe("100000");
    expect(h.ppn_amount.toFixed(0)).toBe("110000");
    expect(h.grand_total.toFixed(0)).toBe("2210000");
  });

  it("delivery box per kloter; set menu & luar Jabodetabek", () => {
    expect(deliveryFeeBawaan(BAWAAN, "jabodetabek", { kloter: 2 })?.toFixed(0)).toBe("500000");
    expect(deliveryFeeBawaan(BAWAAN, "luar")).toBeNull();
    expect(aturanLayanan(BAWAAN, "jabodetabek", true)).toEqual({ pct: 25, min: 2500000 });
  });

  it("Partner Fee 3,5% dari nilai makanan PDGI = 416.938", () => {
    expect(partnerFee(11912500, BAWAAN.partner_fee_pct).toFixed(0)).toBe("416938");
  });
});
