import Link from "next/link";

import { Pil } from "@/components/halaman";
import { bolehKelolaUang, type Peran } from "@/lib/peran";
import { prisma } from "@/lib/prisma";

import { AksiRefund, TombolUrungkan } from "./aksi-pembatalan";

const rp = (n: { toString(): string }) => `Rp ${Number(n.toString()).toLocaleString("id-ID")}`;
const tgl = (t: Date) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(t);
const LABEL = { menunggu: "Menunggu Finance", ditransfer: "Sudah ditransfer", deposit: "Deposit pesanan lain" } as const;

/* Event dibatalkan (D-102): alasan, hitungan refund yang dibekukan, dan penutupan oleh Finance. */
export async function KartuPembatalan({ idEvent, peran, ubah }: { idEvent: bigint; peran: Peran; ubah: boolean }) {
  const b = await prisma.event_cancellations.findUnique({
    where: { event_id: idEvent },
    include: { users_event_cancellations_created_byTousers: { select: { name: true } }, users_event_cancellations_settled_byTousers: { select: { name: true } } },
  });
  // Invoice yang belum lunas tetap terhitung piutang sampai dibatalkan di halaman Invoice.
  const ev = await prisma.events.findUnique({ where: { id: idEvent }, select: { quotation_id: true, invoice_id: true } });
  const terbuka = ev
    ? await prisma.invoices.findMany({
        where: { status: { in: ["unpaid", "partial", "overdue"] }, OR: [{ quotation_id: ev.quotation_id }, ...(ev.invoice_id ? [{ id: ev.invoice_id }] : [])] },
        select: { id: true, invoice_number: true },
      })
    : [];
  if (!b) return <section className="mb-5 rounded-[14px] border bg-card p-4 text-sm">Event ini berstatus Batal (dibatalkan sebelum ada pencatatan refund).</section>;
  const status = b.status as keyof typeof LABEL;
  return (
    <section className="mb-5 flex flex-col gap-3 rounded-[14px] border border-destructive/25 bg-destructive/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Event dibatalkan · {tgl(b.cancelled_on)}</h2>
        <Pil nada={status === "menunggu" ? "perhatian" : "baik"}>{LABEL[status]}</Pil>
      </div>
      <p className="text-sm">
        {b.party === "klien" ? "Klien membatalkan" : "Force majeure / kesepakatan khusus"} — {b.reason}
        <span className="text-muted-foreground"> · dicatat {b.users_event_cancellations_created_byTousers?.name ?? "?"}</span>
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Jarak ke acara</dt>
        <dd className="text-right tabular-nums">{b.days_before >= 0 ? `H-${b.days_before}` : `${-b.days_before} hari sesudah acara`}</dd>
        <dt className="text-muted-foreground">Sudah dibayar</dt>
        <dd className="text-right tabular-nums">{rp(b.paid_amount)}</dd>
        <dt className="text-muted-foreground">Menurut S&K ({Number(b.refund_pct)}%)</dt>
        <dd className="text-right tabular-nums">{rp(b.refund_computed)}</dd>
        <dt className="font-medium">Dikembalikan</dt>
        <dd className="text-right font-semibold tabular-nums">{rp(b.refund_amount)}</dd>
      </dl>
      {b.amount_note ? <p className="text-sm">Nominal disesuaikan: {b.amount_note}</p> : null}
      {Number(b.paid_amount) > Number(b.refund_amount) ? (
        <p className="text-xs text-muted-foreground">
          {rp(Number(b.paid_amount) - Number(b.refund_amount))} tidak dikembalikan — boleh dipakai klien untuk pesanan lain sampai {tgl(b.credit_valid_until)}.
        </p>
      ) : null}
      {b.settled_on ? (
        <p className="text-sm">
          {LABEL[status]} {tgl(b.settled_on)}
          {b.settle_note ? ` — ${b.settle_note}` : ""} · {b.users_event_cancellations_settled_byTousers?.name ?? ""}
        </p>
      ) : null}
      {terbuka.length ? (
        <p className="rounded-xl border border-perhatian-garis bg-perhatian-halus p-3 text-sm text-perhatian">
          ⚠️ Invoice masih tercatat belum lunas (terhitung piutang):{" "}
          {terbuka.map((i, n) => (
            <span key={i.id.toString()}>
              {n ? ", " : ""}
              <Link href={`/tagihan/${i.id}`} className="nomor-dokumen underline underline-offset-4">
                {i.invoice_number}
              </Link>
            </span>
          ))}
          . Sisa tagihannya batalkan dari halaman invoice (yang sudah ada pembayaran tidak bisa dibatalkan — tagihan sisanya cukup dibiarkan, refund dicatat di sini).
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "menunggu" && bolehKelolaUang(peran) ? <AksiRefund id={idEvent.toString()} nominal={Number(b.refund_amount)} /> : null}
        {ubah && status !== "ditransfer" ? <TombolUrungkan id={idEvent.toString()} /> : null}
      </div>
    </section>
  );
}
