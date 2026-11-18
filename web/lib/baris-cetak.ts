import { ISTILAH, labelLayanan, labelPajak, labelPpn } from "./istilah";
import { nilaiCompliment, nilaiKelompok, perluTotalKelompok, romawi, rupiah } from "./uang";

/* ==========================================================================
   SUSUNAN BARIS DOKUMEN CETAK

   Dipakai DUA kali: tabel di halaman cetak, dan berkas Excel yang diunduh
   dari dokumen yang sama. Keduanya harus menghasilkan baris yang persis
   sama — kalau tidak, customer memegang kertas dan berkas yang menyebut
   angka berbeda untuk satu pesanan, dan tidak ada yang akan menyadarinya
   sampai salah satunya dipakai menagih.

   Aturan-aturan di bawah ini yang menyimpan seluruh keputusannya. Semuanya
   pernah salah sekali, dan tidak satu pun menimbulkan galat:

   1. BARIS JUDUL ditentukan oleh ANGKANYA SENDIRI (qty x harga = 0), bukan
      oleh ada tidaknya sub-item berharga. "LUNCH BUFFET 35 pax" yang punya
      tambahan "VEGETARIAN 2 pax" tetap menagih 35 porsinya sendiri. Aturan
      yang menilainya dari anaknya pernah membuang empat baris LUNCH BUFFET
      dan membuat subtotalnya 17.830.000, padahal seharusnya 44.955.000.

   2. KOLOM ANGKA PADA BARIS JUDUL DIKOSONGKAN, bukan diisi nol. Nol terbaca
      sebagai harga, dan pembacanya akan mencari-cari apa yang berharga nol.

   3. SUB-ITEM BERHARGA mendapat barisnya sendiri (I.1, I.2); yang tidak
      berharga menumpang di kolom deskripsi induknya sebagai rincian isi
      paket. Keduanya dipakai di dokumen katering yang sama.

   4. TOTAL KELOMPOK hanya memuat baris kelompok itu. Service charge, PB1,
      delivery, dan biaya tambahan dihitung sekali di blok bawah — dengan
      begitu Sub Total selalu sama persis dengan jumlah seluruh total
      kelompok, tanpa perlu mencocokkan pembulatan di dua tempat.
   ========================================================================== */

export type ItemCetak = {
  id: string;
  item_name: string;
  unit: string | null;
  day: string;
  qty: string;
  /** Berapa orang yang dilayani. Null berarti tidak diisi. */
  pax: number | null;
  price: string;
  subtotal: string;
  is_compliment: boolean;
  /** Label sesi baris (D-041), mis. "Sel, 20 Okt 2026 · Lunch · 11.00". */
  sesi?: string;
  anak: {
    id: string;
    item_name: string;
    unit: string | null;
    day: string;
    qty: string;
    pax: number | null;
    price: string;
    subtotal: string;
  }[];
};

/** Satu baris pada tabel rincian, sudah siap digambar maupun ditulis. */
export type BarisTabel =
  | {
      jenis: "item";
      kunci: string;
      nomor: string;
      nama: string;
      /** Label sesi (D-041); kosong bila tidak ada. */
      sesi: string;
      /**
       * Isi paket yang tidak berharga, ditulis di bawah nama induknya.
       *
       * Jumlah dan pax-nya ikut digambar di SEMUA dokumen — kertas
       * customer, lembar dapur, maupun berkas Excel (aplikasi lama 310cf82,
       * D-106). Angka itu diketik orang; dokumen yang membuangnya membuat
       * pembacanya mengira isinya tidak dibatasi.
       */
      rincian: {
        nama: string;
        qty: string;
        satuan: string;
        pax: string;
        /** "90 pax · 2 pax" — jumlah dan pax yang diketik, sudah dirangkai. */
        keterangan: string;
      }[];
      /** Kosong berarti baris judul: kolomnya memang dikosongkan. */
      hari: string;
      qty: string;
      /**
       * Berapa orang yang dilayani, untuk lembar dapur.
       *
       * Kosong berarti TIDAK DIISI, bukan nol orang. Nol di lembar dapur
       * terbaca sebagai perintah untuk tidak memasaknya.
       */
      pax: string;
      /** Angka mentahnya, untuk berkas Excel. */
      paxAngka: number | null;
      satuan: string;
      harga: string;
      nilai: string;
      /**
       * Angka mentahnya, untuk berkas Excel. Null berarti selnya memang
       * dikosongkan — baris judul, atau item compliment.
       *
       * Keputusan "sel ini kosong" tetap diambil SEKALI di sini. Yang
       * berbeda antara kertas dan Excel hanya cara menuliskannya: kertas
       * memakai "Rp 1.520.000", Excel memakai angka yang bisa dijumlah.
       */
      hariAngka: number | null;
      qtyAngka: number | null;
      hargaAngka: number | null;
      nilaiAngka: number | null;
      /** Baris judul kelompok, yang tidak menagih apa pun. */
      judul: boolean;
      /** Sub-item berharga, digambar menjorok. */
      menjorok: boolean;
    }
  | {
      jenis: "totalKelompok";
      kunci: string;
      label: string;
      nilai: string;
      nilaiAngka: number;
    };

