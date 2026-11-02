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
  /** Total pax minimal per pesanan agar dihitung (D-134); null = berapa pun. */
  minPax: number | null;
  /** Syarat harus terpenuhi dalam N hari sejak stempel pertama; null = tanpa batas. */
  jendelaHari: number | null;
  /** Hadiah bisa dipakai N hari sejak didapat; null = tanpa batas. */
  berlakuHari: number | null;
  /** Pesanan yang dikirim sebelum tanggal ini tidak dihitung. */
  mulai: string;
};

export type PesananLoyalti = { id: string; tanggal: string; nilai: number; pax: number };

export type HadiahLoyalti = { kunci: string; didapat: string; hangus: string | null; status: "tersedia" | "dipakai" | "hangus"; idPesanan: string };

export type KartuLoyalti = {
  /** Stempel siklus berjalan. */
  stempel: number;
  syarat: number;
  /** Batas waktu siklus berjalan (tanggal terakhir stempel ke-N harus didapat); null bila tanpa batas / belum mulai. */
  batas: string | null;
  hadiah: HadiahLoyalti[];
};

/** Pesanan memenuhi syarat dasar program: tanggal kirim ≥ mulai, nilai ≥ minimal, pax ≥ minimal. */
export function memenuhi(a: Pick<AturanLoyalti, "mulai" | "minBelanja" | "minPax">, p: Pick<PesananLoyalti, "tanggal" | "nilai" | "pax">): boolean {
  return p.tanggal >= a.mulai && (a.minBelanja === null || p.nilai >= a.minBelanja) && (a.minPax === null || p.pax >= a.minPax);
}

const tambahHari = (t: string, n: number) => new Date(Date.parse(`${t}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function kartuLoyalti(aturan: AturanLoyalti, pesanan: PesananLoyalti[], dipakai: ReadonlySet<string>, hariIni: string): KartuLoyalti {
  const syarat = Math.max(1, aturan.syarat);
  const sah = pesanan
    .filter((p) => memenuhi(aturan, p))
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

/**
 * "Pesan 5× (min. 4 pax/pesanan) dalam 182 hari → Gratis 1 pax. Hadiah berlaku 30 hari."
 * Bonus tiap pesanan: "Setiap pesanan min. 4 pax → 1 botol minuman 120 ml."
 */
export function kalimatAturan(a: AturanLoyalti & { hadiah: string; jenis?: JenisProgram }): string {
  if (a.jenis === "tiap_pesanan") return `Setiap pesanan${a.minPax ? ` min. ${a.minPax} pax` : ""}${a.minBelanja ? ` (min. ${rp(a.minBelanja)})` : ""} → ${a.hadiah}.`;
  const min = [a.minPax ? `${a.minPax} pax` : null, a.minBelanja ? rp(a.minBelanja) : null].filter(Boolean).join(", ");
  return [
    `Pesan ${a.syarat}×`,
    min ? ` (min. ${min}/pesanan)` : "",
    a.jendelaHari ? ` dalam ${a.jendelaHari} hari` : "",
    ` → ${a.hadiah}.`,
    a.berlakuHari ? ` Hadiah berlaku ${a.berlakuHari} hari.` : "",
  ].join("");
}

/** Draf WA untuk admin (dikirim manual): hadiah tersedia. Gaya admin di HP — tanpa "semoga", emoji maks 1. */
export function pesanWaHadiah(nama: string, jumlahPesan: number, hadiah: string, hangus: string | null): string {
  return `Halo Kak ${nama}, terima kasih sudah ${jumlahPesan}x pesan Ikut Menu Pesta Tiska 🙏 Kakak dapat ${hadiah}, bisa dipakai di pesanan berikutnya${hangus ? ` sampai ${tgl(hangus)}` : ""}. Mau dipakai di program yang mana, Kak?`;
}

/* ---------- Syarat & ketentuan (D-134, masukan Mas Reza) ---------- */

export type JenisProgram = "stempel" | "tiap_pesanan";
export type JenisHadiah = "teks" | "gratis_pax" | "bonus";

/**
 * Hadiah program yang tidak bisa digabung tidak boleh dipakai bersama hadiah program lain di satu pesanan
 * (dua arah: program baru tidak bisa digabung, atau pesanan itu sudah memakai hadiah yang tidak bisa digabung).
 */
export function bolehDigabung(baru: { stackable: boolean }, sudahDiPesanan: { stackable: boolean }[]): boolean {
  if (!sudahDiPesanan.length) return true;
  return baru.stackable && sudahDiPesanan.every((x) => x.stackable);
}

/** Baris potongan invoice untuk "gratis X pax": harga per pax program × X, minus (PBJT ikut dihitung dari harga sesudah potongan). */
export function barisGratisPax(jumlahPax: number, hargaPerPax: number, paxPesanan: number): { pax: number; harga: number } {
  const pax = Math.min(jumlahPax, paxPesanan);
  return { pax, harga: -hargaPerPax };
}

export const SK_BAWAAN = ["Hadiah ditukar pada pesanan berikutnya.", "Tidak bisa digabung dengan promo / hadiah lain.", "Tidak bisa diuangkan."].join("\n");
