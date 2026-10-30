import "server-only";

import { AwsClient } from "aws4fetch";

/* ==========================================================================
   CLOUDFLARE R2 (D-124) — penyimpanan foto menu (bucket tiska-ops-foto).
   Media tidak di Supabase Storage: kuota gratis dihitung per organisasi dan
   pernah jebol karena media. R2: unduhan gratis.
   ========================================================================== */

function konfigurasi() {
  const { R2_ACCOUNT_ID: akun, R2_ACCESS_KEY_ID: kunci, R2_SECRET_ACCESS_KEY: rahasia, R2_BUCKET: bucket, R2_PUBLIC_URL: publik } = process.env;
  if (!akun || !kunci || !rahasia || !bucket || !publik) throw new Error("R2 belum diatur (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL).");
  return {
    klien: new AwsClient({ accessKeyId: kunci, secretAccessKey: rahasia, service: "s3", region: "auto" }),
    dasar: `https://${akun}.r2.cloudflarestorage.com/${bucket}`,
    publik: publik.replace(/\/$/, ""),
  };
}

/** Alamat publik berkas (kunci acak, tidak bisa ditebak). */
export function alamatPublik(kunci: string): string {
  return `${konfigurasi().publik}/${kunci}`;
}

/** Tautan unggah sementara (PUT langsung dari browser, 10 menit) — tidak lewat batas ukuran Vercel. */
export async function tautanUnggah(kunci: string, jenis: string): Promise<string> {
  const { klien, dasar } = konfigurasi();
  const r = await klien.sign(new Request(`${dasar}/${kunci}?X-Amz-Expires=600`, { method: "PUT", headers: { "content-type": jenis } }), {
    aws: { signQuery: true },
  });
  return r.url;
}

/** Ukuran berkas di R2, atau null bila tidak ada — memastikan unggahan benar-benar sampai sebelum dicatat. */
export async function ukuranBerkas(kunci: string): Promise<number | null> {
  const { klien, dasar } = konfigurasi();
  const r = await klien.fetch(`${dasar}/${kunci}`, { method: "HEAD" });
  return r.ok ? Number(r.headers.get("content-length") ?? 0) : null;
}

export async function hapusBerkas(kunci: string[]): Promise<void> {
  const { klien, dasar } = konfigurasi();
  await Promise.all(kunci.map((k) => klien.fetch(`${dasar}/${k}`, { method: "DELETE" })));
}
