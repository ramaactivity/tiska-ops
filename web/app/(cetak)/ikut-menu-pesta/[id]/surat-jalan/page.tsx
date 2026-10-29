import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Surat Jalan Ikut Menu Pesta" } };

/* ==========================================================================
   SURAT JALAN IKUT MENU PESTA (D-117) — satu halaman per pesanan, urut antar.
   ?kloter=<id> → pesanan kloter itu; ?pesanan=<id> → satu pesanan. Tanpa HPP;
   hanya jumlah yang DITAGIH saat terima untuk pesanan bayar-saat-kirim.
   ========================================================================== */

const hariPanjang = (t: Date) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(t);
const LABEL_PERAN: Record<string, string> = { captain: "Captain", driver: "Driver", steward: "Steward", delivery_lauk: "Delivery lauk", crew: "Crew", dw: "DW" };

export default async function SuratJalan({ params, searchParams }: PageProps<"/ikut-menu-pesta/[id]/surat-jalan">) {
  await wajibIzin("ikut-menu-pesta");
  const { id } = await params;
  const { kloter, pesanan } = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const saring =
    typeof pesanan === "string" && /^\d+$/.test(pesanan)
      ? { id: BigInt(pesanan) }
      : typeof kloter === "string" && /^\d+$/.test(kloter)
        ? { kloter_id: BigInt(kloter) }
        : null;
  if (!saring) notFound();
  const daftar = await prisma.retail_orders.findMany({
    where: { program_id: BigInt(id), status: "aktif", ...saring },
    orderBy: [{ stop_no: "asc" }, { id: "asc" }],
    include: {
      retail_programs: { select: { name: true, delivery_date: true } },
      invoices: { select: { invoice_number: true, grand_total: true, paid_amount: true } },
      retail_order_items: { include: { retail_program_sets: { include: { retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true } } } } } },
      event_kloters: {
        include: { event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } }, vehicles: { select: { name: true, plate: true } } } } },
      },
    },
  });
  if (!daftar.length) notFound();

  return (
    <div className="text-[12px] leading-[1.5] text-black">
      {daftar.map((o, n) => {
        const k = o.event_kloters;
        const tim = k?.event_assignments ?? [];
        const kendaraan = [...new Set(tim.map((a) => (a.vehicles ? [a.vehicles.name, a.vehicles.plate].filter(Boolean).join(" · ") : null)).filter(Boolean))];
        const tagih = o.payment_mode === "cod" && o.invoices ? Math.max(0, Number(o.invoices.grand_total) - Number(o.invoices.paid_amount)) : 0;
        return (
          <section key={o.id.toString()} className={n < daftar.length - 1 ? "mb-10 break-after-page" : ""}>
            <div className="mb-3 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
              <div>
                <div className="text-[18px] font-bold tracking-wide">SURAT JALAN</div>
                <div className="text-[11px] text-[#555]">{o.retail_programs.name}</div>
              </div>
              <div className="text-right text-[11px]">
                <div>
                  <b>Ref.</b> {o.invoices?.invoice_number ?? "-"}
                </div>
                <div className="text-[#555]">{k ? `Kloter ${k.no} · antar ke-${n + 1}` : "Belum masuk kloter"}</div>
              </div>
            </div>
            <table className="mb-3 w-full border-collapse">
              <tbody>
                <Baris label="Kepada" nilai={o.recipient_name} tebal />
                <Baris label="HP / WA" nilai={o.phone} tebal />
                <Baris label="Alamat kirim" nilai={o.address} />
                {o.maps_url ? <Baris label="Peta" nilai={o.maps_url} /> : null}
                <Baris label="Tanggal" nilai={hariPanjang(o.retail_programs.delivery_date)} tebal />
                <Baris label="Jam terima" nilai={o.receive_time ? `${o.receive_time} WIB` : "-"} />
                <Baris label="Berangkat" nilai={k ? `${k.depart_time} WIB${kendaraan.length ? ` · ${kendaraan.join(", ")}` : ""}` : "-"} />
                <Baris label="Driver / tim" nilai={tim.length ? tim.map((a) => `${a.users?.name ?? a.person_name} (${LABEL_PERAN[a.role] ?? a.role})`).join(", ") : "-"} />
                {o.notes ? <Baris label="Catatan" nilai={o.notes} /> : null}
              </tbody>
            </table>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#eee]">
                  <th className="w-[6%] border border-[#999] px-2 py-1.5 text-center">No</th>
                  <th className="border border-[#999] px-2 py-1.5 text-left">Paket</th>
                  <th className="w-[16%] border border-[#999] px-2 py-1.5 text-center">Jumlah</th>
                  <th className="w-[14%] border border-[#999] px-2 py-1.5 text-center">Cek terima</th>
                </tr>
              </thead>
              <tbody>
                {o.retail_order_items.map((i, j) => (
                  <tr key={i.id.toString()}>
                    <td className="border border-[#999] px-2 py-1.5 text-center align-top">{j + 1}</td>
                    <td className="border border-[#999] px-2 py-1.5 align-top">
                      <span className="font-bold">{i.retail_program_sets.title}</span>
                      <div className="mt-0.5 text-[11px] text-[#555]">{i.retail_program_sets.retail_program_set_items.map((m) => m.name).join(" · ")}</div>
                    </td>
                    <td className="border border-[#999] px-2 py-1.5 text-center align-top font-bold">{i.pax} pax</td>
                    <td className="border border-[#999] px-2 py-1.5 text-center align-top">☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tagih > 0 ? (
              <div className="mt-3 border-2 border-black p-2 text-[14px]">
                <b>Bayar saat terima: {rupiah(tagih)}</b> <span className="text-[11px]">(sudah termasuk PBJT{o.delivery_fee.gt(0) ? " & Delivery Fee" : ""})</span>
              </div>
            ) : null}
            <table className="mt-8 w-full break-inside-avoid border-collapse">
              <tbody>
                <tr>
                  {["Pengirim (Driver),", "Diterima,"].map((t, m) => (
                    <td key={t} className="w-1/2 px-2 text-center align-top">
                      {t}
                      <div className="h-[55px]" />
                      <div className="mx-auto w-[160px] border-t border-black pt-0.5">{m === 0 ? (tim.find((a) => a.role === "driver")?.users?.name ?? "Nama") : o.recipient_name}</div>
                      {m === 1 ? <div className="text-[11px] text-[#555]">Tgl / jam: ......................</div> : null}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function Baris({ label, nilai, tebal }: { label: string; nilai: string; tebal?: boolean }) {
  return (
    <tr>
      <td className="w-[22%] border border-[#999] px-2 py-1 text-[#555]">{label}</td>
      <td className={`border border-[#999] px-2 py-1 ${tebal ? "font-bold" : ""}`}>{nilai}</td>
    </tr>
  );
}
