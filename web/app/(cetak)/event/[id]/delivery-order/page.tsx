import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { barangKloter, nomorDo } from "@/lib/delivery-order";
import { eventMiliknya } from "@/lib/event-akses";
import { CARA_LAYANAN } from "@/lib/hitung/event";
import { namaBerkasCetak } from "@/lib/nomor-tiska";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { teksJumlahBaris } from "@/lib/uang";

export const dynamic = "force-dynamic";

/* ==========================================================================
   DELIVERY ORDER / SURAT JALAN (D-077) — dibawa driver per kloter, ditanda-
   tangani penerima. Isinya dari event (bukan invoice), jadi tidak ada harga.
   ?kloter=<id> → barang kloter itu; tanpa kloter → semua barang tanggal pertama.
   ========================================================================== */

const NAMA = "Tiska Catering";
const hariPanjang = (t: Date) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(t);
const LABEL_PERAN: Record<string, string> = { captain: "Captain", driver: "Driver", steward: "Steward", delivery_lauk: "Delivery lauk", crew: "Crew", dw: "DW" };

async function ambil(id: string, kloter: string | undefined) {
  const sesi = await wajibIzin("event");
  if (!/^\d+$/.test(id)) return null;
  const e = await prisma.events.findFirst({
    where: { id: BigInt(id), ...eventMiliknya(sesi) },
    include: {
      customers: { select: { name: true, address: true, phone: true } },
      quotations: { select: { quotation_number: true, event_time: true } },
      event_items: { orderBy: { sort: "asc" } },
      event_kloters: {
        orderBy: [{ date: "asc" }, { no: "asc" }],
        include: { event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } }, vehicles: { select: { name: true, plate: true } } } } },
      },
    },
  });
  if (!e) return null;
  const k = kloter && /^\d+$/.test(kloter) ? e.event_kloters.find((x) => x.id.toString() === kloter) : undefined;
  const tanggal = k?.date ?? e.first_date ?? e.event_items.find((i) => i.session_date)?.session_date ?? null;
  const iso = (t: Date | null) => t?.toISOString().slice(0, 10);
  const diTanggal = e.event_items.filter((i) => !tanggal || (iso(i.session_date) ?? iso(e.first_date)) === iso(tanggal));
  return { e, k, tanggal, barang: k ? barangKloter(diTanggal, k.depart_time) : diTanggal };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/event/[id]/delivery-order">): Promise<Metadata> {
  const { id } = await params;
  const { kloter } = await searchParams;
  const r = await ambil(id, typeof kloter === "string" ? kloter : undefined);
  return { title: { absolute: r ? `Delivery-Order-${namaBerkasCetak(nomorDo(r.e.quotations.quotation_number, r.k?.no))}` : "Delivery Order" } };
}

