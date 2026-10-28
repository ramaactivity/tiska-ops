// Membuat satu video panduan dari naskahnya:  node buat.mjs <episode> [--tanpa-rekam] [--draf]
//   --tanpa-rekam  pakai rekaman terakhir (hanya ubah narasi/tampilan)   --draf  render 30 fps (cepat, untuk dicek)
//   --tanpa-render pakai video tanpa suara terakhir (hanya ulang campuran audio)
// Butuh: server lokal Tiska Ops di :3100 dengan jam pura-pura (lihat README), ffmpeg, Chromium Playwright.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rekam } from "./lib/rekam.mjs";
import { siapkanSuara } from "./lib/suara.mjs";
import { prisma } from "./lib/data.mjs";

const AKAR = path.dirname(fileURLToPath(import.meta.url));
const [nama, ...opsi] = process.argv.slice(2);
if (!nama) { console.log("pakai: node buat.mjs <episode> [--tanpa-rekam] [--draf]"); process.exit(1); }
const EPD = path.join(AKAR, "episode", nama), OUT = path.join(AKAR, "keluaran", nama);
const ep = (await import(path.join(EPD, "naskah.mjs"))).default;
mkdirSync(OUT, { recursive: true });
const jalan = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` } });

// 1. rekam aplikasi asli (data demo disiapkan lalu SELALU dikembalikan, akun dummy selalu dihapus)
if (!opsi.includes("--tanpa-rekam")) {
  console.log("▶ merekam", nama);
  await ep.siapkan?.();
  try { await rekam(ep, OUT); } finally { await ep.bersihkan?.(); await prisma.users.deleteMany({ where: { username: ep.akun } }).catch(() => {}); }
}
await prisma.$disconnect();
const rek = JSON.parse(readFileSync(path.join(OUT, "rekaman.json"), "utf8"));

// 2. narasi
console.log("▶ narasi");
const suara = siapkanSuara(EPD, ep.langkah);
suara.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2, "0")} ${s.durasi.toFixed(1)} s (${s.sumber})`));

// 3. jadwal — satu sumber untuk gambar dan suara
const PEMBUKA = 3.6, frame = [], langkah = [];
let t = PEMBUKA - 0.2;
frame.push({ t: 0, f: rek.langkah[0].gulir[0] || rek.langkah[0].tampil, instan: true });
rek.langkah.forEach((l, i) => {
  const mulai = t;
  for (const g of l.gulir) { frame.push({ t, f: g, instan: true }); t += 1 / 60; }
  frame.push({ t, f: l.tampil, instan: l.gulir.length > 0 });
  const narasi = t + 0.35, akhirNarasi = narasi + suara[i].durasi;
  const S = 416 / rek.viewport.width;
  const zoom = l.zoom ?? (l.sorot ? Math.min(1.35, Math.max(1, 380 / (l.sorot.h * S))) : 1);
  let tekan = null, selesai = akhirNarasi + 0.75;
  if (l.ketuk) {
    tekan = akhirNarasi + 0.6; selesai = tekan + 0.6;
    const n = rek.langkah[i + 1]; frame.push({ t: tekan + 0.3, f: n ? (n.gulir[0] || n.tampil) : rek.akhir });
  }
  langkah.push({ mulai, narasi, selesai, tekan, teks: l.narasi, sorot: l.sorot, ketuk: l.ketuk, zoom });
  t = selesai;
});
frame.push({ t, f: rek.akhir });
const penutup = t + 0.8, durasi = penutup + 1.4 + ep.ringkasan.length * 0.5 + 4.2;
const jadwal = { pembuka: PEMBUKA, penutup, durasi, frame, langkah };

// 4. rakit halaman komposer (font & logo ditanam)
// HP = video tegak 9:16 (ditonton di HP); laptop = 16:9
const html = readFileSync(path.join(AKAR, ep.layar === "hp" ? "lib/komposer-hp.html" : "lib/komposer.html"), "utf8")
  .replace("/*FONTS*/", readFileSync(path.join(AKAR, "lib/fonts.css"), "utf8"))
  .replace('"/*LOGO*/"', JSON.stringify("data:image/png;base64," + readFileSync(path.join(AKAR, "lib/logo-emas.png")).toString("base64")))
  .replace("/*DATA*/null", JSON.stringify({ jadwal, rekaman: rek, ep: { judul: ep.judul, divisi: ep.divisi, bagian: ep.bagian, ringkasan: ep.ringkasan, berikutnya: ep.berikutnya } }));
