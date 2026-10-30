/* ==========================================================================
   FOTO MENU di browser (D-124/D-125) — unggah, kirim, unduh. Satu tempat
   untuk galeri, strip foto Paket/Quotation, dan tombol foto HP tim.
   ========================================================================== */

import { zipSync } from "fflate";

import { kecilkanGambar } from "./foto";
import { namaUnduhan } from "./hitung/foto-menu";

export type FotoKirim = { utama: string; tujuan: string | null };
type Slot = { kunci: string; kunciThumb: string; urlUtama: string; urlThumb: string };
export type DataUnggah = { kunci: string; kunciThumb: string; lebar: number; tinggi: number; namaAsli: string };

async function berkasFoto(daftar: FotoKirim[], judul: string): Promise<File[]> {
  return Promise.all(
    daftar.map(async (f, i) => {
      const r = await fetch(f.utama);
      if (!r.ok) throw new Error("Foto gagal diambil. Periksa sinyal.");
      return new File([await r.blob()], namaUnduhan(f.tujuan ?? judul, i + 1), { type: "image/jpeg" });
    }),
  );
}

function unduhBlob(blob: Blob, nama: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Unduh: satu foto = JPG, beberapa = satu ZIP. */
export async function unduhFoto(daftar: FotoKirim[], judul: string) {
  const berkas = await berkasFoto(daftar, judul);
  if (berkas.length === 1) return unduhBlob(berkas[0], berkas[0].name);
  const isi = Object.fromEntries(await Promise.all(berkas.map(async (b) => [b.name, new Uint8Array(await b.arrayBuffer())] as const)));
  unduhBlob(new Blob([zipSync(isi, { level: 0 }) as Uint8Array<ArrayBuffer>], { type: "application/zip" }), `${namaUnduhan(judul, 0).replace(/-0\.jpg$/, "")}.zip`);
}

/** Kirim lewat lembar bagikan HP/Mac (WhatsApp ada di sana); tanpa lembar bagikan → diunduh. Kembalian = catatan untuk pengguna. */
export async function kirimFoto(daftar: FotoKirim[], judul: string): Promise<string> {
  const berkas = await berkasFoto(daftar, judul);
  if (navigator.canShare?.({ files: berkas })) {
    try {
      await navigator.share({ files: berkas });
    } catch (e) {
      if ((e as Error).name !== "AbortError") throw e;
    }
    return "";
  }
  await unduhFoto(daftar, judul);
  return "Di laptop foto diunduh — lampirkan di WhatsApp Web.";
}

/**
 * Unggah banyak foto: dikecilkan di browser (utama ≤2048 px, thumbnail 480 px), dikirim langsung ke R2
 * lewat tautan sementara, lalu dicatat. Per 10 foto. Nama asli = jalur folder bila dipilih dari folder.
 */
export async function unggahBanyak(
  berkas: File[],
  minta: (n: number) => Promise<{ ok: true; slot: Slot[] } | { ok: false; pesan: string }>,
  simpan: (data: DataUnggah[]) => Promise<{ ok: boolean; pesan: string }>,
  kemajuan: (selesai: number, total: number) => void,
): Promise<{ berhasil: number; gagal: string[] }> {
  const gambar = berkas.filter((b) => b.type.startsWith("image/"));
  let berhasil = 0;
  const gagal: string[] = [];
  for (let i = 0; i < gambar.length; i += 10) {
    const potong = gambar.slice(i, i + 10);
    const nama = (b: File) => (b.webkitRelativePath || b.name).slice(0, 255);
    try {
      const kecil = await Promise.all(
        potong.map((b) =>
          Promise.all([kecilkanGambar(b, 2048, 0.82), kecilkanGambar(b, 480, 0.72)])
            .then(([utama, thumb]) => ({ b, utama, thumb }))
            .catch(() => null),
        ),
      );
      kecil.forEach((k, j) => !k && gagal.push(nama(potong[j])));
      const siap = kecil.filter((k): k is NonNullable<typeof k> => k !== null);
      if (siap.length) {
        const slot = await minta(siap.length);
        if (!slot.ok) throw new Error(slot.pesan);
        const terkirim = await Promise.all(
          siap.map(async (k, j) => {
            const s = slot.slot[j];
            const [a, t] = await Promise.all([
              fetch(s.urlUtama, { method: "PUT", body: k.utama.blob, headers: { "content-type": "image/jpeg" } }),
              fetch(s.urlThumb, { method: "PUT", body: k.thumb.blob, headers: { "content-type": "image/jpeg" } }),
            ]);
            if (!a.ok || !t.ok) return (gagal.push(nama(k.b)), null);
            return { kunci: s.kunci, kunciThumb: s.kunciThumb, lebar: k.utama.lebar, tinggi: k.utama.tinggi, namaAsli: nama(k.b) };
          }),
        );
        const sah = terkirim.filter((x): x is DataUnggah => x !== null);
        if (sah.length) {
          const r = await simpan(sah);
          if (r.ok) berhasil += sah.length;
          else gagal.push(...sah.map((x) => x.namaAsli));
        }
      }
    } catch {
      gagal.push(...potong.map(nama));
    }
    kemajuan(Math.min(i + 10, gambar.length), gambar.length);
  }
  return { berhasil, gagal };
}
