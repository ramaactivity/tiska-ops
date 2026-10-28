import { prisma } from "@/lib/prisma";

/**
 * GET /avatar/foto/<token> → foto profil asli (D-113). Tanpa sesi, karena layar masuk
 * menampilkan wajah akun di HP itu; tokennya acak 128-bit dan berganti tiap foto
 * diganti, jadi boleh di-cache selamanya (DB dibaca sekali per foto per CDN).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const foto = /^[a-f0-9]{32}$/.test(token) ? await prisma.user_photos.findUnique({ where: { token } }) : null;
  if (!foto) return new Response("Tidak ditemukan.", { status: 404 });
  return new Response(new Uint8Array(foto.data), {
    headers: { "Content-Type": foto.content_type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
