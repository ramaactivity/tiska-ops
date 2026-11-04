import "server-only";

import type { Sesi } from "./auth";
import { cariSemua } from "./cari";
import { LABEL_PERAN } from "./navigasi";
import { pertanyaanUntuk } from "./tanya-data";

/* ==========================================================================
   TANYA TISKA (D-135) — asisten AI yang menjawab dari data aplikasi.

   Penyedia apa pun yang berbicara format OpenAI "chat/completions" + tools:
     AI_API_KEY   kunci (Gemini gratis dari aistudio.google.com/apikey, nanti kunci SumoPod)
     AI_BASE_URL  bawaan Gemini: https://generativelanguage.googleapis.com/v1beta/openai
                  SumoPod: https://ai.sumopod.com/v1 (cek dasbor SumoPod)
     AI_MODELS    daftar model dipisah koma, urut prioritas; dicoba berurutan bila kuota habis (429/5xx)
   Ganti penyedia = ganti tiga env ini, tanpa ubah kode.

   AI = juru bicara, bukan eksekutor: alatnya hanya MEMBACA lewat fungsi yang
   sama dengan halaman Cari Cepat (lib/cari, lib/tanya-data), sudah tersaring hak
   akses penanya. Tidak ada HPP / margin / untung yang pernah dikirim ke model.
   ========================================================================== */

const ALAMAT_BAWAAN = "https://generativelanguage.googleapis.com/v1beta/openai";
const MODEL_BAWAAN = ["gemini-2.5-flash", "gemini-flash-lite-latest"];
const MAKS_PUTARAN = 4;
const MAKS_RIWAYAT = 10;

export function konfigurasiAi(): { kunci: string; alamat: string; model: string[] } | null {
  const kunci = process.env.AI_API_KEY?.trim();
  if (!kunci) return null;
  const model = (process.env.AI_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return { kunci, alamat: (process.env.AI_BASE_URL?.trim() || ALAMAT_BAWAAN).replace(/\/$/, ""), model: model.length ? model : MODEL_BAWAAN };
}

export type PesanChat = { peran: "user" | "assistant"; isi: string };
type PesanApi =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

const namaAlat = (kunci: string) => kunci.replaceAll("-", "_");

function promptSistem(sesi: Sesi, hariIni: string): string {
  return [
    "Kamu adalah \"Tanya Tiska\", asisten internal Tiska Catering (PT. Tiska Cipta Imaji, Bogor) di aplikasi Tiska Ops.",
    `Hari ini ${hariIni} (WIB). Penanya: ${sesi.nama} (${LABEL_PERAN[sesi.peran] ?? sesi.peran}).`,
    "Aturan:",
    "- Jawab dalam bahasa Indonesia yang ramah dan ringkas, langsung ke intinya.",
    "- Semua fakta & angka WAJIB dari hasil alat (tools). Jangan mengarang data, harga, nama, atau tanggal. Kalau alat tidak memberi datanya, katakan terus terang belum ada datanya / di luar jangkauan, dan sebutkan menu aplikasi yang bisa dibuka.",
    "- Pakai alat cari_data untuk mencari customer, dokumen, menu, paket (harga jual), product, bahan (harga beli — hanya muncul bila penanya berhak), rekanan, vendor, aset, tagihan kantor.",
    "- Untuk tanggal relatif (minggu ini, bulan lalu, besok) hitung sendiri lalu isi dari/sampai format YYYY-MM-DD.",
    "- Uang ditulis Rp dengan titik ribuan tanpa desimal. Untuk daftar panjang, sebutkan yang terpenting saja (maks 10) lalu ringkas sisanya.",
    "- Kamu hanya bisa MEMBACA data. Jangan mengaku sudah mengubah, mengirim, atau mencatat apa pun.",
    "- Tidak pernah membahas HPP, harga modal, margin, atau untung.",
  ].join("\n");
}

async function panggilModel(cfg: NonNullable<ReturnType<typeof konfigurasiAi>>, pesan: PesanApi[], alat: unknown[]) {
  let galat = "";
  for (const model of cfg.model) {
    const r = await fetch(`${cfg.alamat}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.kunci}` },
      body: JSON.stringify({ model, messages: pesan, tools: alat, tool_choice: "auto", temperature: 0.2 }),
      signal: AbortSignal.timeout(30_000),
    }).catch((e: Error) => ({ ok: false, status: 0, text: async () => e.message }) as const);
    if (r.ok) {
      const j = (await (r as Response).json()) as { choices?: { message?: { content?: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] } }[] };
      const m = j.choices?.[0]?.message;
      if (m) return m;
      galat = "jawaban model kosong";
      continue;
    }
    galat = `${r.status} ${(await r.text()).slice(0, 200)}`;
    // Kuota habis / server sibuk → coba model berikutnya; galat lain (kunci salah, format) → berhenti.
    if (r.status !== 429 && r.status < 500 && r.status !== 0) break;
  }
  throw new Error(galat);
}