export type BarisTotal = {
  kunci: string;
  label: string;
  nilai: string;
  nilaiAngka: number;
  /** Baris TOTAL paling bawah. */
  akhir: boolean;
};

const angka = (nilai: string) => Number(nilai).toLocaleString("id-ID");

/**
 * Pax: banyaknya pesanan pada satu baris — 236 box, 150 porsi, 3 ekor.
 *
 * Nilai barisnya HARI x QTY x PAX x HARGA SATUAN, jadi pax yang kosong
 * dicetak sebagai 1, bukan dikosongkan: perkaliannya harus bisa ditelusuri
 * sendiri oleh yang membaca dokumennya. Baris yang kosong di situ membuat
 * pembacanya mengira ada pengali yang disembunyikan.
 *
 * Aturannya sama persis dengan paksBaris di lib/uang.ts — kosong atau nol
 * berarti satu.
 */
function paxBaris(pax: number | null): string {
  return angka(String(paxAngkaBaris(pax)));
}

/**
 * Pengali pax sebagai angka, untuk berkas Excel.
 *
 * Dihitung langsung dari nilainya, bukan dengan membaca balik teks yang
 * sudah diberi pemisah ribuan: "1.200" yang dibaca sebagai angka akan
 * menjadi 1,2 — dan itu mengalikan nilai baris dengan satu koma dua.
 */
function paxAngkaBaris(pax: number | null): number {
  return pax === null || pax === 0 ? 1 : pax;
}

/**
 * Keterangan jumlah pada satu isi paket: "90 pax", "300 porsi · 2 pax".
 * Isi paket tidak berharga, jadi angkanya KETERANGAN, bukan pengali. Pax
 * kosong TIDAK dijadikan 1 (berbeda dengan baris berharga): "· 1 pax" pada
 * setiap isi paket hanya angka yang tidak pernah diketik siapa pun.
 */
export function keteranganRincian(qty: string, satuan: string, pax: string): string {
  const bagian: string[] = [];
  if (qty) bagian.push(satuan ? `${qty} ${satuan}` : qty);
  if (pax) bagian.push(`${pax} pax`);
  return bagian.join(" · ");
}

/** Nilai compliment satu dokumen (D-197) — keterangan "senilai Rp …", tidak ditagihkan. Rumusnya di lib/uang. */
export function nilaiComplimentDokumen(daftar: ItemCetak[]) {
  return nilaiCompliment(
    daftar.map((b) => ({
      day: b.day,
      qty: b.qty,
      pax: b.pax,
      price: b.price,
      is_compliment: b.is_compliment,
      // Tanpa penanda sendiri: anak mewarisi compliment induknya.
      children: b.anak.map((a) => ({ day: a.day, qty: a.qty, pax: a.pax, price: a.price })),
    })),
  );
}

