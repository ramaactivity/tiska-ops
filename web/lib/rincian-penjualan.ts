import { Decimal } from "decimal.js";

import { d, type NilaiUang, subtotalBaris } from "./uang";

/* ==========================================================================
   RINCIAN PENJUALAN PER BARIS MENU (permintaan Mas Reza, 20 Nov 2026)

   Bentuknya meniru lembar kerja Mas Reza sendiri ("Draft penjualan buat
   Reza.xlsx"): satu baris per menu, lalu layanan, delivery, dan biaya
   tambahan sebagai baris tersendiri. Diskon, PBJT, PPN, catatan, dan total
   ditulis SEKALI per invoice, di baris pertamanya — sama seperti di lembar
   Mas Reza — supaya jumlah kolomnya tidak pernah menghitung dua kali.

   Per invoice selalu berlaku:

     Σ DPP − Diskon + PBJT + PPN = total invoice

   Itu yang dikunci tesnya. Diskon adalah biaya tambahan bernilai MINUS
   (diskon & pembulatan ditulis di sana, lib/dokumen.ts); biaya tambahan
   bernilai plus menjadi baris DPP sendiri dengan namanya.

   Kolom Jenis dan Pajak dipakai untuk menyaring & mengelompokkan: makanan
   vs sewa alat vs layanan vs delivery, dan baris mana yang menjadi dasar
   PBJT — itulah yang dibutuhkan untuk memisahkan pencatatan pajak.
   ========================================================================== */

export const JENIS = ["Makanan & minuman", "Sewa alat", "Layanan", "Delivery Fee", "Biaya tambahan"] as const;
export type Jenis = (typeof JENIS)[number];

type ItemRincian = {
  nama: string;
  qty: NilaiUang;
  pax?: NilaiUang | null;
  day?: NilaiUang;
  price: NilaiUang;
  isCompliment: boolean;
  chargePb1: boolean;
  chargePpn: boolean;
  /** 'alat' = baris Sewa alat (D-209); selain itu menu. */
  kind: string | null;
  sessionDate: Date | null;
  anak: Omit<ItemRincian, "anak">[];
};

export type InvoiceRincian = {
  nomor: string;
  tanggal: Date;
  tanggalAcara: Date[];
  pelanggan: string;
  catatan: string | null;
  pb1Enabled: boolean;
  pb1: NilaiUang;
  ppn: NilaiUang;
  serviceCharge: NilaiUang;
  serviceLabel: string | null;
  delivery: NilaiUang;
  total: NilaiUang;
  items: ItemRincian[];
  biaya: { label: string; amount: NilaiUang }[];
};

export type BarisRincian = {
  nomor: string;
  tanggal: Date;
  /** Tanggal acara / kirim pesanan: tanggal sesi baris itu, atau hari pertama acara. */
  tanggalPesanan: Date | null;
  pelanggan: string;
  uraian: string;
  dpp: Decimal;
  diskon: Decimal;
  pbjt: Decimal;
  ppn: Decimal;
  catatan: string;
  jenis: Jenis;
  /** Baris ini dasar pungutan apa: PBJT, PPN, atau tidak keduanya. */
  pajak: "PBJT" | "PPN" | "";
  /** Total invoice, hanya di baris pertamanya. */
  total: Decimal | null;
};

const angka = (n: Decimal) => n.toNumber().toLocaleString("id-ID");

/** "Nasi Box (85 x 48.500)", "Tumpeng Kerucut" bila semuanya satu — gaya lembar Mas Reza. */
function uraianItem(nama: string, it: Omit<ItemRincian, "anak">): string {
  const pengali = [d(it.day), d(it.qty), d(it.pax)].filter((n) => !n.isZero() && !n.eq(1));
  const keterangan = it.isCompliment ? " (compliment)" : "";
  if (pengali.length === 0) return `${nama}${keterangan}`;
  return `${nama} (${[...pengali, d(it.price)].map(angka).join(" x ")})${keterangan}`;
}

