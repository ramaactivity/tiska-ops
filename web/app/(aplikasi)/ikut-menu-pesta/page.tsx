import { Plus, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { nadaStatus, STATUS_PROGRAM, type StatusProgram } from "@/lib/hitung/ikut-menu-pesta";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

export const metadata: Metadata = { title: "Ikut Menu Pesta" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/* Daftar program Ikut Pesen Menu Pesta (D-115) — yang menunggu cek HPP paling atas. */
export default async function HalamanIkutMenuPesta() {
  await wajibIzin("ikut-menu-pesta");
  const daftar = await prisma.retail_programs.findMany({
    orderBy: [{ delivery_date: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      status: true,
      order_deadline: true,
      events: { select: { name: true, customers: { select: { name: true } } } },
      users_retail_programs_proposed_byTousers: { select: { name: true } },
      _count: { select: { retail_program_sets: true } },
    },
  });
  const urut = [...daftar.filter((p) => p.status === "diusulkan"), ...daftar.filter((p) => p.status !== "diusulkan")];

  return (
    <Halaman>
      <KepalaHalaman
        ikon={UtensilsCrossed}
        judul="Ikut Menu Pesta"
        jumlah={daftar.length}
        keterangan="Program retail Weekend/Weekday dari menu acara besar: diusulkan, dicek HPP-nya, lalu dibuka untuk pesanan."
        aksi={
          <Button className="rounded-full" render={<Link href="/ikut-menu-pesta/baru" />}>
            <Plus className="size-4" />
            Usulkan program
          </Button>
        }
      />
      <BingkaiTabel>
        {urut.length === 0 ? (
          <KeadaanKosong judul="Belum ada program" keterangan="Usulkan dari halaman event acara besar, atau tekan Usulkan program." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <Th>Program</Th>
                <Th>Acara induk</Th>
                <Th>Batas order</Th>
                <Th>Paket</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {urut.map((p) => (
                <tr key={p.id.toString()} className="border-b last:border-0 hover:bg-muted/40">
                  <Td>
                    <Link href={`/ikut-menu-pesta/${p.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">Diusulkan {p.users_retail_programs_proposed_byTousers?.name ?? "—"}</p>
                  </Td>
                  <Td>
                    {p.events.customers.name}
                    <p className="text-sm text-muted-foreground">{p.events.name}</p>
                  </Td>
                  <Td className="whitespace-nowrap">{waktu.format(p.order_deadline)}</Td>
                  <Td className="font-mono">{p._count.retail_program_sets}</Td>
                  <Td>
                    <Pil nada={nadaStatus(p.status)}>{STATUS_PROGRAM[p.status as StatusProgram] ?? p.status}</Pil>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BingkaiTabel>
    </Halaman>
  );
}