/** Baris tabel rincian, berurutan dari atas ke bawah. */
export function barisTabelDokumen(daftar: ItemCetak[]): BarisTabel[] {
  const hasil: BarisTabel[] = [];

  daftar.forEach((b, i) => {
    const nomorInduk = romawi(i + 1);
    const anakBerharga = b.anak.filter((a) => Number(a.subtotal) > 0);
    const anakRincian = b.anak.filter((a) => Number(a.subtotal) <= 0);

    // Aturan 1: dinilai dari angkanya sendiri.
    const bernilai = Number(b.qty) * Number(b.price) > 0;
    // Compliment yang berdiri sendiri (tanpa isi) tetap menampilkan jumlahnya, dan harga satuannya bila ada —
    // pembaca melihat apa & berapa yang diberikan; totalnya tetap tertulis "Compliment" (D-197).
    const daun = b.is_compliment && b.anak.length === 0;
    const tampil = bernilai || daun;
    const hargaDaun = daun && Number(b.price) > 0;

    hasil.push({
      jenis: "item",
      kunci: b.id,
      nomor: nomorInduk,
      nama: b.item_name,
      sesi: b.sesi ?? "",
      rincian: anakRincian.map((a) => {
        const qty = Number(a.qty) > 0 ? angka(a.qty) : "";
        const satuan = a.unit ?? "";
        const pax = a.pax && a.pax > 0 ? angka(String(a.pax)) : "";
        return { nama: a.item_name, qty, satuan, pax, keterangan: keteranganRincian(qty, satuan, pax) };
      }),
      // Aturan 2: dikosongkan, bukan diisi nol.
      hari: tampil ? angka(b.day) : "",
      qty: tampil ? angka(b.qty) : "",
      // Dikosongkan pada baris judul bersama kolom angka yang lain: judul
      // kelompok tidak menagih apa pun, jadi tidak ada perkalian untuk
      // ditelusuri.
      pax: tampil ? paxBaris(b.pax) : "",
      paxAngka: tampil ? paxAngkaBaris(b.pax) : null,
      satuan: tampil ? (b.unit ?? "") : "",
      harga: daun ? (hargaDaun ? rupiah(b.price) : "") : b.is_compliment ? "Compliment" : bernilai ? rupiah(b.price) : "",
      nilai: b.is_compliment ? "Compliment" : bernilai ? rupiah(b.subtotal) : "",
      hariAngka: tampil ? Number(b.day) : null,
      qtyAngka: tampil ? Number(b.qty) : null,
      // Harga satuan compliment boleh ke Excel (tidak dijumlah); nilainya tidak, supaya tidak terbaca ditagihkan.
      hargaAngka: hargaDaun ? Number(b.price) : b.is_compliment || !bernilai ? null : Number(b.price),
      nilaiAngka: b.is_compliment || !bernilai ? null : Number(b.subtotal),
      judul: !tampil,
      menjorok: false,
    });

    // Aturan 3.
    anakBerharga.forEach((a, j) => {
      hasil.push({
        jenis: "item",
        kunci: a.id,
        nomor: `${nomorInduk}.${j + 1}`,
        nama: a.item_name,
        sesi: "",
        rincian: [],
        hari: angka(a.day),
        qty: angka(a.qty),
        pax: paxBaris(a.pax),
        paxAngka: paxAngkaBaris(a.pax),
        satuan: a.unit ?? "",
        harga: b.is_compliment ? "Compliment" : rupiah(a.price),
        nilai: b.is_compliment ? "Compliment" : rupiah(a.subtotal),
        hariAngka: Number(a.day),
        qtyAngka: Number(a.qty),
        hargaAngka: b.is_compliment ? null : Number(a.price),
        nilaiAngka: b.is_compliment ? null : Number(a.subtotal),
        judul: false,
        menjorok: true,
      });
    });

    // Aturan 4.
    const kelompok = { subtotal: b.subtotal, anak: b.anak };
    if (perluTotalKelompok(kelompok)) {
      hasil.push({
        jenis: "totalKelompok",
        kunci: `total-${b.id}`,
        label: `Total - ${nomorInduk}`,
        nilai: rupiah(nilaiKelompok(kelompok)),
        nilaiAngka: Number(nilaiKelompok(kelompok)),
      });
    }
  });

  return hasil;
}

/**
 * Blok total di bawah tabel, berurutan.
 *
 * Delivery dan biaya tambahan sengaja ditaruh SESUDAH kedua pungutan,
 * supaya pembaca dokumen bisa menelusuri perhitungannya dari atas ke bawah
 * dan melihat sendiri bahwa ongkos kirim tidak ikut dipajaki.
 */
export function barisTotalDokumen(isi: {
  subtotal: string;
  service_charge_percent: string | null;
  service_charge_minimum?: string | null;
  service_charge_amount: string;
  pb1_enabled: boolean;
  pb1_percent: string | null;
  pb1_amount: string;
  /** PPN baris sewa alat (D-039); dokumen lama tidak punya. */
  ppn_percent?: string | null;
  ppn_amount?: string;
  delivery_amount: string;
  biaya_tambahan: { id: string; label: string; amount: string }[];
  grand_total: string;
}): BarisTotal[] {
  const hasil: BarisTotal[] = [
    {
      kunci: "subtotal",
      label: "Sub Total",
      nilai: rupiah(isi.subtotal),
      nilaiAngka: Number(isi.subtotal),
      akhir: false,
    },
  ];

  if (Number(isi.service_charge_amount) > 0) {
    hasil.push({
      kunci: "sc",
      label: labelLayanan(isi.service_charge_percent, isi.service_charge_minimum),
      nilai: rupiah(isi.service_charge_amount),
      nilaiAngka: Number(isi.service_charge_amount),
      akhir: false,
    });
  }

  if (isi.pb1_enabled && Number(isi.pb1_amount) > 0) {
    hasil.push({
      kunci: "pb1",
      label: labelPajak(isi.pb1_percent),
      nilai: rupiah(isi.pb1_amount),
      nilaiAngka: Number(isi.pb1_amount),
      akhir: false,
    });
  }

  if (Number(isi.ppn_amount ?? 0) > 0) {
    hasil.push({
      kunci: "ppn",
      label: labelPpn(isi.ppn_percent),
      nilai: rupiah(isi.ppn_amount ?? 0),
      nilaiAngka: Number(isi.ppn_amount),
      akhir: false,
    });
  }

  if (Number(isi.delivery_amount) > 0) {
    hasil.push({
      kunci: "delivery",
      label: ISTILAH.delivery,
      nilai: rupiah(isi.delivery_amount),
      nilaiAngka: Number(isi.delivery_amount),
      akhir: false,
    });
  }

  for (const b of isi.biaya_tambahan) {
    hasil.push({
      kunci: `bt-${b.id}`,
      label: b.label,
      nilai: rupiah(b.amount),
      nilaiAngka: Number(b.amount),
      akhir: false,
    });
  }

  hasil.push({
    kunci: "total",
    label: "TOTAL",
    nilai: rupiah(isi.grand_total),
    nilaiAngka: Number(isi.grand_total),
    akhir: true,
  });

  return hasil;
}