export function rincianInvoice(inv: InvoiceRincian): BarisRincian[] {
  const hariPertama = inv.tanggalAcara[0] ?? null;
  const baris: BarisRincian[] = [];

  const tambah = (b: Pick<BarisRincian, "uraian" | "dpp" | "jenis" | "pajak"> & { tanggalPesanan?: Date | null }) =>
    baris.push({
      nomor: inv.nomor,
      tanggal: inv.tanggal,
      tanggalPesanan: b.tanggalPesanan ?? hariPertama,
      pelanggan: inv.pelanggan,
      uraian: b.uraian,
      dpp: b.dpp,
      diskon: new Decimal(0),
      pbjt: new Decimal(0),
      ppn: new Decimal(0),
      catatan: "",
      jenis: b.jenis,
      pajak: b.pajak,
      total: null,
    });

  const barisItem = (nama: string, it: Omit<ItemRincian, "anak">) => {
    const alat = it.kind === "alat";
    tambah({
      uraian: uraianItem(nama, it),
      dpp: subtotalBaris({ day: it.day, qty: it.qty, pax: it.pax, price: it.price, is_compliment: it.isCompliment }),
      jenis: alat ? "Sewa alat" : "Makanan & minuman",
      pajak: it.isCompliment ? "" : it.chargePpn ? "PPN" : inv.pb1Enabled && it.chargePb1 ? "PBJT" : "",
      tanggalPesanan: it.sessionDate,
    });
  };

  for (const induk of inv.items) {
    // Judul kelompok ("GUBUKAN/ STALL") bernilai nol — namanya menjadi awalan
    // anak-anaknya, bukan baris sendiri. Isi paket (anak tanpa harga) adalah
    // rincian isi, bukan penjualan, jadi tidak ditulis.
    const indukBerharga = d(induk.qty).times(d(induk.price)).gt(0);
    if (indukBerharga) barisItem(induk.nama, induk);

    for (const a of induk.anak) {
      if (!d(a.qty).times(d(a.price)).gt(0)) continue;
      // Anak mewarisi penanda induknya, sama dengan ratakanBaris() di lib/uang.
      barisItem(`${induk.nama} - ${a.nama}`, {
        ...a,
        isCompliment: a.isCompliment || induk.isCompliment,
        day: d(a.day).isZero() ? induk.day : a.day,
        sessionDate: a.sessionDate ?? induk.sessionDate,
      });
    }
  }

  if (d(inv.serviceCharge).gt(0)) {
    tambah({ uraian: inv.serviceLabel?.trim() || "Layanan", dpp: d(inv.serviceCharge), jenis: "Layanan", pajak: "" });
  }
  if (d(inv.delivery).gt(0)) {
    tambah({ uraian: "Delivery Fee", dpp: d(inv.delivery), jenis: "Delivery Fee", pajak: "" });
  }

  let diskon = new Decimal(0);
  for (const b of inv.biaya) {
    const n = d(b.amount);
    if (n.lt(0)) diskon = diskon.plus(n.abs());
    else if (n.gt(0)) tambah({ uraian: b.label, dpp: n, jenis: "Biaya tambahan", pajak: "" });
  }

  // Invoice tanpa baris berharga tetap butuh satu baris untuk membawa pajak & totalnya.
  if (baris.length === 0) {
    tambah({ uraian: "(tanpa rincian menu)", dpp: new Decimal(0), jenis: "Makanan & minuman", pajak: "" });
  }

  const pertama = baris[0];
  pertama.diskon = diskon;
  pertama.pbjt = d(inv.pb1);
  pertama.ppn = d(inv.ppn);
  pertama.catatan = inv.catatan?.trim() ?? "";
  pertama.total = d(inv.total);

  return baris;
}

/** Σ DPP − Diskon + PBJT + PPN − total, per invoice. Harus nol; dicetak di Excel bila tidak. */
export function selisihRincian(baris: BarisRincian[]): Decimal {
  return baris.reduce(
    (j, b) => j.plus(b.dpp).minus(b.diskon).plus(b.pbjt).plus(b.ppn).minus(b.total ?? 0),
    new Decimal(0),
  );
}

export type Ringkasan = {
  kunci: string;
  invoice: number;
  perJenis: Record<Jenis, Decimal>;
  diskon: Decimal;
  dasarPbjt: Decimal;
  pbjt: Decimal;
  ppn: Decimal;
  total: Decimal;
};

/**
 * Mengelompokkan baris rincian per pelanggan, per bulan, atau kunci lain.
 * Untuk tiap kelompok: Σ jenis − diskon + PBJT + PPN = total.
 */
export function ringkasPer(baris: BarisRincian[], kunci: (b: BarisRincian) => string): Ringkasan[] {
  const peta = new Map<string, Ringkasan & { nomor: Set<string> }>();
  for (const b of baris) {
    const k = kunci(b);
    let r = peta.get(k);
    if (!r) {
      r = {
        kunci: k,
        invoice: 0,
        nomor: new Set(),
        perJenis: Object.fromEntries(JENIS.map((j) => [j, new Decimal(0)])) as Record<Jenis, Decimal>,
        diskon: new Decimal(0),
        dasarPbjt: new Decimal(0),
        pbjt: new Decimal(0),
        ppn: new Decimal(0),
        total: new Decimal(0),
      };
      peta.set(k, r);
    }
    r.nomor.add(b.nomor);
    r.perJenis[b.jenis] = r.perJenis[b.jenis].plus(b.dpp);
    if (b.pajak === "PBJT") r.dasarPbjt = r.dasarPbjt.plus(b.dpp);
    r.diskon = r.diskon.plus(b.diskon);
    r.pbjt = r.pbjt.plus(b.pbjt);
    r.ppn = r.ppn.plus(b.ppn);
    r.total = r.total.plus(b.total ?? 0);
  }
  return [...peta.values()].map(({ nomor, ...r }) => ({ ...r, invoice: nomor.size }));
}