/** Jawab satu percakapan. Mengembalikan teks jawaban + alat yang dipakai (untuk ditampilkan "dicek dari …"). */
export async function tanyaAi(riwayat: PesanChat[], sesi: Sesi, hariIni: string): Promise<{ jawaban: string; alat: string[] }> {
  const cfg = konfigurasiAi();
  if (!cfg) throw new Error("AI belum diaktifkan.");
  const daftar = await pertanyaanUntuk(sesi);
  const alat = [
    {
      type: "function",
      function: {
        name: "cari_data",
        description: "Cari data apa saja di Tiska Ops (customer, quotation, invoice, payment, event, lead, paket+harga jual, product+harga jual, menu, bahan+harga beli bila berhak, rekanan, vendor, aset digital, tagihan kantor). Toleran salah ketik.",
        parameters: { type: "object", properties: { kata: { type: "string", description: "kata kunci, mis. nama customer / menu / nomor invoice" } }, required: ["kata"] },
      },
    },
    ...daftar.map((p) => ({
      type: "function",
      function: {
        name: namaAlat(p.kunci),
        description: p.untukAi,
        parameters: p.rentang
          ? { type: "object", properties: { dari: { type: "string", description: "YYYY-MM-DD" }, sampai: { type: "string", description: "YYYY-MM-DD" } } }
          : { type: "object", properties: {} },
      },
    })),
  ];

  const pesan: PesanApi[] = [
    { role: "system", content: promptSistem(sesi, hariIni) },
    ...riwayat.slice(-MAKS_RIWAYAT).map((m) => (m.peran === "user" ? { role: "user" as const, content: m.isi } : { role: "assistant" as const, content: m.isi })),
  ];
  const dipakai: string[] = [];
  for (let putaran = 0; putaran <= MAKS_PUTARAN; putaran++) {
    const m = await panggilModel(cfg, pesan, putaran < MAKS_PUTARAN ? alat : []);
    if (!m.tool_calls?.length) return { jawaban: (m.content ?? "").trim() || "Maaf, aku belum bisa menjawab itu.", alat: [...new Set(dipakai)] };
    pesan.push({ role: "assistant", content: m.content ?? null, tool_calls: m.tool_calls });
    for (const c of m.tool_calls) {
      let hasil: unknown;
      try {
        const arg = JSON.parse(c.function.arguments || "{}") as Record<string, string>;
        if (c.function.name === "cari_data") {
          dipakai.push("Cari Cepat");
          hasil = (await cariSemua(String(arg.kata ?? ""), sesi)).map((k) => ({ kelompok: k.label, hasil: k.hasil.map(({ judul, sub, nilai }) => ({ judul, sub, nilai })) }));
        } else {
          const p = daftar.find((x) => namaAlat(x.kunci) === c.function.name);
          if (!p) hasil = { galat: "Alat tidak dikenal atau penanya tidak berhak." };
          else {
            dipakai.push(p.label);
            const j = await p.jalankan(sesi, { dari: arg.dari, sampai: arg.sampai });
            hasil = { judul: j.judul, ringkasan: j.ringkasan, baris: j.baris.slice(0, 25).map(({ label, sub, nilai }) => ({ label, sub, nilai })) };
          }
        }
      } catch (e) {
        hasil = { galat: (e as Error).message };
      }
      pesan.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(hasil).slice(0, 12_000) });
    }
  }
  return { jawaban: "Maaf, pertanyaannya butuh terlalu banyak langkah. Coba dipersempit.", alat: [...new Set(dipakai)] };
}
