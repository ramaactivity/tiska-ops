import { jwtVerify, type JWTPayload, SignJWT } from "jose";

/* ==========================================================================
   TOKEN SESI (dipakai lib/auth.ts dan proxy.ts — tanpa next/headers)

   Sesi 7 hari yang DIPERPANJANG selama dipakai (D-110, Rama): token yang
   sudah berumur > 1 hari ditandatangani ulang oleh proxy setiap kali
   aplikasi dibuka. 7 hari tidak dibuka sama sekali = keluar sendiri.
   Akun nonaktif / peran turun tetap langsung berlaku: setiap halaman
   membaca ulang penggunanya dari database (penggunaAktif).
   ========================================================================== */

export const NAMA_COOKIE_SESI = "sesi_tc";
export const UMUR_SESI_DETIK = 60 * 60 * 24 * 7;
export const PERBARUI_SETELAH_DETIK = 60 * 60 * 24;

export function kunciSesi(): Uint8Array {
  const rahasia = process.env.AUTH_SECRET;
  if (!rahasia) throw new Error("AUTH_SECRET belum diisi. Tanpa ini cookie sesi tidak bisa ditandatangani.");
  return new TextEncoder().encode(rahasia);
}

export const opsiCookieSesi = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: UMUR_SESI_DETIK,
};

export function tandatanganiSesi(isi: Record<string, unknown>): Promise<string> {
  return new SignJWT(isi).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${UMUR_SESI_DETIK}s`).sign(kunciSesi());
}

/** Isi token yang sah; null bila kedaluwarsa / tanda tangan salah. */
export async function bacaTokenSesi(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    return (await jwtVerify(token, kunciSesi(), { algorithms: ["HS256"] })).payload;
  } catch {
    return null;
  }
}

/** Token sah yang sudah waktunya diperpanjang → token baru; selain itu null. */
export async function perpanjangTokenSesi(token: string | undefined, sekarangDetik = Math.floor(Date.now() / 1000)): Promise<string | null> {
  const isi = await bacaTokenSesi(token);
  if (!isi?.iat || sekarangDetik - isi.iat < PERBARUI_SETELAH_DETIK) return null;
  const sisa: Record<string, unknown> = { ...isi };
  delete sisa.iat;
  delete sisa.exp;
  return tandatanganiSesi(sisa);
}
