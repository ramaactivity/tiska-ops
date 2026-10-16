import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Bucket "bukti" TERTUTUP (D-044): screenshot WA / foto dokumen bertanda
 * tangan persetujuan klien. Keluar hanya lewat tautan bertanda tangan.
 */
const BUCKET = "bukti";

function klien() {
  const url = process.env.SUPABASE_URL;
  const kunci = process.env.SUPABASE_SECRET_KEY;
  if (!url || !kunci) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY belum diisi.");
  return createClient(url, kunci, { auth: { persistSession: false } });
}

export async function tautanUnduhBukti(jalur: string, detik = 300): Promise<string> {
  const { data, error } = await klien().storage.from(BUCKET).createSignedUrl(jalur, detik);
  if (error || !data) throw new Error(`Tautan bukti gagal dibuat: ${error?.message}`);
  return data.signedUrl;
}

export async function tautanUnggahBukti(jalur: string): Promise<string> {
  const { data, error } = await klien().storage.from(BUCKET).createSignedUploadUrl(jalur, { upsert: true });
  if (error || !data) throw new Error(`Tautan unggah gagal dibuat: ${error?.message}`);
  return data.signedUrl;
}

export async function buktiTersimpan(jalur: string): Promise<boolean> {
  const folder = jalur.split("/").slice(0, -1).join("/");
  const nama = jalur.split("/").at(-1);
  const { data } = await klien().storage.from(BUCKET).list(folder, { search: nama });
  return Boolean(data?.some((d) => d.name === nama));
}

/** Menghapus berkas bukti (dipakai saat data tes dibersihkan). Gagal = diabaikan, berkas yatim tidak berbahaya. */
export async function hapusBukti(jalur: string[]): Promise<void> {
  if (jalur.length) await klien().storage.from(BUCKET).remove(jalur);
}