export default async function DeliveryOrder({ params, searchParams }: PageProps<"/event/[id]/delivery-order">) {
  const { id } = await params;
  const { kloter } = await searchParams;
  const r = await ambil(id, typeof kloter === "string" ? kloter : undefined);
  if (!r) notFound();
  const { e, k, tanggal, barang } = r;
  const ambilSendiri = e.service_mode === "ambil";
  const petugas = k?.event_assignments ?? [];
  const kendaraan = [...new Set(petugas.map((a) => (a.vehicles ? [a.vehicles.name, a.vehicles.plate].filter(Boolean).join(" · ") : null)).filter(Boolean))];
  const driver = petugas.find((a) => a.role === "driver");
  const jamKirim = k?.depart_time ?? barang.find((i) => i.session_time)?.session_time ?? e.quotations.event_time;

  return (
    <div className="text-[12px] leading-[1.5] text-black">
      <div className="mb-3 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <div>
          <div className="text-[18px] font-bold tracking-wide">DELIVERY ORDER</div>
          <div className="text-[11px] text-[#555]">Surat Jalan · {NAMA}</div>
        </div>
        <div className="text-right text-[11px]">
          <div>
            <b>No. DO:</b> {nomorDo(e.quotations.quotation_number, k?.no)}
          </div>
          <div className="text-[#555]">Ref. {e.quotations.quotation_number}</div>
        </div>
      </div>

      <table className="mb-3 w-full border-collapse">
        <tbody>
          <Baris label="Kepada" nilai={e.customers.name} tebal />
          <Baris label="PIC / HP" nilai={[e.pic_name, e.pic_phone ?? e.customers.phone].filter(Boolean).join(" · ") || "-"} tebal />
          <Baris label={ambilSendiri ? "Diambil di" : "Alamat kirim"} nilai={ambilSendiri ? `${NAMA} (diambil customer)` : [e.venue, e.address].filter(Boolean).join(" — ") || e.customers.address || "-"} />
          {!ambilSendiri && e.maps_url ? <Baris label="Peta" nilai={e.maps_url} /> : null}
          <Baris label="Tanggal" nilai={tanggal ? hariPanjang(tanggal) : "-"} tebal samping={k ? `Kloter ${k.no}` : CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN]} sampingLabel={k ? "Berangkat" : "Layanan"} />
          <Baris label={ambilSendiri ? "Jam ambil" : "Jam berangkat"} nilai={jamKirim ? `${jamKirim} WIB` : "-"} tebal samping={kendaraan.join(", ") || "-"} sampingLabel="Kendaraan" />
          {k?.note ? <Baris label="Catatan kloter" nilai={k.note} /> : null}
          <Baris label="Driver / tim" nilai={petugas.length ? petugas.map((a) => `${a.users?.name ?? a.person_name} (${LABEL_PERAN[a.role] ?? a.role})`).join(", ") : "-"} />
        </tbody>
      </table>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#eee]">
            <Th lebar="6%">No</Th>
            <Th>Barang</Th>
            <Th lebar="18%" tengah>
              Jumlah
            </Th>
            <Th lebar="14%" tengah>
              Cek kirim
            </Th>
            <Th lebar="14%" tengah>
              Cek terima
            </Th>
          </tr>
        </thead>
        <tbody>
          {barang.map((i, n) => (
            <tr key={i.id.toString()} className="break-inside-avoid">
              <Td tengah>{n + 1}</Td>
              <Td>
                <span className="font-bold">{i.item_name}</span>
                {i.session_time && !k ? <span className="ml-1 text-[#555]">· {i.session_time}</span> : null}
                {i.contents ? <div className="mt-0.5 text-[11px] text-[#555]">{i.contents.split("\n").join(" · ")}</div> : null}
              </Td>
              <Td tengah tebal>
                {teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" })}
              </Td>
              <Td tengah>☐</Td>
              <Td tengah>☐</Td>
            </tr>
          ))}
        </tbody>
      </table>

      {e.notes ? (
        <div className="mt-3 border border-black p-2">
          <div className="font-bold">Catatan:</div>
          <div className="whitespace-pre-line">{e.notes}</div>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] text-[#555]">Mohon periksa jumlah barang saat diterima. Keluhan kurang/rusak disampaikan saat itu juga kepada driver.</p>

      <table className="mt-8 w-full break-inside-avoid border-collapse">
        <tbody>
          <tr>
            {["Disiapkan (Dapur),", ambilSendiri ? "Diserahkan," : "Pengirim (Driver),", "Diterima,"].map((t, n) => (
              <td key={t} className="w-1/3 px-2 align-top text-center">
                {t}
                <div className="h-[55px]" />
                <div className="mx-auto w-[150px] border-t border-black pt-0.5">{n === 1 && driver ? (driver.users?.name ?? driver.person_name) : "Nama"}</div>
                {n === 2 ? <div className="text-[11px] text-[#555]">Tgl / jam: ......................</div> : null}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Baris({ label, nilai, tebal, samping, sampingLabel }: { label: string; nilai: string; tebal?: boolean; samping?: string; sampingLabel?: string }) {
  return (
    <tr>
      <td className="w-[22%] border border-[#999] px-2 py-1 text-[#555]">{label}</td>
      <td className={`border border-[#999] px-2 py-1 ${tebal ? "font-bold" : ""}`} colSpan={samping === undefined ? 3 : 1}>
        {nilai}
      </td>
      {samping !== undefined ? (
        <>
          <td className="w-[16%] border border-[#999] px-2 py-1 text-[#555]">{sampingLabel}</td>
          <td className="w-[18%] border border-[#999] px-2 py-1 font-bold">{samping}</td>
        </>
      ) : null}
    </tr>
  );
}

function Th({ children, lebar, tengah }: { children: React.ReactNode; lebar?: string; tengah?: boolean }) {
  return (
    <th className={`border border-[#999] px-2 py-1.5 font-bold ${tengah ? "text-center" : "text-left"}`} style={lebar ? { width: lebar } : undefined}>
      {children}
    </th>
  );
}

function Td({ children, tengah, tebal }: { children: React.ReactNode; tengah?: boolean; tebal?: boolean }) {
  return <td className={`border border-[#999] px-2 py-1.5 align-top ${tengah ? "text-center" : ""} ${tebal ? "font-bold" : ""}`}>{children}</td>;
}
