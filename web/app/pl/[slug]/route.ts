import { NextResponse } from "next/server";

import { tautanUnduh } from "@/lib/pricelist-berkas";
import { prisma } from "@/lib/prisma";

/**
 * Link permanen pricelist untuk klien: /pl/<slug> (tanpa login, D-035).
 *
 * Selalu menuju versi AKTIF — link yang sudah terkirim ke klien tidak perlu
 * diganti saat pricelist diperbarui. Versi ringan dipakai bila ada (hemat
 * kuota HP); ?versi=asli untuk berkas kualitas penuh. Pricelist arsip tidak
 * dibuka: klien diarahkan menghubungi admin.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const asli = new URL(request.url).searchParams.get("versi") === "asli";

  const p = await prisma.pricelists.findUnique({
    where: { slug },
    select: {
      name: true,
      status: true,
      pricelist_files: { where: { is_active: true }, select: { file_path: true, light_path: true }, take: 1 },
    },
  });
  const berkas = p?.pricelist_files[0];
  if (!p || p.status !== "aktif" || !berkas) {
    return new NextResponse(halamanTidakBerlaku(p?.name), {
      status: p ? 410 : 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  const tautan = await tautanUnduh(!asli && berkas.light_path ? berkas.light_path : berkas.file_path);
  return NextResponse.redirect(tautan, { status: 302, headers: { "cache-control": "no-store" } });
}

function halamanTidakBerlaku(nama?: string): string {
  const judul = nama ? `Pricelist ${nama} sedang tidak berlaku` : "Pricelist tidak ditemukan";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${judul} · Tiska Catering</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#faf8f4;color:#1f2a24;display:grid;place-items:center;min-height:100dvh;padding:24px}
main{max-width:22rem}h1{font-size:1.2rem;margin:0 0 .5rem}p{color:#5b6660;line-height:1.5}a{display:inline-block;margin-top:1rem;padding:.7rem 1.2rem;border-radius:999px;background:#1f4d38;color:#fff;text-decoration:none}</style></head>
<body><main><h1>${judul}</h1><p>Silakan hubungi admin Tiska Catering untuk mendapatkan pricelist terbaru.</p>
<a href="https://wa.me/6281383108103">Chat admin di WhatsApp</a></main></body></html>`;
}
