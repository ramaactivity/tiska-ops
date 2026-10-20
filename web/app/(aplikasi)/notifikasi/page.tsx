import { BellRing } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { prisma } from "@/lib/prisma";
import { wajibSesi } from "@/lib/rbac";

import { AturNotifikasi } from "./atur-notifikasi";

export const metadata: Metadata = { title: "Notifikasi HP" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/* Notifikasi HP (D-096): aktifkan per HP, kirim uji, daftar HP yang terdaftar. */
export default async function HalamanNotifikasi() {
  const sesi = await wajibSesi();
  const hp = await prisma.push_subscriptions.findMany({ where: { user_id: BigInt(sesi.id) }, orderBy: { created_at: "desc" }, select: { id: true, endpoint: true, user_agent: true, created_at: true, last_sent_at: true } });
  return (
    <Halaman>
      <div className="mx-auto w-full max-w-[560px]">
        <KepalaHalaman ikon={BellRing} judul="Notifikasi HP" keterangan="Jadwal besok, tugas baru, dan pekerjaan yang menunggu kamu — muncul di HP walau aplikasi tertutup." />
        <AturNotifikasi
          kunciPublik={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
          terdaftar={hp.map((h) => ({ endpoint: h.endpoint, perangkat: h.user_agent ?? "Perangkat", sejak: waktu.format(h.created_at), terakhir: h.last_sent_at ? waktu.format(h.last_sent_at) : null }))}
        />
      </div>
    </Halaman>
  );
}
