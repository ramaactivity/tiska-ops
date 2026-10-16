"use client";

import { Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { toast } from "sonner";

import { ambangPengumuman, jamSuara, LABEL_STATUS_DAPUR, menitMenuju, STATUS_DAPUR, statusDapurBerikutnya, tandaiAmbang } from "@/lib/tim";

import { catatStatusDapur } from "./actions";

const alertLembut = (pesan: string) => toast.error(pesan);

export type OrderLayar = {
  id: string;
  nama: string;
  tempat: string | null;
  items: { nama: string; jumlah: string; jam: string | null; isi: string[] }[];
  kloter: { id: string; no: number; jam: string; status: "berangkat" | "tiba" | "selesai" | null; dapur: string[] }[];
};

const LABEL_STATUS = { berangkat: "🚐 Berangkat", tiba: "✅ Sampai", selesai: "🏁 Selesai" } as const;

function bicara(teks: string) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(teks);
  u.lang = "id-ID";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

/** Papan dapur: jam besar, order hari ini, kloter + hitung mundur, pengumuman suara T-60/30/15. */
function TombolDapur({ idKloter, sudah }: { idKloter: string; sudah: string[] }) {
  const [menunggu, mulai] = useTransition();
  const berikut = statusDapurBerikutnya(sudah);
  const terakhir = [...STATUS_DAPUR].reverse().find((s) => sudah.includes(s));
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {terakhir ? <span className="text-base text-[#73d39e] lg:text-lg">{LABEL_STATUS_DAPUR[terakhir]}</span> : null}
      {berikut ? (
        <button
          type="button"
          disabled={menunggu}
          onClick={() =>
            mulai(async () => {
              try {
                await catatStatusDapur(idKloter, berikut);
              } catch (e) {
                alertLembut(e instanceof Error ? e.message : "Gagal.");
              }
            })
          }
          className="min-h-12 rounded-full border border-[#2a342d] bg-[#2a342d] px-4 text-base font-semibold disabled:opacity-60"
        >
          {LABEL_STATUS_DAPUR[berikut]}
        </button>
      ) : null}
    </div>
  );
}

export function LayarDapur({ tanggal, order }: { tanggal: string; order: OrderLayar[] }) {
  const router = useRouter();
  const [kini, setKini] = useState<Date | null>(null);
  const [suara, setSuara] = useState(false);
  const diumumkan = useRef(new Map<string, number[]>());

  useEffect(() => {
    const t = setInterval(() => setKini(new Date()), 1000);
    const r = setInterval(() => router.refresh(), 60_000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- jam baru diketahui di browser
    setKini(new Date());
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, [router]);

  // Pengumuman suara (hanya setelah tombol suara ditekan — browser mewajibkan sentuhan pertama).
  useEffect(() => {
    if (!suara || !kini) return;
    for (const o of order) {
      for (const k of o.kloter) {
        if (k.status) continue;
        const menit = menitMenuju(tanggal, k.jam, kini);
        const ambang = ambangPengumuman(menit, diumumkan.current.get(k.id) ?? []);
        if (ambang === null) continue;
        diumumkan.current.set(k.id, [...(diumumkan.current.get(k.id) ?? []), ...tandaiAmbang(ambang)]);
        const isi = o.items.map((i) => `${i.nama}, ${i.jumlah.toLowerCase()}`).join(". ");
        bicara(`Perhatian dapur. ${o.nama}, kloter ${k.no}, berangkat ${jamSuara(k.jam)}, ${menit} menit lagi. ${isi}.`);
      }
    }
  }, [kini, suara, order, tanggal]);

  const jam = kini ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }).format(kini) : "--.--";
  const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${tanggal}T00:00:00Z`));

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold tracking-[0.14em] text-[#d9b56c] uppercase lg:text-4xl">Dapur Tiska</p>
          <p className="text-sm text-[#9aa59d] lg:text-lg">{hari}</p>
        </div>
        <div className="flex items-end gap-4">
          {!suara ? (
            <button
              type="button"
              onClick={() => {
                setSuara(true);
                bicara("Suara layar dapur aktif.");
              }}
              className="flex min-h-12 items-center gap-2 rounded-full border border-[#2a342d] bg-[#1e2620] px-5 text-base font-semibold"
            >
              <Volume2 className="size-5" />
              Nyalakan suara
            </button>
          ) : null}
          <p className="text-5xl font-bold tabular-nums lg:text-8xl">{jam}</p>
        </div>
      </header>

      {order.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-[#2a342d] bg-[#171e19] p-10 text-center text-2xl text-[#9aa59d]">
          Tidak ada order untuk hari ini.
        </div>
      ) : (
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-[0.12em] text-[#9aa59d] uppercase lg:text-lg">Order hari ini</h2>
            {order.map((o) => (
              <article key={o.id} className="rounded-2xl border border-[#2a342d] bg-[#1e2620] p-4">
                <p className="text-2xl font-bold lg:text-3xl">{o.nama}</p>
                {o.tempat ? <p className="text-sm text-[#9aa59d] lg:text-base">📍 {o.tempat}</p> : null}
                <ul className="mt-2 flex flex-col gap-2">
                  {o.items.map((i, n) => (
                    <li key={n}>
                      <p className="text-lg lg:text-2xl">
                        {i.jam ? <span className="mr-2 text-[#d9b56c] tabular-nums">⏰ {i.jam}</span> : null}
                        {i.nama} = <b className="tabular-nums">{i.jumlah}</b>
                      </p>
                      {i.isi.length ? <p className="text-sm text-[#9aa59d] lg:text-lg">{i.isi.join(" · ")}</p> : null}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
          <aside className="flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-[0.12em] text-[#9aa59d] uppercase lg:text-lg">Jadwal angkut</h2>
            <div className="overflow-hidden rounded-2xl border border-[#2a342d] bg-[#1e2620]">
              {order.flatMap((o) =>
                o.kloter.map((k) => {
                  const menit = kini ? menitMenuju(tanggal, k.jam, kini) : null;
                  const mepet = !k.status && menit !== null && menit <= 30;
                  return (
                    <div key={k.id} className={`flex items-center justify-between gap-3 border-b border-[#2a342d] p-3 transition-colors duration-1000 last:border-b-0 ${mepet ? "bg-[#3a2a1c]" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-3xl font-bold tabular-nums lg:text-4xl">{k.jam}</p>
                        <p className="truncate text-sm text-[#9aa59d] lg:text-base">
                          Kloter {k.no} · {o.nama}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className="text-right text-lg font-semibold lg:text-2xl">
                          {k.status ? LABEL_STATUS[k.status] : menit === null ? "" : menit >= 0 ? `${menit} menit lagi` : "Lewat jam"}
                        </p>
                        {!k.status ? <TombolDapur idKloter={k.id} sudah={k.dapur} /> : null}
                      </div>
                    </div>
                  );
                }),
              )}
              {order.every((o) => o.kloter.length === 0) ? <p className="p-4 text-[#9aa59d]">Belum ada kloter dijadwalkan.</p> : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
