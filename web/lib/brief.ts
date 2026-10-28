/* ==========================================================================
   BRIEF GRUP TIM (07-BRIEF-TEMPLATES.md, D-050). Murni.

   Format mengikuti brief yang selama ini dikirim admin ke grup "NEW Tim
   Kitchen/Captain TISKA" (contoh terbaru Okt 2026, D-112): *tebal* WA, emoji,
   "09.20 brkt dr Julang 👉🏻 10.00 WIB - tiba di lokasi" (jam berangkat dari
   kloter yang sudah dijadwalkan), garis pemisah, DAY n keycap bila
   multi-hari, item = nama apa adanya + jumlah, isi bernomor.
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
  /** Jam berangkat kloter dari Julang per tanggal (D-112) — ada setelah order dijadwalkan. */
  berangkat?: { tanggal: string; jam: string }[];
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

function hariPanjang(t: string, hariDuaDigit = true): string {
  const [y, m, d] = t.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: hariDuaDigit ? "2-digit" : "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
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
  const ambil = e.cara === "ambil";
  const tanggal = [...new Set(e.items.map((i) => i.tanggal).filter((t): t is string => Boolean(t)))].sort();
  const label = ambil ? "Ambil" : e.cara === "setup_service" ? "Acara" : "Kirim";
  const tgl = (t: string) => hariPanjang(t, false);
  const out: string[] = ["🛎️ *KONFIRMASI NEW ORDER: @TISKA CATERING*", "", `*Nama Pemesan:* ${e.pemesan}`];
  if (e.pic && e.pic !== e.pemesan) out.push(`*PIC:* ${e.pic}`);
  if (e.hp) out.push(`*HP:* ${e.hp}`);
  if (e.acara) out.push(`*Acara:* ${e.acara}`);
  if (tanggal.length <= 1) out.push(`*Hari/Tgl ${label}:* ${tanggal[0] ? tgl(tanggal[0]) : "-"}`);
  else out.push(`*Hari/Tgl ${label}:*`, ...tanggal.map((t) => `📆 ${tgl(t)}`));

  // Waktu: "09.20 brkt dr Julang 👉🏻 10.00 WIB - tiba di lokasi" (hari pertama).
  const hariPertama = tanggal[0] ?? null;
  // Jam paling awal: kloter pertama berangkat → kiriman pertama tiba.
  const jamHari1 = e.items.filter((i) => i.jam && (i.tanggal ?? null) === hariPertama).map((i) => jamMulai(i.jam!)).sort();
  const tiba = jamHari1[0] ?? e.items.map((i) => i.jam && jamMulai(i.jam)).filter(Boolean).sort()[0];
  const brkt = (e.berangkat ?? []).filter((k) => !hariPertama || k.tanggal === hariPertama).map((k) => jamMulai(k.jam)).sort().slice(0, 1);
  if (ambil) {
    if (tiba) out.push(`*Waktu Ambil:* ${tiba} WIB`);
  } else if (brkt.length || tiba) {
    const pergi = brkt.length ? `${brkt[0]}${tiba ? "" : " WIB"} brkt dr Julang` : "";
    const sampai = tiba ? `${tiba} WIB - tiba di lokasi` : "";
    out.push(`*Waktu ${label}:* ${[pergi, sampai].filter(Boolean).join(" 👉🏻 ")}`);
  }
  out.push(`*Alamat ${ambil ? "Ambil" : "Kirim"}:*`);
  if (ambil) out.push("TISKA Catering");
  else out.push(...[e.venue, e.alamat].filter((x): x is string => Boolean(x && x.trim())));

  const perHari = new Map<string, BriefEvent["items"]>();
  for (const i of e.items) perHari.set(i.tanggal ?? "", [...(perHari.get(i.tanggal ?? "") ?? []), i]);
  const hari = [...perHari.keys()].sort((a, b) => (a || "9").localeCompare(b || "9"));
  hari.forEach((h, n) => {
    out.push(GARIS, hari.length > 1 ? `*ORDER:* *DAY* ${KEYCAP[n + 1] ?? n + 1}${h ? ` (${tgl(h)})` : ""}` : "*ORDER:*");
    if (n === 0 && e.catatan) out.push("", `*${e.catatan}*`);
    // Urut jam (stabil; tanpa jam di akhir) supaya judul Pukul tidak terpecah/terbalik.
    const isiHari = perHari.get(h)!.toSorted((a, b) => (a.jam ? jamMulai(a.jam) : "~").localeCompare(b.jam ? jamMulai(b.jam) : "~"));
    // Judul jam hanya bila sehari ada lebih dari satu jam kirim.
    const banyakJam = new Set(isiHari.map((i) => i.jam ?? i.sesi)).size > 1;
    let jamSebelum: string | null | undefined;
    for (const i of isiHari) {
      const judulJam = i.jam ? `Pukul ${jamMulai(i.jam)} - ${ambil ? "diambil" : "tiba di lokasi"}` : i.sesi;
      if (banyakJam && judulJam && judulJam !== jamSebelum) out.push("", `*${judulJam}*`);
      jamSebelum = judulJam;
      const jumlah = teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" });
      out.push(`${emoji(i.nama, i.unit)} *${i.nama} = ${jumlah}*`, ...i.isi.map((m, k) => `${k + 1}. ${m}`));
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
