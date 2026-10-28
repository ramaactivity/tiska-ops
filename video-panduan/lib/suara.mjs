// Narasi per langkah. Urutan sumber suara:
//   1. episode/<ep>/suara/NN.mp3 (atau .wav) — suara buatan sendiri (ElevenLabs, Magnific, rekaman manusia)
//   2. suara AI otomatis (Microsoft Edge neural "Gadis"), disimpan di cache/tts menurut isi teksnya
// Teks semua langkah juga ditulis ke episode/<ep>/narasi.txt untuk dibawa ke ElevenLabs/Magnific.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EDGE = path.join(AKAR, ".venv/bin/edge-tts");
export const SUARA_AI = { suara: "id-ID-GadisNeural", laju: "-8%" };

const durasi = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

export function siapkanSuara(epDir, langkah) {
  mkdirSync(path.join(AKAR, "cache/tts"), { recursive: true });
  writeFileSync(path.join(epDir, "narasi.txt"), langkah.map((l, i) => `${String(i + 1).padStart(2, "0")}\t${l.narasi}`).join("\n") + "\n");
  return langkah.map((l, i) => {
    const nn = String(i + 1).padStart(2, "0");
    for (const ext of ["mp3", "wav", "m4a"]) { const f = path.join(epDir, "suara", `${nn}.${ext}`); if (existsSync(f)) return { file: f, durasi: durasi(f), sumber: "manual" }; }
    const h = createHash("sha1").update(`${SUARA_AI.suara}|${SUARA_AI.laju}|${l.narasi}`).digest("hex").slice(0, 16);
    const f = path.join(AKAR, "cache/tts", `${h}.mp3`);
    if (!existsSync(f)) execFileSync(EDGE, ["--voice", SUARA_AI.suara, `--rate=${SUARA_AI.laju}`, "--text", l.narasi, "--write-media", f]);
    return { file: f, durasi: durasi(f), sumber: "ai" };
  });
}
