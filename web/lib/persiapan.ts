import { z } from "zod";

/* ==========================================================================
   PERSIAPAN ACARA BESAR H-n (docs/25 #5) — pola pesan Mbak Ari untuk UNPAK:
   "📣 To: Tim Bapak-Bapak · Perihal: Persiapan Ruang Nata Box…" (agenda tugas per
   tim + rentang tanggal) dan "‼️ UPDATE Target Lipat2 Box" (total order dirinci,
   target selesai per hari). Satu sumber → halaman Event, pesan WA, TV dapur. Murni.
   ========================================================================== */

const Tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal belum dipilih");
const Bulat = z.number().int().min(0).max(1_000_000);

export const TargetPersiapan = z.object({
  judul: z.string().trim().min(1, "Isi nama target, mis. Lipat box").max(100),
  satuan: z.string().trim().max(20).default("box"),
  /** Total order dirinci ("Snack Box Peserta = 3.398"). */
  rincian: z.array(z.object({ nama: z.string().trim().min(1).max(200), jumlah: Bulat })).max(30),
  /** Target selesai per hari; `tercapai` diisi dari tombol progres (tidak ikut ditimpa saat jadwal disimpan). */
  harian: z.array(z.object({ tanggal: Tanggal, target: Bulat, tercapai: Bulat.default(0) })).max(31),
});
export const AgendaPersiapan = z.object({
  judul: z.string().trim().min(1, "Isi perihal agendanya").max(200),
  tim: z.string().trim().max(60).default(""),
  dari: Tanggal,
  sampai: Tanggal,
  butir: z.array(z.string().trim().min(1).max(300)).max(30),
});
export const Persiapan = z.object({
  target: z.array(TargetPersiapan).max(5),
  agenda: z.array(AgendaPersiapan).max(20),
});
export type TargetPersiapan = z.infer<typeof TargetPersiapan>;
export type AgendaPersiapan = z.infer<typeof AgendaPersiapan>;
export type Persiapan = z.infer<typeof Persiapan>;

export const TIM_PERSIAPAN = ["Tim Bapak-Bapak", "Tim Ibu-Ibu", "Tim DW", "Semua tim"] as const;

