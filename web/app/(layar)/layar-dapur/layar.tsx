"use client";

import { Volume2, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { toast } from "sonner";

import { teksSisa } from "@/lib/dapur-layar";
import type { OrderLayar } from "@/lib/pesanan-dapur";
import { ambangPengumuman, jamSuara, LABEL_STATUS_DAPUR, menitMenuju, STATUS_DAPUR, statusDapurBerikutnya, tandaiAmbang } from "@/lib/tim";

import { catatStatusDapur } from "./actions";

export type { OrderLayar };

const LABEL_STATUS = { berangkat: "🚐 Berangkat", tiba: "✅ Sampai", selesai: "🏁 Selesai" } as const;
/** Data dianggap basi bila tidak diperbarui selama ini (disegarkan tiap 60 detik). */
const BATAS_BASI_MS = 3 * 60_000;

/* ---------- Suara: "ding-dong" lalu kalimat ---------- */

let audio: AudioContext | null = null;

/**
 * Dua nada lembut sebelum pengumuman: membangunkan speaker Bluetooth/aux yang tidur (kata pertama
 * tidak terpotong) dan memberi tanda "dengarkan" seperti panggilan loket. Dibuat dari WebAudio, tanpa berkas.
 */
function dingDong() {
  if (!audio) return;
  const mulai = audio.currentTime + 0.05;
  [
    [784, 0],
    [587, 0.55],
  ].forEach(([nada, jeda]) => {
    const osc = audio!.createOscillator();
    const vol = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = nada;
    vol.gain.setValueAtTime(0.0001, mulai + jeda);
    vol.gain.exponentialRampToValueAtTime(0.35, mulai + jeda + 0.03);
    vol.gain.exponentialRampToValueAtTime(0.0001, mulai + jeda + 0.9);
    osc.connect(vol).connect(audio!.destination);
    osc.start(mulai + jeda);
    osc.stop(mulai + jeda + 1);
  });
}

function bicara(teks: string) {
  dingDong();
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(teks);
  u.lang = "id-ID";
  u.rate = 0.9;
  // Kalimat menunggu ding-dong selesai.
  setTimeout(() => window.speechSynthesis.speak(u), audio ? 1500 : 0);
}

/* ---------- Layar tetap menyala (Screen Wake Lock) ---------- */

function useLayarMenyala(aktif: boolean) {
  useEffect(() => {
    if (!aktif || !("wakeLock" in navigator)) return;
    let kunci: WakeLockSentinel | null = null;
    const minta = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((k) => (kunci = k))
        .catch(() => {});
    };
    minta();
    // Kunci lepas saat tab disembunyikan; diminta lagi begitu terlihat.
    document.addEventListener("visibilitychange", minta);
    return () => {
      document.removeEventListener("visibilitychange", minta);
      void kunci?.release().catch(() => {});
    };
  }, [aktif]);
}

/* ---------- Tombol status masak per kloter (D-056) ---------- */

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
                toast.error(e instanceof Error ? e.message : "Gagal.");
              }
            })
          }
          className="min-h-12 rounded-full border border-[#2a342d] bg-[#2a342d] px-4 text-base font-semibold transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {LABEL_STATUS_DAPUR[berikut]}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Kartu pesanan ---------- */

