import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/* ==========================================================================
   MERINGKAS TANGGAL ACARA

   Satu dokumen bisa menanggung acara beberapa hari, dan tanggalnya tidak
   selalu berurutan: 10, 12, lalu 15 Mei. Yang dicetak harus bisa dibaca
   sekali lihat oleh orang yang menerima dokumennya, tanpa menghitung sendiri.

   Tiga bentuk, dipilih dari tanggalnya sendiri:

     satu hari       Minggu, 10 Mei 2026
     berurutan       Minggu 10 – Selasa 12 Mei 2026
     meloncat        Minggu 10, Selasa 12 & Jumat 15 Mei 2026

   NAMA HARINYA IKUT DISEBUT. Yang memesan katering memikirkan acaranya
   sebagai "hari Sabtu", bukan sebagai "tanggal 10", dan salah hari adalah
   kesalahan yang tidak bisa diperbaiki pada hari kejadiannya. Tanggal
   sendirian menuntut penerimanya membuka kalender untuk memastikan.

   Bagian yang sama tidak diulang. "10, 12 & 15 Mei 2026" lebih mudah dibaca
   daripada "10 Mei 2026, 12 Mei 2026 & 15 Mei 2026", dan di dokumen yang
   kolomnya sempit perbedaan itu menentukan apakah tanggalnya muat satu baris.
   ========================================================================== */

const SEHARI = 24 * 60 * 60 * 1000;

/** Membuang jam, supaya dua tanggal yang sama tidak berbeda karena zonanya. */
function hari(t: Date): number {
  return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / SEHARI;
}

/** Mengurutkan, membuang yang kembar, dan membuang yang tidak sah. */
export function rapikanTanggal(daftar: Date[]): Date[] {
  const terlihat = new Set<number>();
  const bersih: Date[] = [];

  for (const t of daftar) {
    if (!(t instanceof Date) || Number.isNaN(t.getTime())) continue;
    const kunci = hari(t);
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    bersih.push(t);
  }

  return bersih.sort((a, b) => a.getTime() - b.getTime());
}

function berurutan(daftar: Date[]): boolean {
  for (let i = 1; i < daftar.length; i++) {
    if (hari(daftar[i]) - hari(daftar[i - 1]) !== 1) return false;
  }
  return true;
}

