import { HandCoins, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { LABEL_MUTASI, saldoUangMuka, type JenisMutasi } from "@/lib/hitung/uang-muka";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { FormDana } from "./form-dana";

export const metadata: Metadata = { title: "Uang Muka Belanja" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/* Uang muka belanja / Daily Market (D-081). Pemegang hanya melihat miliknya; Finance melihat semua. */
export default async function HalamanUangMuka() {
  const sesi = await wajibIzin("uang-muka");
  const kelola = bolehKelolaUang(sesi.peran);
  const milik = kelola ? {} : { holder_user_id: BigInt(sesi.id) };

  const [mutasi, semua, pemegang, prSetuju] = await Promise.all([
    prisma.cash_advances.findMany({
      where: milik,
      orderBy: { id: "desc" },
      take: 100,
      include: {
        users_cash_advances_holder_user_idTousers: { select: { name: true } },
        users_cash_advances_created_byTousers: { select: { name: true } },
        purchase_requests: { select: { id: true, pr_number: true } },
        purchases: { select: { id: true, purchase_number: true, shop_name: true } },
      },
    }),
    prisma.cash_advances.findMany({ where: milik, select: { holder_user_id: true, kind: true, amount: true, status: true } }),
    kelola ? prisma.users.findMany({ where: { is_active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }) : [],
    kelola
      ? prisma.purchase_requests.findMany({
          where: { status: "disetujui" },
          orderBy: { need_date: "asc" },
          select: { id: true, pr_number: true, transfer_amount: true, created_by: true },
        })
      : [],
  ]);

  // Saldo per pemegang; pemegang tanpa mutasi tetap tampil untuk dirinya sendiri.
  const perPemegang = new Map<string, typeof semua>();
  if (!kelola) perPemegang.set(sesi.id, []);
  for (const m of semua) perPemegang.set(m.holder_user_id.toString(), [...(perPemegang.get(m.holder_user_id.toString()) ?? []), m]);
  const nama = new Map(mutasi.map((m) => [m.holder_user_id.toString(), m.users_cash_advances_holder_user_idTousers.name]));
  nama.set(sesi.id, sesi.nama);
  for (const u of pemegang) nama.set(u.id.toString(), u.name);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={HandCoins}
        judul="Uang Muka Belanja"
        keterangan="Dana dari Finance untuk belanja pasar, nota belanja, dan sisa yang dikembalikan. Saldo tidak boleh minus."
        aksi={
          <Button render={<Link href="/uang-muka/belanja/baru" />}>
            <Plus className="size-4" />
            Catat belanja
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...perPemegang.entries()].map(([id, m]) => {
            const saldo = saldoUangMuka(m);
            return (
              <div key={id} className="kartu p-4">
                <p className="text-sm text-muted-foreground">{id === sesi.id ? "Saldo saya" : nama.get(id)}</p>
                <p className="font-mono text-2xl font-bold tabular-nums">{rupiah(saldo)}</p>
                <p className="text-xs text-muted-foreground">Harus sama dengan uang belanja di tangan.</p>
              </div>
            );
          })}
          {!perPemegang.size ? <p className="text-sm text-muted-foreground">Belum ada pemegang uang muka. Catat dana masuk di bawah.</p> : null}
        </section>

        {kelola ? (
          <FormDana
            pemegang={pemegang.map((u) => ({ id: u.id.toString(), label: u.name, sub: u.role }))}
            pr={prSetuju.map((p) => ({ id: p.id.toString(), label: p.pr_number, jumlah: Number(p.transfer_amount ?? 0), pemegang: p.created_by?.toString() ?? null }))}
          />
        ) : null}

        <section className="kartu">
          <h2 className="eyebrow border-b p-4">Riwayat</h2>
          {!mutasi.length ? (
            <KeadaanKosong judul="Belum ada mutasi." keterangan="Dana masuk dari Finance dan nota belanja akan tercatat di sini." />
          ) : (
            <ul className="divide-y">
              {mutasi.map((m) => {
                const keluar = m.kind !== "topup";
                return (
                  <li key={m.id.toString()} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {LABEL_MUTASI[m.kind as JenisMutasi] ?? m.kind}
                        {m.purchases ? (
                          <Link href={`/uang-muka/belanja/${m.purchases.id}`} className="ml-2 font-mono text-sm underline-offset-4 hover:underline">
                            {m.purchases.purchase_number}
                          </Link>
                        ) : null}
                        {m.proof_path ? (
                          <a href={`/uang-muka/bukti/${m.id}`} target="_blank" rel="noreferrer" className="ml-2 text-sm font-normal text-primary underline-offset-4 hover:underline">
                            bukti transfer
                          </a>
                        ) : null}
                        {m.status === "batal" ? (
                          <span className="ml-2">
                            <Pil>dibatalkan</Pil>
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          kelola ? m.users_cash_advances_holder_user_idTousers.name : null,
                          m.purchases?.shop_name,
                          m.purchase_requests?.pr_number,
                          m.note,
                          `${waktu.format(m.created_at)}${m.users_cash_advances_created_byTousers ? ` · ${m.users_cash_advances_created_byTousers.name}` : ""}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className={`font-mono tabular-nums ${m.status === "batal" ? "text-muted-foreground line-through" : keluar ? "" : "text-lunas"}`}>
                      {keluar ? "−" : "+"}
                      {rupiah(m.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Halaman>
  );
}
