import { z } from "zod";

import { jamPertama, namaTempat, pecahNama, pisahSesi } from "@/lib/dapur-layar";
import type { OrderLayar } from "@/lib/pesanan-dapur";

/* ==========================================================================
   RENCANA MASAK (docs/23 §3A.2, P2) — jadwal persiapan format Mbak Rita:
   Sesi Masak → Batch → langkah berjam (boleh tumpang tindih) → Kloter + muatan.
   Diketik sekali di Kontrol Dapur → TV (Sekarang/Berikutnya) + teks WA yang sama. Murni.
   ========================================================================== */

const Jam = z.string().regex(/^([01]\d|2[0-3])\.[0-5]\d$/, "Jam ditulis 00.00–23.59");

export const LangkahRencana = z.object({
  mulai: Jam,
  /** null = titik waktu (kloter berangkat, siap pick-up). */
  selesai: Jam.nullable(),
  teks: z.string().trim().min(1, "Isi pekerjaannya").max(300),
  /** Muatan / rincian, satu per baris ("1.100 Snack Box"). */
  rincian: z.string().trim().max(1000).default(""),
});
export const SesiRencana = z.object({
  judul: z.string().trim().max(200).default(""),
  batch: z.string().trim().max(300).default(""),
  langkah: z.array(LangkahRencana).max(60),
});
export const IsiRencana = z.object({
  judul: z.string().trim().max(200).default(""),
  catatan: z.string().trim().max(2000).default(""),
  sesi: z.array(SesiRencana).max(12),
});
export type LangkahRencana = z.infer<typeof LangkahRencana>;
export type SesiRencana = z.infer<typeof SesiRencana>;
export type IsiRencana = z.infer<typeof IsiRencana>;
/** Jadwal satu pesanan pada satu tanggal; `pesanan` = nama pemesan (label di TV bila ada beberapa pesanan). */
export type Rencana = IsiRencana & { tanggal: string; pesanan?: string };

const menitJam = (j: string) => Number(j.slice(0, 2)) * 60 + Number(j.slice(3));
const jamMenit = (m: number) => {
  const x = Math.max(0, Math.min(23 * 60 + 59, m));
  return `${String(Math.floor(x / 60)).padStart(2, "0")}.${String(x % 60).padStart(2, "0")}`;
};

/** Langkah dalam satu sesi diurutkan menurut jam mulai (yang tumpang tindih tetap berdampingan). */
export const urutLangkah = (l: LangkahRencana[]) =>
  [...l].sort((a, b) => a.mulai.localeCompare(b.mulai) || (a.selesai ?? a.mulai).localeCompare(b.selesai ?? b.mulai));

/** "00.00-10.00": jam paling awal s.d. paling akhir seluruh langkah; null bila belum ada langkah. */
export function rentangJam(r: IsiRencana): string | null {
  const l = r.sesi.flatMap((s) => s.langkah);
  if (!l.length) return null;
  const awal = l.map((x) => x.mulai).sort()[0];
  const akhir = l.map((x) => x.selesai ?? x.mulai).sort().at(-1)!;
  return awal === akhir ? awal : `${awal}-${akhir}`;
}

const tanggalPanjang = (t: string) =>
  new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

const GARIS = "——————————————-";

/** Teks WA persis format Mbak Rita (grup "NEW Tim Kitchen TISKA", contoh WISUDA UNPAK 25 Nov 2026). */
export function teksWa(r: Rencana): string {
  const rentang = rentangJam(r);
  const baris = [
    `📌 *JADWAL PERSIAPAN MASAK + PACKING${r.judul ? ` ${r.judul}` : ""}*`,
    `📆 ${tanggalPanjang(r.tanggal)}`,
    ...(rentang ? [`⏰ ${rentang} WIB`] : []),
  ];
  for (const s of r.sesi) {
    baris.push(GARIS);
    if (s.judul) baris.push(`👨🏼‍🍳👩🏻‍🍳 *${s.judul}*`);
    if (s.batch) baris.push(`💁🏻‍♂️ *${s.batch}:*`);
    if (s.judul || s.batch) baris.push("");
    for (const l of urutLangkah(s.langkah)) {
      baris.push(l.selesai ? `⏰ *${l.mulai}-${l.selesai}:* ${l.teks}` : `⏰ *${l.mulai}: ${l.teks}*`);
      for (const x of l.rincian.split("\n").map((y) => y.replace(/^\s*[-•]\s*/, "").trim()).filter(Boolean)) baris.push(`- ${x}`);
    }
  }
  if (r.catatan) baris.push(GARIS, "‼️ *Catatan:*", r.catatan);
  return baris.join("\n");
}

