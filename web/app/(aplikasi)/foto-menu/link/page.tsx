import { ChevronLeft, Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { AksiLink } from "./aksi-link";

export const metadata: Metadata = { title: "Link galeri" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

/* Link galeri yang pernah dibuat (D-126): untuk siapa, sudah dibuka klien atau belum, salin ulang, matikan. */
export default async function HalamanLinkGaleri() {
  await wajibIzin("foto-menu");
  const link = await prisma.menu_galleries.findMany({
    orderBy: { id: "desc" },
    take: 200,
    select: { id: true, token: true, recipient: true, photo_ids: true, created_at: true, expires_at: true, disabled_at: true, first_opened_at: true, last_opened_at: true, open_count: true, users: { select: { name: true } } },
  });
  const kini = new Date();
  return (
    <Halaman>
      <Link href="/foto-menu" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Foto Menu
      </Link>
      <KepalaHalaman ikon={Link2} judul="Link galeri" jumlah={link.length} keterangan="Link foto yang dikirim ke klien. Berlaku 30 hari; tanda Sudah dibuka muncul begitu klien membukanya." />
      <BingkaiTabel>
        {link.length ? (
          <table className="w-full">
            <thead>
              <tr>
                <Th>Untuk</Th>
                <Th>Foto</Th>
                <Th>Dibuat</Th>
                <Th>Dibuka klien</Th>
                <Th>Berlaku</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {link.map((l) => {
                const mati = l.disabled_at !== null || l.expires_at <= kini;
                return (
                  <tr key={l.id.toString()} className="border-t">
                    <Td className="min-w-40 font-medium">{l.recipient ?? <span className="text-muted-foreground">—</span>}</Td>
                    <Td className="font-mono tabular-nums">{l.photo_ids.length}</Td>
                    <Td className="text-sm whitespace-nowrap text-muted-foreground">
                      {waktu.format(l.created_at)}
                      {l.users ? <span className="block text-xs">{l.users.name}</span> : null}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {l.first_opened_at && l.last_opened_at ? (
                        <span className="flex flex-col gap-0.5">
                          <Pil nada="baik">Sudah dibuka {l.open_count}×</Pil>
                          <span className="text-xs text-muted-foreground">terakhir {waktu.format(l.last_opened_at)}</span>
                        </span>
                      ) : (
                        <Pil>Belum dibuka</Pil>
                      )}
                    </Td>
                    <Td className="text-sm whitespace-nowrap">
                      {l.disabled_at ? <Pil nada="perhatian">Dimatikan</Pil> : l.expires_at <= kini ? <Pil nada="perhatian">Kedaluwarsa</Pil> : `s.d. ${tanggal.format(l.expires_at)}`}
                    </Td>
                    <Td className="text-right whitespace-nowrap">{mati ? null : <AksiLink id={l.id.toString()} token={l.token} />}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <KeadaanKosong judul="Belum ada link galeri" keterangan='Buka galeri sebuah menu → pilih foto → "+ Link galeri", ulangi di menu lain, lalu tekan "Link galeri" di atas.' />
        )}
      </BingkaiTabel>
    </Halaman>
  );
}
