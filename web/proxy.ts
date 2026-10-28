import { type NextRequest, NextResponse } from "next/server";

import { NAMA_COOKIE_SESI, opsiCookieSesi, perpanjangTokenSesi } from "@/lib/token-sesi";

/**
 * Sesi diperpanjang selama aplikasi dipakai (D-110): token berumur > 1 hari
 * ditandatangani ulang untuk 7 hari lagi. Tidak memeriksa hak akses — itu
 * tetap di setiap halaman (penggunaAktif, dibaca dari database).
 */
export async function proxy(request: NextRequest) {
  const baru = await perpanjangTokenSesi(request.cookies.get(NAMA_COOKIE_SESI)?.value);
  const res = NextResponse.next();
  if (baru) res.cookies.set(NAMA_COOKIE_SESI, baru, opsiCookieSesi);
  return res;
}

export const config = {
  // Halaman & aksi saja; berkas statis, gambar, dan service worker tidak perlu.
  matcher: ["/((?!_next/static|_next/image|favicon|ikon/|wajah/|brand/|sw.js|manifest|offline.html).*)"],
};