function KartuPesanan({ o, sisa, ringkas = false }: { o: OrderLayar; sisa: string | null; ringkas?: boolean }) {
  return (
    <article className="rounded-2xl border border-[#2a342d] bg-[#1e2620] p-4 lg:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={`min-w-0 font-bold ${ringkas ? "text-xl lg:text-2xl" : "text-2xl lg:text-3xl"}`}>{o.nama}</p>
        {o.jamTeks ? (
          <p className="text-lg font-semibold text-[#d9b56c] tabular-nums lg:text-2xl">
            ⏰ {o.jamTeks}
            {sisa ? <span className="ml-2 font-normal text-[#c9d1cb]">· {sisa}</span> : null}
          </p>
        ) : null}
      </div>
      {o.tempat ? <p className="text-sm text-[#9aa59d] lg:text-base">📍 {o.tempat}</p> : null}

      {o.catatanDapur ? (
        <div className="mt-3 rounded-xl border border-[#d9b56c]/50 bg-[#3a2f1a] px-4 py-3">
          <p className="text-xs font-bold tracking-[0.12em] text-[#d9b56c] uppercase lg:text-sm">Catatan dapur</p>
          <p className="mt-1 text-lg font-semibold whitespace-pre-line lg:text-2xl">{o.catatanDapur}</p>
        </div>
      ) : null}

      <ul className="mt-3 flex flex-col gap-3">
        {(ringkas ? o.items.filter((i) => i.jumlah !== null) : o.items).map((i, n) => (
          <li key={n}>
            {i.jumlah === null ? (
              <p className="text-sm font-bold tracking-[0.08em] text-[#9aa59d] uppercase lg:text-base">{i.nama}</p>
            ) : (
              <p className={ringkas ? "text-base lg:text-xl" : "text-lg lg:text-2xl"}>
                {i.jam ? <span className="mr-2 text-[#d9b56c] tabular-nums">⏰ {i.jam}</span> : null}
                {i.nama} = <b className="tabular-nums">{i.jumlah}</b>
              </p>
            )}
            {i.isi.length && !ringkas ? (
              <p className="text-sm text-[#c9d1cb] lg:text-lg">{i.isi.map((n) => (i.ket?.[n] ? `${n} (${i.ket[n]})` : n)).join(" · ")}</p>
            ) : null}
            {i.catatan.length && !ringkas
              ? i.catatan.map((c, k) => (
                  <p key={k} className="text-sm whitespace-pre-line text-[#e8cf9a] italic lg:text-lg">
                    {c}
                  </p>
                ))
              : null}
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ---------- Layar ---------- */

export function LayarDapur({
  tanggal,
  besok,
  order,
  orderBesok,
  dapur,
  dibuat,
}: {
  tanggal: string;
  besok: string;
  order: OrderLayar[];
  orderBesok: OrderLayar[];
  dapur: "masak" | "pastry" | null;
  /** Waktu server menyusun data (ms) — untuk tanda "data belum diperbarui". */
  dibuat: number;
}) {
  const router = useRouter();
  const [kini, setKini] = useState<Date | null>(null);
  const [suara, setSuara] = useState(false);
  const [daring, setDaring] = useState(true);
  const diumumkan = useRef(new Map<string, number[]>());
  useLayarMenyala(suara);

  useEffect(() => {
    const t = setInterval(() => setKini(new Date()), 1000);
    const r = setInterval(() => router.refresh(), 60_000);
    const ubahDaring = () => {
      setDaring(navigator.onLine);
      if (navigator.onLine) router.refresh();
    };
    window.addEventListener("online", ubahDaring);
    window.addEventListener("offline", ubahDaring);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- jam & status jaringan baru diketahui di browser
    setKini(new Date());
    setDaring(navigator.onLine);
    return () => {
      clearInterval(t);
      clearInterval(r);
      window.removeEventListener("online", ubahDaring);
      window.removeEventListener("offline", ubahDaring);
    };
  }, [router]);

  // Pengumuman suara (hanya setelah tombol suara ditekan — browser mewajibkan sentuhan pertama).
  // Kloter: jam berangkat. Pesanan tanpa kloter: jam pesanan yang diketik tim.
  useEffect(() => {
    if (!suara || !kini) return;
    const umumkan = (kunci: string, jam: string, kalimat: (menit: number) => string) => {
      const menit = menitMenuju(tanggal, jam, kini);
      const ambang = ambangPengumuman(menit, diumumkan.current.get(kunci) ?? []);
      if (ambang === null || menit === null) return;
      diumumkan.current.set(kunci, [...(diumumkan.current.get(kunci) ?? []), ...tandaiAmbang(ambang)]);
      bicara(kalimat(menit));
    };
    for (const o of order) {
      const isi = o.items
        .filter((i) => i.jumlah)
        .map((i) => `${i.nama}, ${i.jumlah!.toLowerCase()}`)
        .join(". ");
      for (const k of o.kloter) {
        if (!k.status) umumkan(`kloter-${k.id}`, k.jam, (m) => `Perhatian dapur. ${o.nama}, kloter ${k.no}, berangkat ${jamSuara(k.jam)}, ${m} menit lagi. ${isi}.`);
      }
      if (!o.kloter.length && o.jam) umumkan(`pesanan-${o.id}`, o.jam, (m) => `Perhatian dapur. Pesanan ${o.nama}, ${jamSuara(o.jam!)}, ${m} menit lagi.`);
    }
  }, [kini, suara, order, tanggal]);

  const fmtJam = (d: Date, detik = true) =>
    new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", ...(detik ? { second: "2-digit" } : {}), timeZone: "Asia/Jakarta" }).format(d);
  const fmtHari = (t: string, tahun = true) =>
    new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", ...(tahun ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));
  const jam = kini ? fmtJam(kini) : "--.--";
  const basi = kini !== null && (!daring || kini.getTime() - dibuat > BATAS_BASI_MS);
  const sisaPesanan = (o: OrderLayar) => (kini && o.jam ? teksSisa(menitMenuju(tanggal, o.jam, kini)) : null);
  const namaDapur = dapur === "masak" ? "Dapur Masak" : dapur === "pastry" ? "Dapur Pastry/Bersih" : null;

  // Jadwal hari ini: tiap pesanan (jam pesanan) dan tiap kloternya (jam berangkat), urut jam.
  const jadwal = order
    .flatMap((o): { kunci: string; jam: string; judul: string; kloter: OrderLayar["kloter"][number] | null }[] =>
      o.kloter.length
        ? o.kloter.map((k) => ({ kunci: `k-${k.id}`, jam: k.jam, judul: `Kloter ${k.no} · ${o.nama}`, kloter: k }))
        : o.jam
          ? [{ kunci: `o-${o.id}`, jam: o.jam, judul: o.nama, kloter: null }]
          : [],
    )
    .sort((a, b) => a.jam.localeCompare(b.jam));

  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold tracking-[0.14em] text-[#d9b56c] uppercase lg:text-4xl">Dapur Tiska</p>
          <p className="text-sm text-[#9aa59d] lg:text-lg">{fmtHari(tanggal)}</p>
          {/* Pilihan dapur (D-097): tiap TV bisa di-bookmark ke dapurnya sendiri. */}
          <nav className="mt-2 flex flex-wrap gap-2" aria-label="Pilih dapur">
            {(
              [
                [null, "Semua"],
                ["masak", "Dapur Masak"],
                ["pastry", "Dapur Pastry/Bersih"],
              ] as const
            ).map(([d, label]) => (
              <a
                key={label}
                href={d ? `/layar-dapur?dapur=${d}` : "/layar-dapur"}
                aria-current={dapur === d ? "page" : undefined}
                className={`min-h-10 content-center rounded-full border px-4 text-sm font-semibold transition-colors lg:text-base ${dapur === d ? "border-[#d9b56c] bg-[#d9b56c] text-[#111712]" : "border-[#2a342d] bg-[#1e2620] text-[#c9d1cb] hover:border-[#d9b56c]/60"}`}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-end gap-4">
          {!suara ? (
            <button
              type="button"
              onClick={() => {
                // Dibuat di dalam sentuhan: browser hanya mengizinkan suara setelah layar disentuh.
                audio ??= new AudioContext();
                void audio.resume();
                setSuara(true);
                bicara("Suara layar dapur aktif.");
              }}
              className="flex min-h-12 items-center gap-2 rounded-full border border-[#2a342d] bg-[#1e2620] px-5 text-base font-semibold transition-transform active:scale-[0.97]"
            >
              <Volume2 className="size-5" />
              Nyalakan suara
            </button>
          ) : (
            <button
              type="button"
              onClick={() => bicara("Tes suara layar dapur. Satu, dua, tiga.")}
              className="flex min-h-12 items-center gap-2 rounded-full border border-[#2a342d] px-5 text-base font-semibold text-[#c9d1cb] transition-transform active:scale-[0.97]"
            >
              <Volume2 className="size-5" />
              Tes suara
            </button>
          )}
          <p className="text-5xl font-bold tabular-nums lg:text-8xl">{jam}</p>
        </div>
      </header>

      {basi ? (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-[#d9b56c]/60 bg-[#3a2a1c] px-4 py-3 text-lg font-semibold lg:text-2xl">
          <WifiOff className="size-6 shrink-0 text-[#d9b56c]" />
          {daring
            ? `Data belum diperbarui sejak ${fmtJam(new Date(dibuat), false)}. Periksa internet TV ini.`
            : `Internet TV ini putus. Data terakhir ${fmtJam(new Date(dibuat), false)} — pesanan baru belum terlihat.`}
        </div>
      ) : null}

      {order.length === 0 ? (
        <section className="flex flex-1 flex-col gap-4">
          <p className="rounded-2xl border border-[#2a342d] bg-[#171e19] px-5 py-4 text-xl text-[#9aa59d] lg:text-2xl">
            {namaDapur ? `Tidak ada tugas ${namaDapur} hari ini.` : "Tidak ada pesanan hari ini."}
          </p>
          <h2 className="text-sm font-bold tracking-[0.12em] text-[#9aa59d] uppercase lg:text-lg">Persiapan besok · {fmtHari(besok, false)}</h2>
          {orderBesok.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {orderBesok.map((o) => (
                <KartuPesanan key={o.id} o={o} sisa={null} />
              ))}
            </div>
          ) : (
            <p className="text-lg text-[#9aa59d] lg:text-xl">Besok juga belum ada pesanan.</p>
          )}
        </section>
      ) : (
        <div className="grid flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-[0.12em] text-[#9aa59d] uppercase lg:text-lg">Pesanan hari ini</h2>
            {order.map((o) => (
              <KartuPesanan key={o.id} o={o} sisa={sisaPesanan(o)} />
            ))}
          </section>
          <aside className="flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-[0.12em] text-[#9aa59d] uppercase lg:text-lg">Jadwal hari ini</h2>
            <div className="overflow-hidden rounded-2xl border border-[#2a342d] bg-[#1e2620]">
              {jadwal.map((j) => {
                const menit = kini ? menitMenuju(tanggal, j.jam, kini) : null;
                const status = j.kloter?.status ?? null;
                const mepet = !status && menit !== null && menit >= 0 && menit <= 30;
                return (
                  <div key={j.kunci} className={`flex items-center justify-between gap-3 border-b border-[#2a342d] p-3 transition-colors duration-1000 last:border-b-0 ${mepet ? "bg-[#3a2a1c]" : ""}`}>
                    <div className="min-w-0">
                      <p className="text-3xl font-bold tabular-nums lg:text-4xl">{j.jam}</p>
                      <p className="truncate text-sm text-[#9aa59d] lg:text-base">{j.judul}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-right text-lg font-semibold lg:text-2xl">
                        {status ? LABEL_STATUS[status] : menit === null ? "" : (teksSisa(menit) ?? (j.kloter ? "Lewat jam" : "Sedang berjalan"))}
                      </p>
                      {j.kloter && !status ? <TombolDapur idKloter={j.kloter.id} sudah={j.kloter.dapur} /> : null}
                    </div>
                  </div>
                );
              })}
              {jadwal.length === 0 ? <p className="p-4 text-[#9aa59d]">Jam pesanan belum diisi di invoice.</p> : null}
            </div>

            <h2 className="mt-2 text-sm font-bold tracking-[0.12em] text-[#9aa59d] uppercase lg:text-lg">Besok · {fmtHari(besok, false)}</h2>
            {orderBesok.length ? (
              orderBesok.map((o) => <KartuPesanan key={o.id} o={o} sisa={null} ringkas />)
            ) : (
              <p className="text-base text-[#9aa59d] lg:text-lg">Belum ada pesanan besok.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
