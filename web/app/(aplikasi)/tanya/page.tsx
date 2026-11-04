import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { konfigurasiAi } from "@/lib/ai";
import { wajibIzin } from "@/lib/rbac";
import { pertanyaanUntuk } from "@/lib/tanya-data";

import { ChatTanya } from "./chat-tanya";

export const metadata: Metadata = { title: "Tanya Tiska" };
export const dynamic = "force-dynamic";

/* Tanya Tiska (D-135): tanya data dengan bahasa sehari-hari; AI menjawab dari data aplikasi (hak akses penanya). */
export default async function HalamanTanya() {
  const sesi = await wajibIzin("tanya");
  const saran = (await pertanyaanUntuk(sesi)).map((p) => p.contoh);
  const aktif = konfigurasiAi() !== null;
  return (
    <Halaman>
      <KepalaHalaman ikon={Sparkles} judul="Tanya Tiska" keterangan="Tanya soal acara, tagihan, penjualan, menu, paket, harga, stok — jawabannya diambil dari data di aplikasi ini, bukan karangan." />
      {aktif ? (
        <ChatTanya saran={[...saran.slice(0, 5), "Harga paket nasi box berapa saja?"]} nama={sesi.nama.split(" ")[0]} />
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-[0.9375rem]">
          <p className="font-semibold">Tanya Tiska belum aktif</p>
          <p className="mt-1 text-muted-foreground">Fitur ini butuh kunci AI (gratis dari Google AI Studio). Sementara itu, data tetap bisa dicari tanpa AI di Cari Cepat.</p>
          <Link href="/cari" className="mt-3 inline-flex min-h-10 items-center rounded-full bg-primary px-4 font-medium text-primary-foreground">
            Buka Cari Cepat
          </Link>
        </div>
      )}
    </Halaman>
  );
}