const angka = (n: number) => n.toLocaleString("id-ID");
const hari = (t: string) => Date.parse(`${t}T00:00:00Z`) / 86_400_000;
export const geserTanggal = (t: string, n: number) => new Date(Date.parse(`${t}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** "H-6" (selisih dari tanggal acara); hari H & sesudahnya "H". */
export const labelH = (tanggal: string, acara: string) => {
  const n = Math.round(hari(acara) - hari(tanggal));
  return n > 0 ? `H-${n}` : "H";
};

const fmt = (t: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { ...o, timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/** "Rabu, 25 Nov 2026" · "Senin-Rabu, 23-25 Nov 2026" · "Senin-Rabu, 30 Nov-2 Des 2026" (format Mbak Ari). */
export function rentangTanggal(dari: string, sampai: string): string {
  if (sampai <= dari) return fmt(dari, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  const namaHari = `${fmt(dari, { weekday: "long" })}-${fmt(sampai, { weekday: "long" })}`;
  const sebulan = dari.slice(0, 7) === sampai.slice(0, 7);
  const tgl = sebulan
    ? `${Number(dari.slice(8))}-${fmt(sampai, { day: "numeric", month: "short", year: "numeric" })}`
    : `${fmt(dari, { day: "numeric", month: "short" })}-${fmt(sampai, { day: "numeric", month: "short", year: "numeric" })}`;
  return `${namaHari}, ${tgl}`;
}

/** Total order target: jumlah rincian, atau jumlah target harian bila rincian kosong. */
export const totalTarget = (t: Pick<TargetPersiapan, "rincian" | "harian">) =>
  t.rincian.length ? t.rincian.reduce((n, r) => n + r.jumlah, 0) : t.harian.reduce((n, h) => n + h.target, 0);

/** Bagi total ke beberapa hari; sisa pembagian ke hari pertama (UNPAK: 791 · 750 · 750 · …). */
export function bagiRata(total: number, tanggal: string[]): { tanggal: string; target: number }[] {
  if (!tanggal.length) return [];
  const per = Math.floor(total / tanggal.length);
  return tanggal.map((t, i) => ({ tanggal: t, target: per + (i === 0 ? total - per * tanggal.length : 0) }));
}

type BarisPesanan = { nama: string; qty: number; pax?: number | null; satuan: string | null };

/** Rincian box dari isi pesanan: baris bersatuan box; jumlah = qty × pax (event: "1 box × 29 pax" = 29 box). */
export function rincianBox(items: BarisPesanan[]): { nama: string; jumlah: number }[] {
  const per = new Map<string, number>();
  for (const i of items) {
    if (!/box/i.test(i.satuan ?? "") || !(i.qty > 0)) continue;
    const nama = i.nama.replace(/^\s*\[[^\]]*\]\s*[-:;,]?\s*/, "").trim();
    per.set(nama, (per.get(nama) ?? 0) + Math.round(i.qty * (i.pax && i.pax > 0 ? i.pax : 1)));
  }
  return [...per].map(([nama, jumlah]) => ({ nama, jumlah }));
}

/**
 * Draf dari pesanan: target "Lipat box" = semua box pesanan, dibagi rata H-6 s.d. H-3 (UNPAK 25 Nov: lipat 19–22 Nov);
 * pesanan tanpa box → tanpa target. Agenda dibiarkan kosong (isinya khas tiap acara).
 */
export function drafPersiapan(items: BarisPesanan[], tanggalAcara: string): Persiapan {
  const rincian = rincianBox(items);
  const total = rincian.reduce((n, r) => n + r.jumlah, 0);
  const hariLipat = [6, 5, 4, 3].map((n) => geserTanggal(tanggalAcara, -n));
  return {
    target: total ? [{ judul: "Lipat box", satuan: "box", rincian, harian: bagiRata(total, hariLipat).map((h) => ({ ...h, tercapai: 0 })) }] : [],
    agenda: [],
  };
}

/** Saat jadwal disimpan, angka tercapai tetap dari database (tombol progres bisa ditekan orang lain sementara itu). */
export function pertahankanTercapai(baru: Persiapan, lama: Persiapan | null): Persiapan {
  return {
    ...baru,
    target: baru.target.map((t) => {
      const l = lama?.target.find((x) => x.judul === t.judul);
      return { ...t, harian: t.harian.map((h) => ({ ...h, tercapai: l?.harian.find((x) => x.tanggal === h.tanggal)?.tercapai ?? 0 })) };
    }),
  };
}

const GARIS = "———————————————";

/** "‼️ UPDATE Target …" + agenda — ringkasan persiapan per hari ini (format Mbak Ari 25 Nov). */
export function teksPersiapan(p: Persiapan, o: { acara: string; tanggalAcara: string; hariIni: string }): string {
  const judul = p.target.map((t) => t.judul).join(" & ");
  const out = [
    judul ? `‼️ *UPDATE Target ${judul}:*` : "📣📣📣 *UPDATE Persiapan:*",
    `*Perihal:* Persiapan Acara ${o.acara} [${labelH(o.hariIni, o.tanggalAcara)}]`,
    `📆 *${rentangTanggal(o.hariIni, o.hariIni)}*`,
  ];
  for (const t of p.target) {
    const total = totalTarget(t);
    if (t.rincian.length) {
      out.push("*Total Order:*", ...t.rincian.map((r, i) => `${i + 1}. ${r.nama} = ${angka(r.jumlah)}`), `👉🏻 *Total = ${angka(total)} ${t.satuan}*`);
    }
    if (t.harian.length) {
      out.push(GARIS, `📦 *JADWAL SELESAI ${t.judul.toUpperCase()}*`, "👉🏻 Target per hari adalah SELESAI:");
      for (const h of t.harian) {
        const beres = h.tercapai >= h.target && h.target > 0;
        out.push(`📆 *${fmt(h.tanggal, { day: "numeric", month: "short" })} = ${angka(h.target)} ${t.satuan}*${beres ? " ✅" : h.tercapai ? ` (baru ${angka(h.tercapai)})` : ""}`);
      }
      out.push(`👉🏻 Total = ${angka(t.harian.reduce((n, h) => n + h.target, 0))} ${t.satuan}`);
    }
  }
  for (const a of p.agenda) out.push(GARIS, `${ikonAgenda(a.judul)} *${a.judul.toUpperCase()}${a.tim ? ` (${a.tim})` : ""}:*`, `📆 ${rentangTanggal(a.dari, a.sampai)}`);
  return out.join("\n");
}

const ikonAgenda = (judul: string) => (/loading|set.?up/i.test(judul) ? "⚙️" : /kue|masak|bikin/i.test(judul) ? "👩🏻‍🍳" : "📌");

/** "📣📣📣 To: Tim Bapak-Bapak · Perihal: … [H-n]" + daftar tugas — satu agenda. */
export function teksAgenda(a: AgendaPersiapan, o: { acara: string; tanggalAcara: string }): string {
  return [
    `📣📣📣 *To: ${a.tim || "Semua tim"}*`,
    `*Perihal:* ${a.judul} — Persiapan Acara ${o.acara} [${labelH(a.dari, o.tanggalAcara)}]`,
    `📆 *${rentangTanggal(a.dari, a.sampai)}*`,
    GARIS,
    ...a.butir.map((b, i) => `${i + 1}. ${b}`),
  ].join("\n");
}

/** Target yang jatuh hari ini (TV dapur): sampai hari ini berapa yang harus sudah selesai. */
export function targetHariIni(p: Persiapan, hariIni: string) {
  return p.target.flatMap((t) => {
    const h = t.harian.find((x) => x.tanggal === hariIni);
    if (!h) return [];
    const sampai = t.harian.filter((x) => x.tanggal <= hariIni);
    return [
      {
        judul: t.judul,
        satuan: t.satuan,
        target: h.target,
        tercapai: h.tercapai,
        totalTarget: totalTarget(t),
        totalTercapai: t.harian.reduce((n, x) => n + x.tercapai, 0),
        sampaiHariIni: sampai.reduce((n, x) => n + x.target, 0),
      },
    ];
  });
}