writeFileSync(path.join(OUT, "komposer.html"), html);
console.log(`▶ jadwal: ${langkah.length} langkah, durasi ${durasi.toFixed(1)} s`);

// 5. render gambar
const draf = opsi.includes("--draf"), mp4 = path.join(OUT, `${nama}.mp4`);
if (!opsi.includes("--tanpa-render")) jalan("node", [path.join(AKAR, "lib/render.mjs"), path.join(OUT, "komposer.html"), mp4, draf ? "30" : "60", "1", "7"]);

// 6. suara: narasi + efek CC0 + musik pelan yang mengecil saat ada narasi
const MUSIK = path.join(AKAR, "cache/musik-493.mp3"); // "Beautiful Dream" — Diego Nava, Mixkit Stock Music Free License (diunduh, tidak di-commit)
if (!existsSync(MUSIK)) jalan("curl", ["-fsSL", "-o", MUSIK, "https://assets.mixkit.co/music/493/493.mp3"]);
const efek = [["whoosh", PEMBUKA - 0.45, 0.5], ["pop", 0.35, 0.4], ["whoosh", penutup - 0.1, 0.45]];
langkah.forEach((l) => { efek.push(["tick", l.narasi - 0.3, 0.18]); if (l.tekan) efek.push(["click", l.tekan, 0.7]); });
const sunyi = mp4.replace(/\.mp4$/, "_silent.mp4"), akhir = path.join(OUT, `${nama}-final.mp4`);
const vWav = path.join(OUT, "narasi.wav"), fWav = path.join(OUT, "efek.wav"), aWav = path.join(OUT, "suara.wav");
const ff = (args) => jalan("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args]);
// Tiap lapis dicampur ke WAV sendiri dulu: membelah satu aliran (asplit) lalu menyatukannya lagi membuat ffmpeg macet.
const lapis = (daftar, keluar) => {
  const m = [], f = [];
  daftar.forEach(([file, at, vol], k) => { m.push("-i", file); f.push(`[${k}:a]adelay=${Math.max(0, Math.round(at * 1000))}:all=1,volume=${vol},aresample=48000,aformat=channel_layouts=stereo[x${k}]`); });
  f.push(`${daftar.map((_, k) => `[x${k}]`).join("")}amix=inputs=${daftar.length}:normalize=0,apad[o]`);
  ff([...m, "-filter_complex", f.join(";"), "-map", "[o]", "-t", durasi.toFixed(2), "-c:a", "pcm_s16le", keluar]);
};
lapis(suara.map((s, i) => [s.file, langkah[i].narasi, 1]), vWav);
lapis(efek.map(([f, at, vol]) => [path.join(AKAR, "lib/sfx", `${f}.ogg`), at, vol]), fWav);
// musik pelan, mengecil otomatis saat narasi (sidechain dari salinan kedua narasi.wav), lalu dinormalkan ke -16 LUFS
ff(["-i", vWav, "-i", vWav, "-i", fWav, "-i", MUSIK, "-filter_complex",
  `[3:a]atrim=0:${durasi.toFixed(2)},asetpts=N/SR/TB,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=1.5,afade=t=out:st=${(durasi - 3).toFixed(2)}:d=3,volume=0.32[mu];` +
  `[mu][1:a]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=600[mud];` +
  `[0:a][2:a][mud]amix=inputs=3:normalize=0,loudnorm=I=-16:TP=-4.5:LRA=11,aresample=48000[a]`,
  "-map", "[a]", "-t", durasi.toFixed(2), "-c:a", "pcm_s16le", aWav]);
ff(["-i", sunyi, "-i", aWav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", akhir]);

// 7. ukur loudness di MP4 akhir (target ±-16 LUFS, puncak < -4 dBFS)
const { spawnSync } = await import("node:child_process");
const u = spawnSync("ffmpeg", ["-nostats", "-i", akhir, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` } }).stderr;
const ringkas = u.slice(u.lastIndexOf("Summary:"));
console.log(`▶ loudness: ${(ringkas.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]} LUFS, puncak ${(ringkas.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1]} dBFS`);
console.log("▶ selesai:", akhir);
