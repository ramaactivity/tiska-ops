/* ==========================================================================
   BRIEF GRUP TIM (07-BRIEF-TEMPLATES.md, D-050). Murni.

   Format mengikuti brief yang selama ini dikirim admin ke grup "NEW Tim
   Kitchen/Captain TISKA": *tebal* WA, emoji, garis pemisah, DAY n keycap,
   "Pukul HH.MM - Tiba dilokasi", item = qty unit + menu bernomor.
   TIDAK PERNAH memuat harga.
   ========================================================================== */

import { teksJumlahBaris } from "@/lib/uang";

export type BriefEvent = {
  pemesan: string;
  pic: string | null;
  hp: string | null;
  acara: string | null;
  cara: "antar" | "ambil" | "setup_service";
  venue: string | null;
  alamat: string | null;
  catatan: string | null;
  items: {
    tanggal: string | null;
    sesi: string | null;
    jam: string | null;
    nama: string;
    qty: string;
    unit: string | null;
    pax: number | null;
    isi: string[];
  }[];
};

const KEYCAP = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const GARIS = "-------------------------------";

function hariPanjang(t: string): string {
  const [y, m, d] = t.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

function emoji(nama: string, unit: string | null): string {
  const t = `${nama} ${unit ?? ""}`.toLowerCase();
  if (/snack/.test(t)) return "🥐";
  if (/box/.test(t)) return "🍱";
  if (/stall|gubuk/.test(t)) return "🍢";
  if (/tumpeng|tampah/.test(t)) return "🍚";
  return "🍲";
}


/** "11.00–13.00" → "11.00"; teks bebas dibiarkan. */
const jamMulai = (jam: string) => jam.split(/[–-]/)[0].trim();

export function briefKonfirmasi(e: BriefEvent): string {
  const tanggal = [...new Set(e.items.map((i) => i.tanggal).filter((t): t is string => Boolean(t)))].sort();
  const mode = e.cara === "ambil" ? "Ambil" : e.cara === "setup_service" ? "Set-up & service" : "Tiba Di Lokasi";
  const jamPertama = e.items.find((i) => i.jam)?.jam;
  const out: string[] = ["🛎 *KONFIRMASI NEW ORDER: TISKA CATERING*", "", `*Nama Pemesan:* ${e.pemesan}`];
  if (e.pic && e.pic !== e.pemesan) out.push(`*PIC:* ${e.pic}`);
  if (e.hp) out.push(`*HP:* ${e.hp}`);
  if (e.acara) out.push(`*Acara:* ${e.acara}`);
  if (tanggal.length <= 1) out.push(`*Hari/Tanggal ${e.cara === "ambil" ? "Ambil" : "Acara"}:* ${tanggal[0] ? hariPanjang(tanggal[0]) : "-"}`);
  else out.push(`*Hari/Tanggal Acara:*`, ...tanggal.map((t) => `📆 ${hariPanjang(t)}`));
  if (jamPertama) out.push(`*Waktu ${e.cara === "ambil" ? "Ambil" : "Kirim"}:* ${jamMulai(jamPertama)} WIB - *${mode}*`);
  out.push(`*Alamat ${e.cara === "ambil" ? "Ambil" : "Lokasi kirim"}:*`);
  if (e.cara === "ambil") out.push("TISKA Catering");
  else {
    if (e.venue) out.push(`*${e.venue.toUpperCase()}*`);
    if (e.alamat) out.push(e.alamat.toUpperCase());
  }

  const perHari = new Map<string, BriefEvent["items"]>();
  for (const i of e.items) perHari.set(i.tanggal ?? "", [...(perHari.get(i.tanggal ?? "") ?? []), i]);
  const hari = [...perHari.keys()].sort((a, b) => (a || "9").localeCompare(b || "9"));
  hari.forEach((h, n) => {
    out.push(GARIS, hari.length > 1 ? `*ORDER:* *DAY* ${KEYCAP[n + 1] ?? n + 1}${h ? ` (${hariPanjang(h)})` : ""}` : "*ORDER:*");
    if (n === 0 && e.catatan) out.push("", `*${e.catatan}*`);
    let jamSebelum: string | null | undefined;
    for (const i of perHari.get(h)!) {
      const judulJam = i.jam ? `${jamMulai(i.jam)} - ${e.cara === "ambil" ? "Diambil" : "Tiba dilokasi"}` : i.sesi;
      if (judulJam !== jamSebelum && judulJam) out.push("", `*${i.jam ? `Pukul ${judulJam}` : judulJam}*`);
      else out.push("");
      jamSebelum = judulJam;
      const jumlah = teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }).toUpperCase();
      out.push(`${emoji(i.nama, i.unit)} *${i.nama.toUpperCase()}* = *${jumlah}*`);
      if (i.isi.length) out.push("Menu:", ...i.isi.map((m, k) => `${k + 1}. ${m}`));
    }
  });
  return out.join("\n");
}

