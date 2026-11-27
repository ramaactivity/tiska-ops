import { FileText, MapPin, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman } from "@/components/halaman";
import { DaftarMenuRingkas } from "@/components/daftar-menu-ringkas";
import { ChipStatus } from "@/components/lencana-status";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { eventMiliknya } from "@/lib/event-akses";
import { bolehUbahEvent } from "@/lib/peran";
import { PESANAN_DIHITUNG } from "@/lib/ikut-menu-pesta";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { LABEL_STATUS_DAPUR, LABEL_STATUS_KIRIM, STATUS_DAPUR, STATUS_KIRIM } from "@/lib/tim";
import { teksJumlahBaris } from "@/lib/uang";

import { TombolBuatEvent } from "../penawaran/[id]/aksi-status";

export const metadata: Metadata = { title: "Pengiriman" };
export const dynamic = "force-dynamic";

const hariPanjang = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/* ==========================================================================
   PENGIRIMAN (D-078) — order yang DIANTAR atau DIAMBIL (retail / produk saja,
   juga box untuk acara), per tanggal: jam, alamat, isi, driver, status kirim,
   Delivery Order. Set-up & service tetap di menu Event.
   ========================================================================== */
export default async function HalamanPengiriman({ searchParams }: PageProps<"/pengiriman">) {
  const sesi = await wajibIzin("pengiriman");
  const { lihat } = await searchParams;
  const lalu = lihat === "lalu";
  const hariIniTeks = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const hariIni = new Date(`${hariIniTeks}T00:00:00Z`);
  const besokTeks = new Date(hariIni.getTime() + 86_400_000).toISOString().slice(0, 10);

  const [daftar, belum] = await Promise.all([
    prisma.events.findMany({
      where: {
        ...eventMiliknya(sesi),
        service_mode: { in: ["antar", "ambil"] },
        status: { not: "batal" },
        ...(lalu ? { first_date: { lt: hariIni } } : { OR: [{ first_date: { gte: hariIni } }, { first_date: null }] }),
      },
      orderBy: [{ first_date: lalu ? "desc" : "asc" }, { id: "asc" }],
      take: 200,
      include: {
        customers: { select: { name: true } },
        quotations: { select: { quotation_number: true, event_time: true } },
        event_items: { orderBy: { sort: "asc" }, select: { item_name: true, qty: true, unit: true, pax: true } },
        event_kloters: {
          where: { program_id: null }, // kloter Ikut Menu Pesta tampil di bagiannya sendiri (D-117)
          orderBy: [{ date: "asc" }, { no: "asc" }],
          include: {
            event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } }, vehicles: { select: { name: true } } } },
            kloter_tracking: { select: { status: true } },
          },
        },
      },
    }),
    // Order retail yang sudah disetujui tapi belum dijadwalkan.
    lalu
      ? Promise.resolve([])
      : prisma.quotations.findMany({
          where: { ...hanyaMiliknya(sesi), status: "approved", order_type: "retail", events: null },
          orderBy: { event_date: "asc" },
          select: { id: true, quotation_number: true, event_date: true, event_time: true, venue: true, customers: { select: { name: true } } },
        }),
  ]);
  const ubah = bolehUbahEvent(sesi.peran);
  // Ikut Menu Pesta (D-117): pesanan retail per alamat, dikelola di halaman programnya.
  const program = await prisma.retail_programs.findMany({
    where: { status: "disetujui", delivery_date: lalu ? { lt: hariIni } : { gte: hariIni } },
    orderBy: { delivery_date: lalu ? "desc" : "asc" },
    take: 50,
    select: {
      id: true,
      name: true,
      retail_orders: { where: PESANAN_DIHITUNG, select: { kloter_id: true, delivered_at: true, area_status: true } },
      event_kloters: {
        orderBy: { depart_time: "asc" },
        select: { no: true, depart_time: true, event_assignments: { where: { role: "driver" }, select: { person_name: true, users: { select: { name: true } }, vehicles: { select: { name: true } } } } },
      },
    },
  });

  const perTanggal = new Map<string, typeof daftar>();
  for (const e of daftar) {
    const t = e.first_date?.toISOString().slice(0, 10) ?? "";
    perTanggal.set(t, [...(perTanggal.get(t) ?? []), e]);
  }

  return (
    <Halaman>
      <KepalaHalaman
        ikon={PackageCheck}
        judul="Pengiriman"
        jumlah={daftar.length}
        keterangan="Order retail / produk saja yang diantar atau diambil: jam, alamat, isi, driver, dan status kirim. Set-up & service ada di menu Event."
      />
      <div className="pb-4">
        <SaringStatus
          parameter="lihat"
          pilihan={[
            { nilai: "", label: "Mendatang" },
            { nilai: "lalu", label: "Sudah lewat" },
          ]}
        />
      </div>

      {belum.length ? (
        <section className="mb-5 overflow-hidden rounded-[14px] border border-perhatian-garis bg-card">
          <div className="border-b border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
            <b className="font-semibold">{belum.length} order retail belum dijadwalkan.</b> Buat jadwal kirimnya supaya masuk dapur, Layar Dapur, dan Delivery Order.
          </div>
          <ul>
            {belum.map((q) => (
              <li key={q.id.toString()} className="flex flex-wrap items-center gap-3 border-b border-border-row px-4 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <Link href={`/penawaran/${q.id}`} className="font-medium hover:underline">
                    {q.customers.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {[q.event_date ? hariPanjang(q.event_date.toISOString().slice(0, 10)) : "tanggal belum diisi", q.event_time, q.venue].filter(Boolean).join(" · ")}
                    <span className="nomor-dokumen ml-2 text-primary">{q.quotation_number}</span>
                  </p>
                </div>
                {ubah ? <TombolBuatEvent id={q.id.toString()} label="Buat jadwal kirim" /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {program.length ? (
        <section className="mb-5">
          <h2 className="pb-2 text-[0.9375rem] font-semibold text-primary-strong">Ikut Menu Pesta</h2>
          <ul className="overflow-hidden kartu">
            {program.map((p) => {
              const total = p.retail_orders.length;
              const diantar = p.retail_orders.filter((o) => o.delivered_at).length;
              const belum = p.retail_orders.filter((o) => !o.kloter_id && o.area_status !== "menunggu").length;
              const driver = [...new Set(p.event_kloters.flatMap((k) => k.event_assignments.map((a) => `${a.users?.name ?? a.person_name}${a.vehicles ? ` (${a.vehicles.name})` : ""}`)))];
              return (
                <li key={p.id.toString()} className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-border-row px-4 py-4 last:border-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/ikut-menu-pesta/${p.id}`} className="text-[1.0625rem] font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {total} pesanan · {p.event_kloters.length ? p.event_kloters.map((k) => `kloter ${k.no} ${k.depart_time}`).join(", ") : "belum ada kloter"}
                      {driver.length ? ` · 🚐 ${driver.join(", ")}` : ""}
                    </p>
                  </div>
                  <ChipStatus
                    label={total && diantar === total ? "Semua diantar" : diantar ? `${diantar}/${total} diantar` : belum ? `${belum} belum masuk kloter` : "Belum berangkat"}
                    nada={total && diantar === total ? "lunas" : belum ? "perhatian" : diantar ? "info" : "netral"}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {daftar.length === 0 ? (
        <div className="kartu">
          <KeadaanKosong
            judul={lalu ? "Belum ada pengiriman yang lewat." : "Tidak ada pengiriman mendatang."}
            keterangan="Pengiriman muncul setelah quotation retail disetujui dan dibuatkan jadwal kirimnya."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {[...perTanggal].map(([t, isi]) => (
            <section key={t || "tanpa"}>
              <h2 className="pb-2 text-[0.9375rem] font-semibold text-primary-strong">
                {t ? hariPanjang(t) : "Tanggal belum diisi"}
                {t === hariIniTeks ? <span className="ml-2 text-sm font-normal text-primary">· hari ini</span> : t === besokTeks ? <span className="ml-2 text-sm font-normal text-muted-foreground">· besok</span> : null}
              </h2>
              <ul className="overflow-hidden kartu">
                {isi.map((e) => {
                  const kloter = e.event_kloters.filter((k) => !t || k.date.toISOString().slice(0, 10) === t);
                  const semua = kloter.flatMap((k) => k.kloter_tracking.map((x) => x.status));
                  const kirim = [...STATUS_KIRIM].reverse().find((s) => kloter.length && kloter.every((k) => k.kloter_tracking.some((x) => x.status === s)));
                  const sebagian = [...STATUS_KIRIM].reverse().find((s) => semua.includes(s));
                  const dapur = [...STATUS_DAPUR].reverse().find((s) => semua.includes(s));
                  const status = kirim
                    ? { label: LABEL_STATUS_KIRIM[kirim], nada: kirim === "berangkat" ? ("info" as const) : ("lunas" as const) }
                    : sebagian
                      ? { label: "Sebagian di jalan", nada: "info" as const }
                      : dapur
                        ? { label: LABEL_STATUS_DAPUR[dapur], nada: "netral" as const }
                        : kloter.length
                          ? { label: "Belum berangkat", nada: "netral" as const }
                          : { label: "Belum ada kloter", nada: "perhatian" as const };
                  const jam = kloter[0]?.depart_time ?? e.quotations.event_time?.split(/[–-]/)[0] ?? "—";
                  const petugas = [...new Set(kloter.flatMap((k) => k.event_assignments.filter((a) => a.role === "driver" || a.role === "captain").map((a) => `${a.users?.name ?? a.person_name}${a.vehicles ? ` (${a.vehicles.name})` : ""}`)))];
                  return (
                    <li key={e.id.toString()} className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-border-row px-4 py-4 last:border-0">
                      <div className="w-16 shrink-0">
                        <span className="font-mono text-[1.1875rem] font-semibold">{jam}</span>
                        <span className="block text-xs text-muted-foreground">{e.service_mode === "ambil" ? "diambil" : "berangkat"}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/event/${e.id}`} className="text-[1.0625rem] font-medium hover:underline">
                          {e.customers.name}
                        </Link>
                        <p className="flex items-start gap-1 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" />
                          <span>{e.service_mode === "ambil" ? "Diambil di Tiska" : e.venue || e.address || "Alamat belum diisi"}</span>
                        </p>
                        <div className="mt-3 border-t border-border-row pt-3">
                          <DaftarMenuRingkas
                            maks={5}
                            baris={e.event_items.map((i) => ({ jumlah: teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }), nama: i.item_name }))}
                          />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {petugas.length ? `🚐 ${petugas.join(", ")}` : "Driver belum ditugaskan"}
                          <span className="nomor-dokumen ml-2 text-subtle-foreground">{e.quotations.quotation_number}</span>
                        </p>
                      </div>
                      <div className="flex basis-full flex-wrap items-center gap-2 pl-20 sm:basis-auto sm:flex-col sm:items-end sm:justify-start sm:pl-0">
                        <ChipStatus label={status.label} nada={status.nada} />
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(kloter.length ? kloter : [null]).map((k) => (
                            <Button
                              key={k?.id.toString() ?? "semua"}
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-card"
                              render={<a href={`/event/${e.id}/delivery-order${k ? `?kloter=${k.id}` : ""}`} target="_blank" rel="noopener" />}
                            >
                              <FileText className="size-4" />
                              {kloter.length > 1 && k ? `DO kloter ${k.no}` : "Delivery order"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Halaman>
  );
}