/* ---------- Draf otomatis dari invoice ---------- */

/** "1.693 BOX" + "Snack Box" → "1.693 Snack Box"; "120 PAX" + "Buffet" → "120 pax Buffet". */
function bebanBaris(jumlah: string, nama: string): string {
  const m = /^(.*?)\s*([A-Za-z][\w./-]*)$/.exec(jumlah.trim());
  const [angka, satuan] = m && m[1] ? [m[1], m[2].toLowerCase()] : [jumlah.trim(), ""];
  const utama = pecahNama(nama).utama;
  return !satuan || utama.toLowerCase().includes(satuan) ? `${angka} ${utama}` : `${angka} ${satuan} ${utama}`;
}

/**
 * Draf dari pesanan (operator lalu menggeser jamnya): tiap sesi pesanan = satu Sesi Masak, dihitung mundur dari jam
 * pesanan — masak 3 jam s.d. 1 jam sebelum, nata 1 jam s.d. 15 menit sebelum, lalu kloter siap delivery tepat di jamnya.
 * ponytail: durasi tetap 3 jam/45 menit; ganti dengan kecepatan nata nyata setelah ada Evaluasi (docs/23 tahap 5).
 */
export function drafRencana(order: OrderLayar[]): IsiRencana {
  const sesi: SesiRencana[] = [];
  let kloter = 0;
  for (const o of order) {
    const kelompok = new Map<string, { label: string | null; items: OrderLayar["items"] }>();
    for (const it of o.items) {
      const { sesi: s } = pisahSesi(it.nama);
      const k = s ?? "";
      if (!kelompok.has(k)) kelompok.set(k, { label: s, items: [] });
      kelompok.get(k)!.items.push(it);
    }
    for (const { label, items } of kelompok.values()) {
      const berjumlah = items.filter((i) => i.jumlah);
      if (!berjumlah.length) continue;
      const muatan = berjumlah.map((i) => bebanBaris(i.jumlah!, pisahSesi(i.nama).nama));
      const menu = [...new Set(berjumlah.map((i) => pecahNama(pisahSesi(i.nama).nama).utama))];
      const jam = (label && jamPertama(label)) || o.jam;
      const labelBersih = label?.replace(/(?<!\d)([01]?\d|2[0-3])[.:]([0-5]\d)(?!\d)/, "").replace(/[\s·–-]+$/, "").trim();
      const langkah: LangkahRencana[] = [];
      if (jam) {
        const t = menitJam(jam);
        const tujuan = namaTempat(o.tempat);
        kloter += 1;
        langkah.push(
          { mulai: jamMenit(t - 180), selesai: jamMenit(t - 60), teks: `Sesi masak ${menu.slice(0, 3).join(", ")}`, rincian: "" },
          { mulai: jamMenit(t - 60), selesai: jamMenit(t - 15), teks: `Target nata isi ${muatan.join(" + ")} 👉🏻 masuk kontainer`, rincian: "" },
          { mulai: jam, selesai: null, teks: `[KLOTER-${kloter}] Siap delivery${tujuan ? ` ke ${tujuan}` : ""}`, rincian: muatan.join("\n") },
        );
      }
      sesi.push({
        judul: `Sesi Masak-${sesi.length + 1}; ${labelBersih || o.nama}`,
        batch: `Packing ${muatan.join(" + ")}${labelBersih ? ` [${o.nama}]` : ""}`,
        langkah,
      });
    }
  }
  const nama = [...new Set(order.map((o) => o.nama))];
  return { judul: nama.length ? `ORDER [${nama.join(" + ")}]` : "", catatan: "", sesi };
}

/* ---------- Linimasa untuk TV ---------- */

export type LangkahTayang = {
  kunci: string;
  mulai: number;
  selesai: number | null;
  jamMulai: string;
  jamSelesai: string | null;
  teks: string;
  rincian: string[];
  sesi: string;
  tanggal: string;
  pesanan: string | null;
};

const wib = (tanggal: string, jam: string) => Date.parse(`${tanggal}T${jam.replace(".", ":")}:00+07:00`);

