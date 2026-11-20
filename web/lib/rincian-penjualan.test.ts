import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buatBukuPenjualan } from "./excel-penjualan";
import { type InvoiceRincian, rincianInvoice, ringkasPer, selisihRincian } from "./rincian-penjualan";
import { hitungTotalDokumen } from "./uang";

const tgl = (s: string) => new Date(`${s}T00:00:00Z`);

const menu = (nama: string, qty: number, price: number, lain: Partial<InvoiceRincian["items"][number]> = {}) => ({
  nama,
  qty: String(qty),
  pax: null,
  day: "1",
  price: String(price),
  isCompliment: false,
  chargePb1: true,
  chargePpn: false,
  kind: null,
  sessionDate: null,
  anak: [],
  ...lain,
});

/** Invoice yang memuat semua bentuk baris; totalnya dari rumus invoice aplikasi (satu sumber). */
function invoiceLengkap(pb1Enabled = true): InvoiceRincian {
  const items = [
    // Paket berharga + isi paket tanpa harga → satu baris.
    menu("Indonesian Buffet", 150, 115_000, { anak: [menu("Nasi Putih", 0, 0), menu("Ayam Bakar", 0, 0)] }),
    // Judul kelompok bernilai nol + anak berharga → anak saja, berawalan nama kelompok.
    menu("GUBUKAN/ STALL", 1, 0, { anak: [menu("Bakwan Malang", 75, 39_500)] }),
    // Hari × pax.
    menu("Lunch Box", 1, 48_500, { day: "3", pax: 130 }),
    menu("Tumpeng Mini", 1, 50_000, { isCompliment: true }),
    menu("Kursi Tiffany", 50, 25_000, { kind: "alat", chargePb1: false, chargePpn: true }),
  ];
  const biaya = [
    { label: "Tim servis tambahan", amount: "350000" },
    { label: "Diskon", amount: "-25000" },
    { label: "Pembulatan", amount: "-375" },
  ];
  const hasil = hitungTotalDokumen({
    items: items.map((i) => ({
      qty: i.qty,
      pax: i.pax,
      day: i.day,
      price: i.price,
      is_compliment: i.isCompliment,
      charge_pb1: i.chargePb1,
      charge_ppn: i.chargePpn,
      charge_service: !i.chargePpn,
      children: i.anak.map((a) => ({ qty: a.qty, price: a.price, pax: a.pax, day: a.day })),
    })),
    service_charge_percent: 15,
    pb1_enabled: pb1Enabled,
    pb1_percent: 10,
    ppn_percent: 11,
    delivery_amount: 250_000,
    biaya_tambahan: biaya,
  });
  return {
    nomor: "INV/TC/2611/001",
    tanggal: tgl("2026-11-02"),
    tanggalAcara: [tgl("2026-11-10"), tgl("2026-11-11")],
    pelanggan: "Ibu Evi",
    catatan: "PO 123\nbayar transfer",
    pb1Enabled,
    pb1: hasil.pb1_amount.toString(),
    ppn: hasil.ppn_amount.toString(),
    serviceCharge: hasil.service_charge_amount.toString(),
    serviceLabel: null,
    delivery: "250000",
    total: hasil.nett_total.toString(),
    items,
    biaya,
  };
}

