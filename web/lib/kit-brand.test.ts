import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FOLDER_UNDUH, FOTO_PROFIL, LOGO, LOGO_SPONSOR, WARNA, ZIP_LOGO } from "./kit-brand";

const SEMUA = [...LOGO, ...FOTO_PROFIL, ...LOGO_SPONSOR];

/* Tombol unduh yang menunjuk file hilang baru ketahuan saat tim butuh logonya buru-buru. */
const folder = path.join(__dirname, "..", "public", FOLDER_UNDUH);

describe("kit brand (D-226)", () => {
  it("setiap logo yang ditampilkan ada filenya, ukurannya sesuai yang tertulis", () => {
    for (const l of SEMUA) {
      const isi = readFileSync(path.join(folder, l.file));
      // PNG: lebar & tinggi di header IHDR (byte 16–23).
      expect([isi.readUInt32BE(16), isi.readUInt32BE(20)], l.file).toEqual([l.lebar, l.tinggi]);
    }
  });

  it("ZIP berisi semua file yang ditampilkan dan ukurannya sesuai label", () => {
    const zip = readFileSync(path.join(folder, ZIP_LOGO.file));
    for (const l of SEMUA) expect(zip.includes(Buffer.from(l.file)), l.file).toBe(true);
    const mb = statSync(path.join(folder, ZIP_LOGO.file)).size / 1_000_000;
    expect(ZIP_LOGO.ukuran).toBe(`${mb.toFixed(1).replace(".", ",")} MB`);
  });

  it("kode warna berbentuk #RRGGBB dan tidak kembar", () => {
    for (const w of WARNA) expect(w.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(WARNA.map((w) => w.hex)).size).toBe(WARNA.length);
  });
});
