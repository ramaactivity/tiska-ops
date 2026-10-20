import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { BarangBast } from "@/lib/bast";
import { dataUrlBukti } from "@/lib/bukti-berkas";
import { eventMiliknya } from "@/lib/event-akses";
import { namaBerkasCetak } from "@/lib/nomor-tiska";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/* ==========================================================================
   BAST — BERITA ACARA SERAH TERIMA (06-DOKUMEN §7, D-103). Ditandatangani
   penerima di HP tim saat barang tiba. Tanpa harga.
   ========================================================================== */

const NAMA = "Tiska Catering";
const hariPanjang = (t: Date) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(t);
const jamWib = (t: Date) => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(t);

async function ambil(id: string, idBast: string) {
  const sesi = await wajibIzin("event");
  if (!/^\d+$/.test(id) || !/^\d+$/.test(idBast)) return null;
  return prisma.basts.findFirst({
    where: { id: BigInt(idBast), event_id: BigInt(id), events: eventMiliknya(sesi) },
    include: {
      users: { select: { name: true } },
      events: { select: { name: true, venue: true, address: true, customers: { select: { name: true } }, quotations: { select: { quotation_number: true } } } },
      event_kloters: { select: { no: true, date: true, depart_time: true, kloter_tracking: { where: { status: "tiba" }, select: { at: true } } } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/event/[id]/bast/[bast]">): Promise<Metadata> {
  const { id, bast } = await params;
  const b = await ambil(id, bast);
  return { title: { absolute: b ? namaBerkasCetak(b.bast_number) : "BAST" } };
}

export default async function HalamanBast({ params }: PageProps<"/event/[id]/bast/[bast]">) {
  const { id, bast } = await params;
  const b = await ambil(id, bast);
  if (!b) notFound();
  const [ttd, foto] = await Promise.all([dataUrlBukti(b.signature_path), dataUrlBukti(b.photo_path)]);
  const barang = b.items as BarangBast[];
  const tiba = b.event_kloters.kloter_tracking[0]?.at;

  return (
    <div className="text-[12px] leading-[1.5] text-black">
      <div className="mb-3 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <div>
          <div className="text-[18px] font-bold tracking-wide">BERITA ACARA SERAH TERIMA</div>
          <div className="text-[11px] text-[#555]">{NAMA}</div>
        </div>
        <div className="text-right text-[11px]">
          <div>
            <b>No.</b> {b.bast_number}
          </div>
          <div className="text-[#555]">Ref. {b.events.quotations.quotation_number}</div>
        </div>
      </div>

      <table className="mb-3 w-full border-collapse">
        <tbody>
          {(
            [
              ["Customer", b.events.customers.name],
              ["Acara", b.events.name],
              ["Lokasi", [b.events.venue, b.events.address].filter(Boolean).join(" — ") || "-"],
              ["Tanggal", `${hariPanjang(b.event_kloters.date)} · kloter ${b.event_kloters.no} (berangkat ${b.event_kloters.depart_time})`],
              ["Tiba / diterima", `${tiba ? `tiba ${jamWib(tiba)} · ` : ""}ditandatangani ${jamWib(b.signed_at)} WIB`],
            ] as const
          ).map(([l, n]) => (
            <tr key={l}>
              <td className="w-[22%] border border-[#999] px-2 py-1 text-[#555]">{l}</td>
              <td className="border border-[#999] px-2 py-1 font-bold">{n}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#eee]">
            <th className="w-[6%] border border-[#999] px-2 py-1.5 text-center">No</th>
            <th className="border border-[#999] px-2 py-1.5 text-left">Barang diserahkan</th>
            <th className="w-[20%] border border-[#999] px-2 py-1.5 text-center">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {barang.map((i, n) => (
            <tr key={n} className="break-inside-avoid">
              <td className="border border-[#999] px-2 py-1.5 text-center align-top">{n + 1}</td>
              <td className="border border-[#999] px-2 py-1.5 align-top">
                <span className="font-bold">{i.nama}</span>
                {i.isi.length ? <div className="mt-0.5 text-[11px] text-[#555]">{i.isi.join(" · ")}</div> : null}
              </td>
              <td className="border border-[#999] px-2 py-1.5 text-center align-top font-bold">{i.jumlah}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 border border-black p-2">
        <b>Kondisi:</b> {b.condition === "baik" ? "Diterima lengkap & dalam kondisi baik." : `Ada catatan — ${b.note}`}
      </div>

      <table className="mt-6 w-full break-inside-avoid border-collapse">
        <tbody>
          <tr>
            <td className="w-1/2 px-2 text-center align-top">
              Diserahkan,
              <div className="h-[70px]" />
              <div className="mx-auto w-[170px] border-t border-black pt-0.5">{b.users?.name ?? "Tim Tiska"}</div>
              <div className="text-[11px] text-[#555]">{NAMA}</div>
            </td>
            <td className="w-1/2 px-2 text-center align-top">
              Diterima,
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL tanda tangan, bukan gambar statis */}
              {ttd ? <img src={ttd} alt="Tanda tangan penerima" className="mx-auto h-[70px] object-contain" /> : <div className="h-[70px]" />}
              <div className="mx-auto w-[170px] border-t border-black pt-0.5">{b.receiver_name}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {foto ? (
        <div className="mt-5 break-inside-avoid">
          <div className="pb-1 text-[11px] text-[#555]">Foto saat serah terima</div>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL foto bukti */}
          <img src={foto} alt="Foto serah terima" className="max-h-[90mm] border border-[#999]" />
        </div>
      ) : null}
    </div>
  );
}