function samaBulan(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const panjang = (t: Date) => format(t, "d MMMM yyyy", { locale: localeId });

/** Nama hari, misalnya "Kamis". */
const namaHari = (t: Date) => format(t, "EEEE", { locale: localeId });

/**
 * Menyusun daftar tanggal menjadi satu kalimat siap cetak.
 *
 * Mengembalikan null kalau tidak ada tanggalnya — pemanggil yang memutuskan
 * mau menulis "-" atau menyembunyikan barisnya.
 */
export function ringkasTanggalAcara(daftar: Date[]): string | null {
  const t = rapikanTanggal(daftar);
  if (t.length === 0) return null;
  // Satu tanggal memakai koma, sebagaimana orang menuliskannya sehari-hari:
  // "Kamis, 8 Oktober 2026". Bentuk yang lebih dari satu tidak memakainya,
  // supaya komanya tidak bertabrakan dengan koma pemisah antar tanggal.
  if (t.length === 1) return `${namaHari(t[0])}, ${panjang(t[0])}`;

  const awal = t[0];
  const akhir = t[t.length - 1];

  if (berurutan(t)) {
    // Bagian yang sama disebut sekali, di ujung kanan: "10 – 12 Mei 2026",
    // "30 April – 2 Mei 2026", "30 Desember 2026 – 1 Januari 2027".
    const habis = `${namaHari(akhir)} ${panjang(akhir)}`;

    if (samaBulan(awal, akhir)) {
      return `${namaHari(awal)} ${format(awal, "d", { locale: localeId })} – ${habis}`;
    }
    if (awal.getFullYear() === akhir.getFullYear()) {
      return `${namaHari(awal)} ${format(awal, "d MMMM", { locale: localeId })} – ${habis}`;
    }
    return `${namaHari(awal)} ${panjang(awal)} – ${habis}`;
  }

  // Meloncat. Kalau seluruhnya dalam satu bulan, cukup angka tanggalnya.
  const seragam = t.every((x) => samaBulan(x, awal));
  const bagian = seragam
    ? t.map((x, i) =>
        i === t.length - 1
          ? `${namaHari(x)} ${panjang(x)}`
          : `${namaHari(x)} ${format(x, "d", { locale: localeId })}`,
      )
    : t.map((x) => `${namaHari(x)} ${panjang(x)}`);

  return `${bagian.slice(0, -1).join(", ")} & ${bagian[bagian.length - 1]}`;
}

/**
 * Bentuk PENDEK tanggal acara, untuk kolom daftar dan laporan di layar.
 *
 * Bentuk panjangnya — "Minggu 10 – Selasa 12 Mei 2026" — dibuat untuk
 * dokumen yang dibaca orang satu per satu. Ditaruh di kolom tabel, kalimat
 * sepanjang itu membungkus menjadi tiga baris dan membuat seluruh daftar
 * tiga kali lebih tinggi, sehingga yang terlihat dalam satu layar tinggal
 * sepertiganya.
 *
 * Nama harinya sengaja TIDAK ikut di sini, berbeda dengan dokumen cetak.
 * Di daftar, tanggal acara adalah keterangan untuk mengenali barisnya —
 * "yang acaranya bulan depan" — bukan angka yang dipakai memasak atau
 * mengantar. Yang butuh harinya membuka dokumennya.
 *
 *     satu hari     10 Mei 2026
 *     berurutan     10 – 12 Mei 2026
 *     meloncat      10 Mei 2026 · 3 hari
 *
 * Yang meloncat TIDAK dirangkai satu per satu: jumlah harinya yang
 * disebutkan. Daftar tanggal yang memanjang justru mengembalikan masalah
 * yang membuat bentuk pendek ini ada.
 */
export function ringkasTanggalAcaraPendek(daftar: Date[]): string | null {
  const t = rapikanTanggal(daftar);
  if (t.length === 0) return null;

  const pendek = (x: Date) => format(x, "d MMM yyyy", { locale: localeId });

  if (t.length === 1) return pendek(t[0]);

  const awal = t[0];
  const akhir = t[t.length - 1];

  if (berurutan(t)) {
    // Bagian yang sama disebut sekali di ujung kanan, sama seperti bentuk
    // panjangnya: "10 – 12 Mei 2026", bukan "10 Mei 2026 – 12 Mei 2026".
    if (samaBulan(awal, akhir)) {
      return `${format(awal, "d", { locale: localeId })} – ${pendek(akhir)}`;
    }
    if (awal.getFullYear() === akhir.getFullYear()) {
      return `${format(awal, "d MMM", { locale: localeId })} – ${pendek(akhir)}`;
    }
    return `${pendek(awal)} – ${pendek(akhir)}`;
  }

  return `${pendek(awal)} · ${t.length} hari`;
}

/** Jumlah hari acara = banyaknya tanggal, bukan selisih ujung ke ujung. */
export function jumlahHariAcara(daftar: Date[]): number {
  return rapikanTanggal(daftar).length;
}

/**
 * Tanggal acara sebuah dokumen, dari mana pun ia tersimpan.
 *
 * Dokumen yang dibuat SEBELUM tanggal acara menjadi daftar hanya punya satu
 * kolom tanggal dan satu kolom jumlah hari. Membaca daftarnya saja membuat
 * dokumen-dokumen itu terbaca TANPA TANGGAL ACARA — dan karena tanpa
 * tanggal berarti "dianggap sudah terjadi", seluruhnya menumpuk di piutang
 * sementara penjualan bulan ini terbaca nol.
 *
 * Itu persis yang terjadi: empat belas dari lima belas invoice menyimpan
 * tanggalnya hanya di kolom lama, dan dashboard menyebut "0 acara sudah
 * terjadi" pada hari yang justru ada acaranya.
 *
 * Satu pintu untuk seluruh pembacaan tanggal acara, supaya tidak ada tempat
 * yang membaca setengahnya saja.
 */
export function tanggalAcaraDokumen(
  daftar: { event_date: Date }[],
  cadanganTanggal: Date | null,
  cadanganHari: number | null,
): Date[] {
  if (daftar.length > 0) return rapikanTanggal(daftar.map((b) => b.event_date));
  if (!cadanganTanggal) return [];

  // "Jumlah hari" pada dokumen lama berarti sekian hari berurutan sejak
  // tanggalnya. Dibaca apa adanya, bukan ditebak.
  const hari = Math.max(1, Math.min(cadanganHari ?? 1, 31));
  return Array.from({ length: hari }, (_, i) => {
    const t = new Date(cadanganTanggal);
    t.setUTCDate(t.getUTCDate() + i);
    return t;
  });
}

/** Batas rentang yang ditawarkan untuk diisi otomatis — lebih dari ini hampir pasti salah ketik tahun/bulan. */
export const RENTANG_MAKS_HARI = 31;

/**
 * Tanggal acara yang diisi berceleh (mis. hanya awal & akhir: Minggu 15 dan Kamis 19) → seluruh tanggal dari yang
 * paling awal sampai paling akhir ("2026-11-15" … "2026-11-19", 5 hari). Null kalau tidak ada celah, kurang dari dua
 * tanggal, atau rentangnya lebih dari RENTANG_MAKS_HARI.
 *
 * Masukan Rama/atasan (16 Nov 2026): mengisi tanggal awal & akhir lalu mengira jumlah harinya ikut dihitung 5,
 * padahal form menyimpan daftar tanggal (acara katering kadang meloncat hari). Form menawarkan satu tombol untuk
 * mengisi tanggal di antaranya; yang meloncat dibiarkan apa adanya kalau tawarannya diabaikan.
 * Dihitung di UTC dari teks "yyyy-mm-dd" supaya zona waktu tidak menggeser hari.
 */
export function isiTanggalDiAntara(teks: string[]): string[] | null {
  const hari = [...new Set(teks.filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t)))]
    .map((t) => Date.UTC(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10))))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (hari.length < 2) return null;
  const SEHARI = 86_400_000;
  const rentang = Math.round((hari[hari.length - 1] - hari[0]) / SEHARI) + 1;
  if (rentang === hari.length || rentang > RENTANG_MAKS_HARI) return null;
  return Array.from({ length: rentang }, (_, i) => new Date(hari[0] + i * SEHARI).toISOString().slice(0, 10));
}
