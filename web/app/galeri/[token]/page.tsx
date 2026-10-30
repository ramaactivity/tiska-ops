import type { Metadata } from "next";

import { LogoTiska } from "@/components/logo-tiska";
import { penggunaAktif } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { alamatPublik } from "@/lib/r2";

import { GaleriKlien } from "./galeri-klien";

export const dynamic = "force-dynamic";

async function bacaLink(token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const l = await prisma.menu_galleries.findUnique({ where: { token }, select: { recipient: true, photo_ids: true, expires_at: true, disabled_at: true } });
  if (!l || l.disabled_at || l.expires_at <= new Date()) return null;
  // Foto yang sesudahnya disembunyikan/dihapus ikut hilang dari link.
  const foto = await prisma.menu_photos.findMany({
    where: { id: { in: l.photo_ids }, hidden: false },
    select: { id: true, file_key: true, thumb_key: true, caption: true, menus: { select: { name: true } }, packages: { select: { code: true, name: true } } },
  });
  const urut = new Map(l.photo_ids.map((id, i) => [id.toString(), i]));
  foto.sort((a, b) => urut.get(a.id.toString())! - urut.get(b.id.toString())!);
  return { untuk: l.recipient, foto };
}

export async function generateMetadata({ params }: PageProps<"/galeri/[token]">): Promise<Metadata> {
  const link = await bacaLink((await params).token);
  return {
    title: { absolute: "Foto Menu · Tiska Catering" },
    robots: { index: false, follow: false },
    // Pratinjau di WhatsApp: foto pertama.
    openGraph: link?.foto[0] ? { title: "Foto Menu · Tiska Catering", images: [alamatPublik(link.foto[0].thumb_key)] } : undefined,
  };
}

/* Link galeri untuk klien (D-126): foto pilihan admin per menu, tanpa login, TANPA harga. */
export default async function HalamanGaleriKlien({ params }: PageProps<"/galeri/[token]">) {
  const { token } = await params;
  const link = await bacaLink(token);
  const kelompok = new Map<string, { judul: string; foto: { id: string; thumb: string; utama: string; keterangan: string | null }[] }>();
  for (const f of link?.foto ?? []) {
    const judul = f.menus?.name ?? (f.packages ? `${f.packages.code} ${f.packages.name}` : "Foto lainnya");
    if (!kelompok.has(judul)) kelompok.set(judul, { judul, foto: [] });
    kelompok.get(judul)!.foto.push({ id: f.id.toString(), thumb: alamatPublik(f.thumb_key), utama: alamatPublik(f.file_key), keterangan: f.caption });
  }

  return (
    <main className="min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <LogoTiska tinggi={56} />
        {link && kelompok.size ? (
          <GaleriKlien token={token} untuk={link.untuk} kelompok={[...kelompok.values()]} catat={!(await penggunaAktif())} />
        ) : (
          <section className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold">Link foto sudah tidak berlaku</h1>
            <p className="mt-1 text-[0.9375rem] text-muted-foreground">Silakan minta link baru ke admin Tiska Catering lewat WhatsApp.</p>
          </section>
        )}
      </div>
    </main>
  );
}
