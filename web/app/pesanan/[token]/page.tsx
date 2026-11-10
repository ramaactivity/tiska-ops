import { CalendarDays, Gift, MapPin, MessageCircle, Stamp } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StatusTagihan } from "@/components/lencana-status";
import { LogoTiska } from "@/components/logo-tiska";
import { CARA_BAYAR, tanggalFlyer, tautanWa } from "@/lib/hitung/ikut-menu-pesta";
import { hariIniWib } from "@/lib/kalender";
import { kartuPelanggan, tambahanPesanan } from "@/lib/loyalti";
import { prisma } from "@/lib/prisma";
import { rupiah } from "@/lib/uang";

import { KirimBukti } from "./kirim-bukti";

export const metadata: Metadata = { title: { absolute: "Pesanan Saya · Tiska Catering" } };
export const dynamic = "force-dynamic";

const tglLoyalti = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const batalLoyalti = (status: string) => status !== "aktif";

const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/* "Pesanan saya" (D-120): link pribadi pembeli — rincian, status, kirim bukti transfer. Tanpa login, tanpa angka HPP. */
export default async function HalamanPesananSaya({ params }: PageProps<"/pesanan/[token]">) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const o = await prisma.retail_orders.findUnique({
    where: { public_token: token },
    select: {
      recipient_name: true,
      address: true,
      receive_time: true,
      payment_mode: true,
      status: true,
      source: true,
      confirmed_at: true,
      outside_area: true,
      area_status: true,
      delivered_at: true,
      transfer_proof_at: true,
      retail_order_items: { select: { pax: true, retail_program_sets: { select: { title: true } } } },
      invoices: { select: { invoice_number: true, status: true, subtotal: true, pb1_amount: true, delivery_amount: true, grand_total: true, paid_amount: true } },
      retail_programs: { select: { name: true, delivery_date: true, contact: true } },
      customer_id: true,
      id: true,
    },
  });
  if (!o) notFound();
  // Kartu setia (D-131) — progres stempel & hadiah pembeli ini, tanpa angka harga lain.
  const loyalti = batalLoyalti(o.status) ? [] : ((await kartuPelanggan(hariIniWib(), [o.customer_id])).get(o.customer_id.toString()) ?? []);
  const bonus = batalLoyalti(o.status) ? [] : ((await tambahanPesanan([o.id])).get(o.id.toString()) ?? []);
  const perusahaan = await prisma.company_settings.findUnique({ where: { id: BigInt(1) }, select: { bank_name: true, bank_account_number: true, bank_account_holder: true } });
  const i = o.invoices;
  const sisa = i ? Number(i.grand_total) - Number(i.paid_amount) : 0;
  const batal = o.status !== "aktif";
  const wa = tautanWa(o.retail_programs.contact, `Halo admin Tiska, saya ${o.recipient_name} — pesanan ${o.retail_programs.name}.`);
  const keadaan = batal
    ? "Pesanan dibatalkan"
    : o.delivered_at
      ? `Sudah diantar ${waktu.format(o.delivered_at)}`
      : o.area_status === "ditolak"
        ? "Alamat di luar area belum bisa kami antar — admin akan menghubungi Anda"
        : o.source === "online" && !o.confirmed_at
          ? "Menunggu konfirmasi admin lewat WhatsApp"
          : o.area_status === "menunggu"
            ? "Menunggu konfirmasi jadwal kirim luar area"
            : "Dikonfirmasi — akan dikirim sesuai jadwal";

  return (
    <main className="min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <LogoTiska tinggi={56} />
        <header className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-primary">Pesanan saya</p>
          <h1 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-balance">{o.retail_programs.name}</h1>
          <p className="text-[0.9375rem] font-medium">{keadaan}</p>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
          <ul className="flex flex-col gap-1 text-[0.9375rem]">
            {o.retail_order_items.map((x) => (
              <li key={x.retail_program_sets.title} className="flex justify-between gap-3">
                <span>{x.retail_program_sets.title}</span>
                <span className="font-mono tabular-nums">{x.pax} pax</span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <CalendarDays className="mt-0.5 size-4 shrink-0" />
            Dikirim {tanggalFlyer(o.retail_programs.delivery_date.toISOString().slice(0, 10))}
            {o.receive_time ? ` sekitar jam ${o.receive_time}` : ""}
          </p>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {o.recipient_name} · {o.address}
          </p>
          {i ? (
            <dl className="flex flex-col gap-1 border-t pt-3 text-[0.9375rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-mono tabular-nums">{rupiah(i.subtotal.toString())}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">PBJT</dt>
                <dd className="font-mono tabular-nums">{rupiah(i.pb1_amount.toString())}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Ongkir</dt>
                <dd className={Number(i.delivery_amount) > 0 ? "font-mono tabular-nums" : undefined}>
                  {Number(i.delivery_amount) > 0 ? rupiah(i.delivery_amount.toString()) : o.outside_area && !o.confirmed_at ? "dikonfirmasi admin" : "Gratis"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="font-mono text-lg font-semibold tabular-nums">{rupiah(i.grand_total.toString())}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Pembayaran · {CARA_BAYAR[o.payment_mode as keyof typeof CARA_BAYAR] ?? o.payment_mode}</dt>
                <dd>
                  <StatusTagihan status={i.status} />
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        {!batal && i && i.status !== "paid" ? (
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Bayar dengan transfer</h2>
            {perusahaan?.bank_account_number ? (
              <p className="text-[0.9375rem]">
                {perusahaan.bank_name} <span className="font-mono font-semibold tabular-nums">{perusahaan.bank_account_number}</span>
                {perusahaan.bank_account_holder ? ` a.n. ${perusahaan.bank_account_holder}` : ""}
                <span className="block text-sm text-muted-foreground">Sejumlah {rupiah(sisa)}. Bisa juga bayar tunai saat pesanan diantar.</span>
              </p>
            ) : (
              <p className="text-[0.9375rem] text-muted-foreground">Nomor rekening dikirim admin lewat WhatsApp.</p>
            )}
            <KirimBukti token={token} terkirim={o.transfer_proof_at ? waktu.format(o.transfer_proof_at) : null} />
          </section>
        ) : null}

        {bonus.length ? (
          <section className="flex flex-col gap-1.5 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Termasuk di pesanan ini</h2>
            {bonus.map((b) => (
              <p key={b.teks} className="text-[0.9375rem]">
                {b.jenis === "bonus" ? "🥤" : "🎁"} {b.teks}
              </p>
            ))}
          </section>
        ) : null}

        {loyalti.map(({ program: lp, kartu: k }) => {
          const hadiah = k.hadiah.filter((h) => h.status === "tersedia");
          // Kartu baru saja penuh (stempel kembali 0, hadiah menunggu) → tampil penuh supaya pembeli melihat kartunya selesai.
          const isi = hadiah.length && k.stempel === 0 ? k.syarat : k.stempel;
          const sisa = k.syarat - isi;
          const penuh = isi >= k.syarat;
          return (
            <section key={lp.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
              {/* Kartu fisik: indigo tua Tiska + stempel emas; slot terakhir = hadiah. */}
              <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(140deg,#1f2a5c_0%,#2c3a7c_55%,#3b4fa8_100%)] p-5 text-white shadow-[0_10px_30px_-12px_rgba(31,42,92,0.55)]">
                <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/[0.06]" />
                <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 size-44 rounded-full bg-[#e9c983]/[0.08]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.6875rem] font-semibold tracking-[0.22em] text-[#e9c983]">TISKA · KARTU STEMPEL</p>
                    <p className="mt-1 text-[1.0625rem] leading-snug font-semibold text-balance">Ikut Pesan Menu Pesta</p>
                  </div>
                  <p className="shrink-0 font-mono text-[1.625rem] leading-none font-bold tabular-nums">
                    {isi}
                    <span className="text-white/50">/{k.syarat}</span>
                  </p>
                </div>
                <div className="relative mt-5 grid grid-cols-5 gap-2.5" role="img" aria-label={`${isi} dari ${k.syarat} stempel`}>
                  {Array.from({ length: k.syarat }, (_, i) => {
                    const terisi = i < isi;
                    const terakhir = i === k.syarat - 1;
                    return terisi ? (
                      <span
                        key={i}
                        className="stempel-masuk flex aspect-square items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#f6dfa6,#d9b25f_55%,#b8893a)] text-[#1f2a5c] shadow-[inset_0_-2px_0_rgba(0,0,0,0.12),0_4px_10px_-4px_rgba(0,0,0,0.45)]"
                        style={{ animationDelay: `${120 + i * 90}ms` }}
                      >
                        {terakhir ? <Gift className="size-[44%]" strokeWidth={2.2} /> : <Stamp className="size-[44%]" strokeWidth={2.2} />}
                      </span>
                    ) : (
                      <span
                        key={i}
                        className={`flex aspect-square flex-col items-center justify-center rounded-full border-2 border-dashed ${terakhir ? "border-[#e9c983]/80 text-[#e9c983]" : "border-white/25 text-white/30"}`}
                      >
                        {terakhir ? <Gift className="size-[40%]" /> : <span className="text-[0.8125rem] font-semibold tabular-nums">{i + 1}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 px-1">
                <p className="text-[1.25rem] leading-tight font-extrabold tracking-[-0.01em] text-primary-strong">
                  {penuh ? "Kartu penuh — hadiah siap! 🎉" : sisa === 1 ? "1 pesanan lagi untuk hadiah" : `${sisa} pesanan lagi untuk hadiah`}
                </p>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="progres-isi h-full rounded-full bg-[linear-gradient(90deg,#3b4fa8,#d9b25f)]" style={{ width: `${(isi / k.syarat) * 100}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {penuh
                    ? "Pilih satu hadiah di pesanan berikutnya:"
                    : `Tiap pesanan min. ${lp.minPax ?? 1} pax yang sudah lunas = 1 stempel${k.batas ? ` · lengkapi sebelum ${tglLoyalti.format(new Date(`${k.batas}T00:00:00Z`))}` : ""}. Hadiahnya pilih satu:`}
                </p>
                {lp.pilihan.length ? (
                  <div className="flex flex-wrap gap-2">
                    {lp.pilihan.map((x) => (
                      <span key={x} className="inline-flex items-center gap-1.5 rounded-full border border-[#e9c983] bg-[#fdf6e6] px-3 py-1.5 text-sm font-medium text-[#6b4e12]">
                        <Gift className="size-3.5" />
                        {x}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium">{lp.hadiah}</p>
                )}
              </div>

              {hadiah.map((h) => (
                <p key={h.kunci} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[0.9375rem]">
                  🎁 <b>Anda punya hadiah</b>
                  {h.hangus ? `, berlaku sampai ${tglLoyalti.format(new Date(`${h.hangus}T00:00:00Z`))}` : ""}. Sebutkan pilihan hadiah ke admin saat memesan berikutnya.
                </p>
              ))}
              {lp.sk ? (
                <details className="px-1 text-sm text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">Syarat &amp; ketentuan</summary>
                  <p className="mt-1.5 whitespace-pre-line">{lp.sk}</p>
                </details>
              ) : null}
            </section>
          );
        })}

        <a href={wa} target="_blank" rel="noopener" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border bg-card px-5 font-medium hover:bg-accent">
          <MessageCircle className="size-4" />
          Chat admin di WhatsApp
        </a>
      </div>
    </main>
  );
}
