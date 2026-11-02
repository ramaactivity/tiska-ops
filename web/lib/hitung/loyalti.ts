/* ==========================================================================
   PROGRAM LOYALTI (D-131) — murni. Kartu stempel per customer per program.

   1 stempel = 1 pesanan yang memenuhi syarat (Ikut Menu Pesta, aktif, LUNAS, nilai ≥ minimal, tanggal kirim
   ≥ program mulai). N stempel terkumpul dalam `jendelaHari` (dihitung dari stempel pertama siklus) → 1 hadiah,
   kartu kembali kosong. Stempel yang lewat jendela gugur satu per satu (jendela bergeser), jadi pelanggan tidak
   pernah "mulai dari nol" hanya karena stempel lamanya kedaluwarsa. Hadiah berlaku `berlakuHari` sejak didapat.

   Status dihitung ulang dari riwayat setiap kali (tidak ada penghitung yang bisa melenceng); yang disimpan hanya
   pemakaian hadiah, dengan kunci `<idProgram>:<idPesananPenutup>`.
   ========================================================================== */

export type AturanLoyalti = {
  id: string;
  /** Jumlah pesanan untuk 1 hadiah. */
  syarat: number;
  /** Nilai pesanan minimal agar dapat stempel (Rp); null = berapa pun. */
  minBelanja: number | null;
  /** Syarat harus terpenuhi dalam N hari sejak stempel pertama; null = tanpa batas. */
  jendelaHari: number | null;
  /** Hadiah bisa dipakai N hari sejak didapat; null = tanpa batas. */
  berlakuHari: number | null;
  /** Pesanan yang dikirim sebelum tanggal ini tidak dihitung. */
  mulai: string;
};

export type PesananLoyalti = { id: string; tanggal: string; nilai: number };

export type HadiahLoyalti = { kunci: string; didapat: string; hangus: string | null; status: "tersedia" | "dipakai" | "hangus"; idPesanan: string };

export type KartuLoyalti = {
  /** Stempel siklus berjalan. */
  stempel: number;
  syarat: number;
  /** Batas waktu siklus berjalan (tanggal terakhir stempel ke-N harus didapat); null bila tanpa batas / belum mulai. */
  batas: string | null;
  hadiah: HadiahLoyalti[];
};

const tambahHari = (t: string, n: number) => new Date(Date.parse(`${t}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function kartuLoyalti(aturan: AturanLoyalti, pesanan: PesananLoyalti[], dipakai: ReadonlySet<string>, hariIni: string): KartuLoyalti {
  const syarat = Math.max(1, aturan.syarat);
  const sah = pesanan
    .filter((p) => p.tanggal >= aturan.mulai && (aturan.minBelanja === null || p.nilai >= aturan.minBelanja))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id, undefined, { numeric: true }));
  const akhirJendela = (awal: string) => (aturan.jendelaHari ? tambahHari(awal, aturan.jendelaHari - 1) : null);

  let siklus: PesananLoyalti[] = [];
  const hadiah: HadiahLoyalti[] = [];
  for (const p of sah) {
    while (siklus.length && aturan.jendelaHari && p.tanggal > akhirJendela(siklus[0].tanggal)!) siklus.shift();
    siklus.push(p);
    if (siklus.length === syarat) {
      const kunci = `${aturan.id}:${p.id}`;
      const hangus = aturan.berlakuHari ? tambahHari(p.tanggal, aturan.berlakuHari) : null;
      hadiah.push({ kunci, didapat: p.tanggal, hangus, idPesanan: p.id, status: dipakai.has(kunci) ? "dipakai" : hangus && hangus < hariIni ? "hangus" : "tersedia" });
      siklus = [];
    }
  }
  while (siklus.length && aturan.jendelaHari && hariIni > akhirJendela(siklus[0].tanggal)!) siklus.shift();
  return { stempel: siklus.length, syarat, batas: siklus.length ? akhirJendela(siklus[0].tanggal) : null, hadiah };
}

const rp = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const tgl = (t: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/** "Pesan 5× (min. Rp 100.000/pesanan) dalam 90 hari → Free 1 box Paket A. Hadiah berlaku 30 hari." */
export function kalimatAturan(a: AturanLoyalti & { hadiah: string }): string {
  return [
    `Pesan ${a.syarat}×`,
    a.minBelanja ? ` (min. ${rp(a.minBelanja)}/pesanan)` : "",
    a.jendelaHari ? ` dalam ${a.jendelaHari} hari` : "",
    ` → ${a.hadiah}.`,
    a.berlakuHari ? ` Hadiah berlaku ${a.berlakuHari} hari.` : "",
  ].join("");
}

/** Draf WA untuk admin (dikirim manual): hadiah tersedia. Gaya admin di HP — tanpa "semoga", emoji maks 1. */
export function pesanWaHadiah(nama: string, jumlahPesan: number, hadiah: string, hangus: string | null): string {
  return `Halo Kak ${nama}, terima kasih sudah ${jumlahPesan}x pesan Ikut Menu Pesta Tiska 🙏 Kakak dapat ${hadiah}, bisa dipakai di pesanan berikutnya${hangus ? ` sampai ${tgl(hangus)}` : ""}. Mau dipakai di program yang mana, Kak?`;
}