/** "‼️ *UPDATE ke-n* — Pemesan (Acara)" + perubahan saja (07-BRIEF §3). */
export function briefUpdate(m: { ke: number; pemesan: string; acara: string | null; perubahan: string }): string {
  return [`‼️ *UPDATE ke-${m.ke}* — ${m.pemesan}${m.acara ? ` (${m.acara})` : ""}`, "", m.perubahan, "", "_Merujuk brief Konfirmasi New Order sebelumnya._"].join("\n");
}

export type BriefJadwalTim = {
  judul: string; // "IBU MAHYA-BSI Pajajaran"
  tanggal: string;
  picEo: string | null;
  kloter: {
    no: number;
    jam: string;
    catatan: string | null;
    anggota: { nama: string; peran: string; kendaraan: string | null; tugas: string | null }[];
  }[];
};

const LABEL_PERAN_BRIEF: Record<string, string> = { captain: "PIC", steward: "Steward", delivery_lauk: "Delivery Lauk", dw: "DW" };

/** "⚙️ *JADWAL TIM SERVICE [H]*" per tanggal (07-BRIEF §4). */
export function briefJadwalTim(b: BriefJadwalTim): string {
  const out = [`⚙️ *JADWAL TIM SERVICE [H]: ${b.judul.toUpperCase()}*`, "", `📆 *${hariPanjang(b.tanggal).replace(/ 0(\d) /, " $1 ")}*`];
  if (b.picEo) out.push(`*PIC EO:* ${b.picEo}`);
  b.kloter.forEach((k, i) => {
    if (i > 0) out.push("———————————————");
    out.push(`⏰ *[KLOTER-${k.no}] ${k.jam} WIB berangkat dr Julang*${k.catatan ? ` ${k.catatan}` : ""}`);
    if (k.anggota.length) {
      out.push("💁🏻‍♂️ *Tim:*");
      k.anggota.forEach((a, n) => {
        const kurung = [a.kendaraan, LABEL_PERAN_BRIEF[a.peran]].filter(Boolean).join(" - ");
        out.push(`${n + 1}. ${a.nama}${kurung ? ` (${kurung})` : ""}${a.tugas ? ` 👉🏻 ${a.tugas}` : ""}`);
      });
    }
  });
  return out.join("\n");
}

/* ---------- 5. Jadwal Persiapan Order (Kitchen, 07-BRIEF §5) ---------- */

export type SesiPersiapan = {
  judul: string; // "Mba Reka Telkomsat"
  siap: string; // jam berangkat / siap diambil, "07.00"
  ambil: boolean; // diambil klien → "Ready to pick-up + Invoice"
  packing: string; // "Doclang & Tampah", "100 box Bistik Ayam"
  menitMasak: number;
};

export const MENIT_PACKING = 30;

/** "07.00" ± menit → "06.30" (berputar lewat tengah malam). */
export function geserJam(jam: string, menit: number): string {
  const [h, m] = jam.split(/[.:]/).map(Number);
  const t = (((h * 60 + m + menit) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}.${String(t % 60).padStart(2, "0")}`;
}

/**
 * Dihitung mundur dari jam berangkat: packing 30 menit sebelum siap, masak
 * `menitMasak` sebelum packing. Durasi masak dipilih kepala dapur per sesi.
 */
export function briefPersiapan(b: { tanggal: string; besok: boolean; pemesan: string[]; sesi: SesiPersiapan[] }): string {
  const out = [`*JADWAL PERSIAPAN ORDER ${b.besok ? "BESOK" : "HARI INI"}:*`, `📆 *${hariPanjang(b.tanggal).replace(/ 0(\d) /, " $1 ")}*`];
  b.pemesan.forEach((p, i) => out.push(`${i + 1}. ${p}`));
  b.sesi.forEach((s, i) => {
    const packing = geserJam(s.siap, -MENIT_PACKING);
    const mulai = geserJam(packing, -s.menitMasak);
    out.push(
      "---------------------------",
      `👩🏻‍🍳👨🏻‍🍳 *Sesi Masak-${i + 1}; ${s.judul}:*`,
      `⏰*${mulai}-${packing}:* Estafet siap masak + matang`,
      `⏰*${packing}-${geserJam(s.siap, 0)}:* Nata + packing ${s.packing}`,
      `⏰ *${geserJam(s.siap, 0)}:* ${s.ambil ? "Ready to pick-up + Invoice" : "Siap brkt dr Julang"}`,
    );
  });
  return out.join("\n");
}