/** Semua langkah (hari ini + besok) berwaktu mutlak, urut jam mulai. Selesai < mulai = lewat tengah malam. */
export function linimasa(rencana: Rencana[]): LangkahTayang[] {
  return rencana
    .flatMap((r) =>
      r.sesi.flatMap((s, i) =>
        s.langkah.map((l, j) => {
          const mulai = wib(r.tanggal, l.mulai);
          let selesai = l.selesai ? wib(r.tanggal, l.selesai) : null;
          if (selesai !== null && selesai <= mulai) selesai += 86_400_000;
          return {
            kunci: `${r.tanggal}|${r.pesanan ?? ""}|${i}|${j}`,
            mulai,
            selesai,
            jamMulai: l.mulai,
            jamSelesai: l.selesai,
            teks: l.teks,
            rincian: l.rincian.split("\n").map((x) => x.replace(/^\s*[-•]\s*/, "").trim()).filter(Boolean),
            sesi: s.judul,
            tanggal: r.tanggal,
            pesanan: r.pesanan ?? null,
          };
        }),
      ),
    )
    .sort((a, b) => a.mulai - b.mulai);
}

/** Titik waktu (kloter) tetap di "Sekarang" 10 menit setelah jamnya. */
export const TITIK_MS = 10 * 60_000;
const akhir = (l: LangkahTayang) => l.selesai ?? l.mulai + TITIK_MS;

/** Sekarang = langkah yang sedang berjalan; Berikutnya = yang belum mulai. Habis semua → keduanya kosong. */
export function posisi(l: LangkahTayang[], kini: number): { sekarang: LangkahTayang[]; berikutnya: LangkahTayang[] } {
  return {
    sekarang: l.filter((x) => x.mulai <= kini && kini < akhir(x)),
    berikutnya: l.filter((x) => x.mulai > kini),
  };
}

/** Teks untuk layar TV: tanpa emoji (👉🏻 dari kebiasaan WA tidak terbaca dari jauh). */
export const tanpaEmoji = (t: string) =>
  t
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}‍️]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/** Teks untuk dibacakan TTS: tanpa emoji & tanda kurung siku. */
export const teksSuara = (t: string) => tanpaEmoji(t.replace(/[[\]]/g, " "));

/* ---------- Jadwal menempel ke pesanan (docs/24 M1) ---------- */

/** Gabungan jadwal semua pesanan satu tanggal untuk satu pesan WA (judul pesanan digabung, sesi berurutan). */
export function gabungHari(tanggal: string, daftar: Rencana[]): Rencana {
  if (daftar.length === 1) return daftar[0];
  return {
    tanggal,
    judul: `ORDER [${daftar.map((r) => r.pesanan ?? r.judul).join(" + ")}]`,
    catatan: daftar
      .filter((r) => r.catatan)
      .map((r) => (r.pesanan ? `${r.pesanan}: ${r.catatan}` : r.catatan))
      .join("\n"),
    sesi: daftar.flatMap((r) => r.sesi),
  };
}

/** Sidik pesanan saat jadwal disimpan: jam + baris berjumlah. Dibandingkan ulang untuk tanda "Pesanan berubah". */
export const Sidik = z.object({
  jam: z.string().nullable(),
  items: z.array(z.tuple([z.string(), z.string()])),
});
export type Sidik = z.infer<typeof Sidik>;

export function sidikPesanan(o: Pick<OrderLayar, "jam" | "items">): Sidik {
  return { jam: o.jam, items: o.items.flatMap((i) => (i.jumlah ? [[i.nama, i.jumlah] as [string, string]] : [])) };
}

/** Perubahan pesanan sejak jadwal disimpan, dalam kalimat ("Snack Box: 1.693 BOX → 1.750 BOX"); kosong = sama. */
export function bedaPesanan(lama: Sidik, baru: Sidik): string[] {
  const hasil: string[] = [];
  if (lama.jam !== baru.jam) hasil.push(`Jam: ${lama.jam ?? "–"} → ${baru.jam ?? "–"}`);
  const a = new Map(lama.items);
  const b = new Map(baru.items);
  for (const [nama, j] of b) {
    if (!a.has(nama)) hasil.push(`Baru: ${nama} ${j}`);
    else if (a.get(nama) !== j) hasil.push(`${nama}: ${a.get(nama)} → ${j}`);
  }
  for (const [nama, j] of a) if (!b.has(nama)) hasil.push(`Dihapus: ${nama} ${j}`);
  return hasil;
}