describe("rincian penjualan per menu (format Mas Reza)", () => {
  it("satu baris per menu berharga, lalu layanan, delivery fee, biaya tambahan", () => {
    const b = rincianInvoice(invoiceLengkap());
    expect(b.map((x) => x.uraian)).toEqual([
      "Indonesian Buffet (150 x 115.000)",
      "GUBUKAN/ STALL - Bakwan Malang (75 x 39.500)",
      "Lunch Box (3 x 130 x 48.500)",
      "Tumpeng Mini (compliment)",
      "Kursi Tiffany (50 x 25.000)",
      "Layanan",
      "Delivery Fee",
      "Tim servis tambahan",
    ]);
    expect(b.map((x) => x.jenis)).toEqual([
      "Makanan & minuman",
      "Makanan & minuman",
      "Makanan & minuman",
      "Makanan & minuman",
      "Sewa alat",
      "Layanan",
      "Delivery Fee",
      "Biaya tambahan",
    ]);
    expect(b.map((x) => x.pajak)).toEqual(["PBJT", "PBJT", "PBJT", "", "PPN", "", "", ""]);
    expect(b[2].dpp.toNumber()).toBe(3 * 130 * 48_500);
    expect(b[3].dpp.toNumber()).toBe(0);
  });

  it("diskon, PBJT, PPN, catatan & total hanya di baris pertama invoice", () => {
    const b = rincianInvoice(invoiceLengkap());
    expect(b[0].diskon.toNumber()).toBe(25_375);
    expect(b[0].pbjt.toNumber()).toBeGreaterThan(0);
    expect(b[0].ppn.toNumber()).toBe(137_500);
    expect(b[0].catatan).toBe("PO 123\nbayar transfer");
    expect(b[0].total).not.toBeNull();
    for (const x of b.slice(1)) {
      expect([x.diskon.toNumber(), x.pbjt.toNumber(), x.ppn.toNumber(), x.catatan, x.total]).toEqual([0, 0, 0, "", null]);
    }
  });

  it("Σ DPP − Diskon + PBJT + PPN tepat sama dengan total invoice", () => {
    expect(selisihRincian(rincianInvoice(invoiceLengkap())).toNumber()).toBe(0);
    expect(selisihRincian(rincianInvoice(invoiceLengkap(false))).toNumber()).toBe(0);
  });

  it("dasar PBJT = baris kena PBJT; tanpa PBJT di invoice tidak ada yang ditandai", () => {
    const b = rincianInvoice(invoiceLengkap());
    const dasar = b.filter((x) => x.pajak === "PBJT").reduce((j, x) => j + x.dpp.toNumber(), 0);
    expect(b[0].pbjt.toNumber()).toBe(Math.round(dasar * 0.1));
    expect(rincianInvoice(invoiceLengkap(false)).some((x) => x.pajak === "PBJT")).toBe(false);
  });

  it("tanggal pesanan = hari pertama acara, atau tanggal sesi barisnya", () => {
    const inv = invoiceLengkap();
    inv.items[0].sessionDate = tgl("2026-11-11");
    const b = rincianInvoice(inv);
    expect(b[0].tanggalPesanan).toEqual(tgl("2026-11-11"));
    expect(b[1].tanggalPesanan).toEqual(tgl("2026-11-10"));
  });

  it("invoice tanpa baris berharga tetap punya satu baris pembawa total", () => {
    const b = rincianInvoice({ ...invoiceLengkap(), items: [], biaya: [], serviceCharge: "0", delivery: "0", pb1: "0", ppn: "0", total: "0" });
    expect(b).toHaveLength(1);
    expect(b[0].total?.toNumber()).toBe(0);
  });

  it("berkas Excel: lembar rincian di depan, tiap baris utuh, total SUBTOTAL benar", async () => {
    const satu = invoiceLengkap();
    const dua = { ...invoiceLengkap(false), nomor: "INV/TC/2611/002", pelanggan: "Bapak Henry", tanggal: tgl("2026-10-05") };
    const buku = await buatBukuPenjualan({
      baris: [],
      rincian: [satu, dua],
      periode: "uji",
      perusahaan: { nama: "PT Uji", logo: null },
      dicetakOleh: "uji",
    });
    const dibaca = new ExcelJS.Workbook();
    await dibaca.xlsx.load((await buku.xlsx.writeBuffer()) as ArrayBuffer);
    expect(dibaca.worksheets.map((w) => w.name).slice(0, 3)).toEqual(["Rincian penjualan", "Per pelanggan", "Per bulan"]);

    const r = dibaca.getWorksheet("Rincian penjualan")!;
    expect(r.getCell("A6").value).toBe("No. Faktur / Order");
    expect(r.getCell("J6").value).toBe("Catatan");
    const harap = [satu, dua].flatMap(rincianInvoice);
    // Baris data mulai tepat di bawah kepala dan tidak ada yang hilang/tertimpa.
    harap.forEach((b, i) => expect(r.getCell(`E${7 + i}`).value).toBe(b.uraian));
    expect(r.getCell(`E${7 + harap.length}`).value ?? null).toBeNull();
    const total = r.getCell("M5").value as { formula: string; result: number };
    expect(total.formula).toBe(`SUBTOTAL(9,M7:M${6 + harap.length})`);
    expect(total.result).toBe(Number(satu.total) + Number(dua.total));

    const b = dibaca.getWorksheet("Per bulan")!;
    expect([b.getCell("A7").value, b.getCell("A8").value]).toEqual(["Oktober 2026", "November 2026"]);
    const p = dibaca.getWorksheet("Per pelanggan")!;
    expect([p.getCell("A7").value, p.getCell("A8").value].sort()).toEqual(["Bapak Henry", "Ibu Evi"]);
  });

  it("ringkasan per pelanggan: jenis − diskon + PBJT + PPN = total", () => {
    const satu = invoiceLengkap();
    const dua = { ...invoiceLengkap(false), nomor: "INV/TC/2611/002" };
    const tiga = { ...invoiceLengkap(), nomor: "INV/TC/2611/003", pelanggan: "Bapak Henry" };
    const r = ringkasPer([satu, dua, tiga].flatMap(rincianInvoice), (b) => b.pelanggan);
    const evi = r.find((x) => x.kunci === "Ibu Evi")!;
    expect(evi.invoice).toBe(2);
    expect(r.find((x) => x.kunci === "Bapak Henry")!.invoice).toBe(1);
    for (const x of r) {
      const jenis = Object.values(x.perJenis).reduce((j, n) => j.plus(n), x.diskon.negated());
      expect(jenis.plus(x.pbjt).plus(x.ppn).minus(x.total).toNumber()).toBe(0);
    }
  });
});
