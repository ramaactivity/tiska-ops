import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Bucket "pricelist" TERTUTUP (D-035): berkas hanya keluar lewat tautan
 * bertanda tangan berumur pendek, jadi versi lama/arsip tidak beredar dan
 * link permanen /pl/<slug> selalu menunjuk versi aktif.
 */
const BUCKET = "pricelist";

function klien() {
  const url = process.env.SUPABASE_URL;
  const kunci = process.env.SUPABASE_SECRET_KEY;
  if (!url || !kunci) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY belum diisi.");
  return createClient(url, kunci, { auth: { persistSession: false } });
}

export async function tautanUnduh(jalur: string, detik = 600): Promise<string> {
  const { data, error } = await klien().storage.from(BUCKET).createSignedUrl(jalur, detik);
  if (error || !data) throw new Error(`Tautan berkas gagal dibuat: ${error?.message}`);
  return data.signedUrl;
}

/** Tautan unggah sekali pakai — browser mengunggah langsung (berkas > batas 4,5 MB Vercel). */
export async function tautanUnggah(jalur: string): Promise<string> {
  const { data, error } = await klien().storage.from(BUCKET).createSignedUploadUrl(jalur, { upsert: true });
  if (error || !data) throw new Error(`Tautan unggah gagal dibuat: ${error?.message}`);
  return data.signedUrl;
}

/** Ukuran berkas yang benar-benar tersimpan (memastikan unggahan sampai). */
export async function ukuranTersimpan(jalur: string): Promise<number | null> {
  const folder = jalur.split("/").slice(0, -1).join("/");
  const nama = jalur.split("/").at(-1);
  const { data } = await klien().storage.from(BUCKET).list(folder, { search: nama });
  const berkas = data?.find((d) => d.name === nama);
  return berkas?.metadata?.size ?? null;
}
