"use client";

import { MapPin, Volume2, WifiOff } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  bagiHalaman,
  type Halaman,
  jamPertama,
  namaTempat,
  pecahNama,
  pisahSesi,
  teksSisa,
} from "@/lib/dapur-layar";
import { IDENTITAS } from "@/lib/kit-brand";
import type { AgendaHari, OrderLayar, UltahDekat } from "@/lib/pesanan-dapur";
import { durasiRunning } from "@/lib/kontrol-dapur";
import {
  type LangkahTayang,
  linimasa,
  posisi,
  type Rencana,
  tanpaEmoji as teksLayar,
} from "@/lib/rencana-masak";
import { menitMenuju } from "@/lib/tim";

/* ==========================================================================
   MODE TV — papan antrian dapur (Rama 26 Nov 2026). TV 32 inci dipasang tinggi,
   dibaca pekerja dapur yang kebanyakan orang tua dari ±3–4 m.

   Bahasa visual dari referensi poster yang dipilih Rama (jadwal acara, hitung
   mundur, jam layanan): latar biru pekat bercahaya, informasi di BARIS PUTIH
   membulat dengan UBIN KUNING di depannya, satu angka raksasa sebagai pusat
   (jam target dalam ubin ala jam flip), STRIP ANTRIAN di bawah seperti strip
   kalender dengan sel yang sedang tayang menyala kuning.

   - Ukuran memakai vh: sama besar di TV 1366×768 maupun 1080p.
   - Tidak pernah digulir: halaman berganti sendiri tiap DURASI_MS. Strip antrian
     menunjukkan semua halaman (sesi/pesanan) — nanti digerakkan tombol Next dari
     halaman Kontrol Dapur (docs/23).
   ========================================================================== */

const DURASI_MS = 20_000;
const PUDAR_MS = 800;
/** Pembesaran maksimal halaman yang isinya sedikit. */
const SKALA_MAKS = 1.3;

const W = {
  tinta: "#142074",
  tintaRedup: "#4A5688",
  putih: "#FFFFFF",
  redup: "#C9D2F5",
  garis: "rgba(255,255,255,0.18)",
  kuning: "#FFD84D",
  amber: "#FFB547",
  koral: "#FF7A5C",
};
const TEBAL: CSSProperties = { fontWeight: 800, letterSpacing: "-0.03em" };
const BAYANGAN = "0 1vh 2.6vh rgba(6,12,60,0.28)";

type Item = OrderLayar["items"][number];
type Blok =
  | {
      kunci: string;
      jenis: "sesi";
      teks: string;
      order: OrderLayar;
      besok: boolean;
      halamanBaru: boolean;
    }
  | {
      kunci: string;
      jenis: "item";
      item: Item;
      nama: string;
      sesi: string | null;
      order: OrderLayar;
      besok: boolean;
      halamanBaru: boolean;
    };

function blokPesanan(daftar: OrderLayar[], besok: boolean): Blok[] {
  return daftar.flatMap((o) => {
    const hasil: Blok[] = [];
    let sesiKini: string | null = null;
    o.items.forEach((item, n) => {
      const { sesi, nama } = pisahSesi(item.nama);
      if (sesi && sesi !== sesiKini)
        hasil.push({
          kunci: `${besok ? "b" : "h"}-${o.id}-s${n}`,
          jenis: "sesi",
          teks: sesi,
          order: o,
          besok,
          halamanBaru: hasil.length === 0,
        });
      if (sesi) sesiKini = sesi;
      hasil.push({
        kunci: `${besok ? "b" : "h"}-${o.id}-${n}`,
        jenis: "item",
        item,
        nama,
        sesi: sesiKini,
        order: o,
        besok,
        halamanBaru: hasil.length === 0,
      });
    });
    return hasil;
  });
}

/** "1.693 BOX" → ["1.693", "box"]; "2 × 30 PAX" → ["2 × 30", "pax"]. */
function pecahJumlah(j: string): [string, string] {
  const m = /^(.*?)\s*([A-Za-z][\w./-]*)$/.exec(j.trim());
  return m && m[1] ? [m[1], m[2].toLowerCase()] : [j, ""];
}

/** "STARTER" → "Starter" — judul yang diketik kapital semua dibaca sebagai kalimat biasa. */
const kalimat = (t: string) =>
  t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;

/** Judul sesi: jamnya dipisah, sisanya jadi judul ("SESI I PAGI · TIBA DI LOKASI"). */
function judulSesi(teks: string): { jam: string | null; judul: string } {
  const judul = teks
    .replace(/(?<!\d)([01]?\d|2[0-3])[.:]([0-5]\d)(?!\d)/, "")
    .replace(/\s+[-–]\s+/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[-–·]\s*|\s*[-–·]$/g, "")
    .replace(/\s*·\s*·\s*/g, " · ")
    .trim();
  return { jam: jamPertama(teks), judul };
}

/* ---------- Isi kanan: judul sesi & baris menu putih ---------- */

function JudulSesi({ teks }: { teks: string }) {
  const { jam, judul } = judulSesi(teks);
  return (
    <div className="flex items-center gap-[1.2vw] pt-[0.6vh] pb-[1.6vh]">
      {jam ? (
        <span
          className="rounded-[1.2vh] px-[1vw] py-[0.4vh] text-[4vh] leading-tight tabular-nums"
          style={{ ...TEBAL, background: W.kuning, color: W.tinta }}
        >
          {jam}
        </span>
      ) : null}
      <p
        className="min-w-0 text-[3.8vh] leading-tight text-balance uppercase"
        style={{ ...TEBAL, letterSpacing: "-0.01em" }}
      >
        {judul}
      </p>
    </div>
  );
}

function BarisMenu({ b }: { b: Extract<Blok, { jenis: "item" }> }) {
  const i = b.item;
  const isi = i.isi
    .map((n) => (i.ket?.[n] ? `${n} (${i.ket[n]})` : n))
    .join(" · ");
  const [angka, satuan] = i.jumlah ? pecahJumlah(i.jumlah) : ["", ""];
  // Nama panjang dipecah: judul pendek besar + keterangan di bawahnya (tidak tiga baris raksasa).
  const { utama, detail } = pecahNama(b.nama ? kalimat(b.nama) : "");
  const tinta2 = "#27326E";

  // Judul kelompok buffet ("Starter", "Maincourse"): baris ringan tanpa ubin angka.
  if (i.jumlah === null) {
    return (
      <div className="pb-[1.2vh]">
        <div
          className="rounded-[1.8vh] px-[1.4vw] py-[1.2vh]"
          style={{ background: "rgba(255,255,255,0.88)", color: W.tinta }}
        >
          <p className="text-[3.2vh] leading-tight font-extrabold">{utama}</p>
          {isi ? (
            <p
              className="mt-[0.3vh] text-[3.4vh] leading-[1.3] font-semibold"
              style={{ color: tinta2 }}
            >
              {isi}
            </p>
          ) : null}
          {i.catatan.map((c, k) => (
            <p
              key={k}
              className="mt-[0.4vh] text-[3vh] leading-[1.3] font-semibold whitespace-pre-line italic"
              style={{ color: "#B4561B" }}
            >
              {c}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-[1.4vh]">
      <div
        className="flex items-stretch gap-[1.4vw] rounded-[2vh] p-[1.2vh]"
        style={{ background: W.putih, color: W.tinta, boxShadow: BAYANGAN }}
      >
        <div
          className="flex w-[10.5vw] shrink-0 flex-col items-center justify-center rounded-[1.4vh] px-[0.4vw] py-[1vh]"
          style={{ background: W.kuning }}
        >
          <p
            className={`${angka.length >= 5 ? "text-[6.2vh]" : "text-[8vh]"} leading-[0.9] whitespace-nowrap tabular-nums`}
            style={TEBAL}
          >
            {angka}
          </p>
          <p className="text-[2.8vh] font-bold">{satuan}</p>
        </div>
        <div className="min-w-0 self-center py-[0.4vh] pr-[1vw]">
          {utama ? (
            <p
              className="line-clamp-2 text-[4.6vh] leading-[1.08]"
              style={{ ...TEBAL, letterSpacing: "-0.02em" }}
            >
              {i.jam ? (
                <span className="mr-[0.8vw] tabular-nums">{i.jam}</span>
              ) : null}
              {utama}
            </p>
          ) : null}
          {detail ? (
            <p
              className="mt-[0.4vh] text-[3.3vh] leading-[1.2] font-bold"
              style={{ color: tinta2 }}
            >
              {detail}
            </p>
          ) : null}
          {isi ? (
            <p
              className={
                utama
                  ? "mt-[0.6vh] text-[3.3vh] leading-[1.3] font-medium"
                  : "text-[4vh] leading-[1.25] font-bold"
              }
              style={{ color: utama ? tinta2 : W.tinta }}
            >
              {isi}
            </p>
          ) : null}
          {i.catatan.map((c, k) => (
            <p
              key={k}
              className="mt-[0.5vh] text-[3.1vh] leading-[1.3] font-semibold whitespace-pre-line italic"
              style={{ color: "#B4561B" }}
            >
              {c}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function IsiBlok({ b }: { b: Blok }) {
  return b.jenis === "sesi" ? <JudulSesi teks={b.teks} /> : <BarisMenu b={b} />;
}

/* ---------- Kolom kiri: jam target ala jam flip ---------- */

function UbinJam({ jam, warna }: { jam: string; warna: string }) {
  const [j, m] = jam.split(".");
  const ubin =
    "flex items-center justify-center rounded-[2vh] px-[1.2vw] tabular-nums";
  return (
    <div className="flex items-center gap-[0.8vw]">
      {[j, m].map((d, n) => (
        <span
          key={n}
          className={`${ubin} relative h-[24vh] min-w-[13.5vw] overflow-hidden`}
          style={{ background: W.putih, color: W.tinta, boxShadow: BAYANGAN }}
        >
          <span className="text-[20.5vh] leading-none" style={TEBAL}>
            {d}
          </span>
          {/* Garis tengah ubin jam flip. */}
          <span
            className="absolute inset-x-0 top-1/2 h-[0.35vh] -translate-y-1/2"
            style={{ background: "rgba(20,32,116,0.14)" }}
          />
          <span
            className="absolute inset-x-0 bottom-0 h-[0.8vh] transition-colors duration-1000"
            style={{ background: warna }}
          />
        </span>
      ))}
    </div>
  );
}

/** Warna pengingat: biasa → ≤60 menit amber → ≤15 menit koral. Berganti pelan, tanpa kedip. */
function nadaMenit(
  menit: number | null,
  besok: boolean,
): { latar: string; teks: string } {
  if (besok || menit === null || menit < 0 || menit > 60)
    return { latar: "rgba(255,255,255,0.14)", teks: W.putih };
  return menit <= 15
    ? { latar: W.koral, teks: W.tinta }
    : { latar: W.amber, teks: W.tinta };
}

function KolomWaktu({
  o,
  jamTarget,
  besok,
  labelBesok,
  kini,
  tanggal,
  bagian,
}: {
  o: OrderLayar;
  jamTarget: string | null;
  besok: boolean;
  labelBesok: string;
  kini: Date | null;
  tanggal: string;
  bagian: { ke: number; dari: number; kunci: string } | null;
}) {
  const menit =
    !besok && kini && jamTarget ? menitMenuju(tanggal, jamTarget, kini) : null;
  const nada = nadaMenit(menit, besok);
  const status = besok
    ? `Besok · ${labelBesok}`
    : (teksSisa(menit) ?? (menit !== null ? "Sedang berjalan" : null));
  return (
    <section className="flex min-h-0 w-full flex-col gap-[2vh] overflow-hidden">
      {jamTarget ? (
        <UbinJam
          jam={jamTarget}
          warna={
            nada.latar === "rgba(255,255,255,0.14)" ? W.kuning : nada.latar
          }
        />
      ) : (
        <p className="text-[4vh] font-bold" style={{ color: W.redup }}>
          Jam belum diisi di invoice
        </p>
      )}
      {status ? (
        <p
          className="self-start rounded-full px-[1.4vw] py-[0.8vh] text-[3.8vh] leading-tight transition-colors duration-1000"
          style={{
            ...TEBAL,
            letterSpacing: "-0.01em",
            background: nada.latar,
            color: nada.teks,
          }}
        >
          {status}
        </p>
      ) : null}

      <div className="mt-[1vh]">
        <p
          className="line-clamp-2 text-[5.6vh] leading-[1.05] text-balance"
          style={TEBAL}
        >
          {o.nama}
        </p>
        {namaTempat(o.tempat) ? (
          <p
            className="mt-[1vh] flex gap-[0.6vw] text-[2.8vh] leading-snug font-medium"
            style={{ color: W.redup }}
          >
            <MapPin
              className="mt-[0.4vh] size-[2.8vh] shrink-0"
              strokeWidth={2}
            />
            <span className="truncate">{namaTempat(o.tempat)}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-[1.6vh]">
        {/* Pesanan yang butuh beberapa halaman: garis per halaman, yang tayang berjalan (pengganti strip satu sel). */}
        {bagian ? (
          <div>
            <p
              className="text-[2.8vh] font-semibold"
              style={{ color: W.redup }}
            >
              Bagian {bagian.ke} dari {bagian.dari}
            </p>
            <div className="mt-[1vh] flex gap-[0.5vw]">
              {Array.from({ length: bagian.dari }, (_, n) => (
                <span
                  key={n}
                  className="h-[0.8vh] flex-1 overflow-hidden rounded-full"
                  style={{ background: n < bagian.ke - 1 ? W.redup : W.garis }}
                >
                  {n === bagian.ke - 1 ? (
                    <span
                      key={bagian.kunci}
                      className="block h-full origin-left"
                      style={{
                        background: W.kuning,
                        animation: `jalan-halaman ${DURASI_MS}ms linear`,
                      }}
                    />
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {o.catatanDapur ? (
          <div
            className="rounded-[2vh] px-[1.4vw] py-[1.6vh]"
            style={{
              background: W.kuning,
              color: W.tinta,
              boxShadow: BAYANGAN,
            }}
          >
            <p className="text-[2.8vh] font-extrabold">Catatan dapur</p>
            <p className="mt-[0.4vh] line-clamp-5 text-[3.6vh] leading-[1.2] font-bold whitespace-pre-line">
              {o.catatanDapur}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Layar penuh: tombol F11/⌃⌘F browser (tanpa fullscreenElement) maupun mode layar penuh halaman. */
export const layarPenuh = () =>
  Boolean(document.fullscreenElement) ||
  (window.innerHeight >= screen.height - 2 &&
    window.innerWidth >= screen.width - 2);
const pantauPenuh = (ubah: () => void) => {
  window.addEventListener("resize", ubah);
  document.addEventListener("fullscreenchange", ubah);
  return () => {
    window.removeEventListener("resize", ubah);
    document.removeEventListener("fullscreenchange", ubah);
  };
};

/* ---------- Mode santai: slide di hari tanpa pesanan (Rama 26 Nov) ---------- */

type Slide =
  | { jenis: "halaman"; i: number }
  | { jenis: "rencana" }
  | { jenis: "persiapan" }
  | { jenis: "agenda" }
  | { jenis: "ultah" }
  | { jenis: "tiska" };

const hariPendek = (t: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${t}T00:00:00Z`));
const tglAngka = (t: string) => Number(t.slice(8, 10));
const BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Agenda 7 hari: strip kalender (hari berpesanan menyala) + daftar pesanan berikut beban kerjanya. */
function SlideAgenda({ agenda }: { agenda: AgendaHari[] }) {
  // Pesanan berhari-hari (pemesan & jam sama, hari berurutan) digabung jadi satu baris: "Min 29 · s.d. Kam 3 · 5 hari".
  const daftar: {
    nama: string;
    jam: string | null;
    beban: string;
    tanggal: string;
    sampai: string;
    hari: number;
  }[] = [];
  agenda.forEach((h, i) => {
    for (const p of h.pesanan) {
      const lanjut = daftar.find(
        (d) =>
          d.nama === p.nama &&
          d.jam === p.jam &&
          i > 0 &&
          d.sampai === agenda[i - 1].tanggal,
      );
      if (lanjut) {
        lanjut.sampai = h.tanggal;
        lanjut.hari += 1;
      } else
        daftar.push({ ...p, tanggal: h.tanggal, sampai: h.tanggal, hari: 1 });
    }
  });
  const tampil = daftar.slice(0, 3);
  return (
    <section className="flex h-full flex-col gap-[2vh] overflow-hidden">
      <p className="shrink-0 text-[5.6vh] leading-none" style={TEBAL}>
        Agenda 7 hari ke depan
      </p>
      <ol
        className="grid shrink-0 grid-cols-7 overflow-hidden rounded-[2vh] border"
        style={{ borderColor: W.garis }}
      >
        {agenda.map((h) => {
          const ada = h.pesanan.length > 0;
          return (
            <li
              key={h.tanggal}
              className="flex flex-col items-center border-l py-[1.4vh] first:border-l-0"
              style={{
                borderColor: W.garis,
                background: ada ? W.kuning : "transparent",
                color: ada ? W.tinta : "rgba(255,255,255,0.6)",
              }}
            >
              <p className="text-[2.8vh] font-bold">{hariPendek(h.tanggal)}</p>
              <p className="text-[7vh] leading-none tabular-nums" style={TEBAL}>
                {tglAngka(h.tanggal)}
              </p>
              <p className="mt-[0.4vh] text-[2.4vh] font-bold">
                {ada ? `${h.pesanan.length} pesanan` : "—"}
              </p>
            </li>
          );
        })}
      </ol>
      {daftar.length === 0 ? (
        <p className="text-[4.4vh] font-semibold" style={{ color: W.redup }}>
          Belum ada pesanan untuk 7 hari ke depan.
        </p>
      ) : (
        <div className="flex min-h-0 flex-col gap-[1.2vh] overflow-hidden">
          {tampil.map((p, n) => (
            <div
              key={n}
              className="flex items-center gap-[1.6vw] rounded-[2vh] p-[1vh] pr-[1.6vw]"
              style={{
                background: W.putih,
                color: W.tinta,
                boxShadow: BAYANGAN,
              }}
            >
              <div
                className="flex w-[9vw] shrink-0 flex-col items-center rounded-[1.4vh] py-[0.6vh]"
                style={{ background: W.kuning }}
              >
                <p className="text-[2.4vh] font-bold">
                  {hariPendek(p.tanggal)}
                </p>
                <p
                  className="text-[4.6vh] leading-none tabular-nums"
                  style={TEBAL}
                >
                  {tglAngka(p.tanggal)}{" "}
                  <span className="text-[2.4vh]">
                    {BULAN_PENDEK[Number(p.tanggal.slice(5, 7)) - 1]}
                  </span>
                </p>
              </div>
              {p.jam ? (
                <p className="shrink-0 text-[4.4vh] tabular-nums" style={TEBAL}>
                  {p.jam}
                </p>
              ) : null}
              <p
                className="min-w-0 flex-1 truncate text-[4vh]"
                style={{ ...TEBAL, letterSpacing: "-0.015em" }}
              >
                {p.nama}
                {p.hari > 1 ? (
                  <span
                    className="ml-[0.8vw] text-[2.8vh] font-bold"
                    style={{ color: "#27326E" }}
                  >
                    s.d. {hariPendek(p.sampai)} {tglAngka(p.sampai)} · {p.hari}{" "}
                    hari
                  </span>
                ) : null}
              </p>
              {p.beban ? (
                <p
                  className="shrink-0 text-[3.2vh] font-bold"
                  style={{ color: "#27326E" }}
                >
                  {p.beban}
                </p>
              ) : null}
            </div>
          ))}
          {daftar.length > tampil.length ? (
            <p className="text-[3vh] font-semibold" style={{ color: W.redup }}>
              + {daftar.length - tampil.length} pesanan lainnya
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

/** Ulang tahun karyawan 7 hari ke depan — sapaan kecil untuk tim dapur. */
function SlideUltah({ ultah }: { ultah: UltahDekat[] }) {
  return (
    <section className="flex h-full flex-col justify-center gap-[3vh]">
      <p className="text-[9vh] leading-[0.95]" style={TEBAL}>
        Selamat ulang tahun
      </p>
      <div className="flex flex-wrap gap-[1.4vw]">
        {ultah.slice(0, 6).map((u) => (
          <div
            key={u.nama}
            className="flex items-center gap-[1.2vw] rounded-[2vh] px-[1.6vw] py-[1.4vh]"
            style={{
              background: u.lagi === 0 ? W.kuning : W.putih,
              color: W.tinta,
              boxShadow: BAYANGAN,
            }}
          >
            <p className="text-[5vh] leading-none" style={TEBAL}>
              {u.nama}
            </p>
            <p className="text-[3vh] font-bold">
              {u.lagi === 0
                ? "Hari ini"
                : `${u.hari} ${BULAN_PENDEK[u.bulan - 1]}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Slide Tiska: logo resmi utuh + tagline resmi (kit brand). */
function SlideTiska() {
  return (
    <section className="flex h-full flex-col items-center justify-center gap-[3vh] text-center">
      <Image
        src="/brand/unduh/logo-tiska-putih-mendatar.png"
        alt="Tiska Catering"
        width={1747}
        height={868}
        className="h-[28vh] w-auto"
      />
      <p className="text-[5vh]" style={TEBAL}>
        {IDENTITAS.tagline}
      </p>
      <p className="text-[3vh] font-semibold" style={{ color: W.redup }}>
        {IDENTITAS.situs}
      </p>
    </section>
  );
}

/* ---------- Jadwal persiapan (rencana masak, docs/23 P2) ---------- */

/** Isi kolom yang lebih tinggi dari wadahnya dikecilkan (lebar 1/f lalu scale f, teks mengalir ulang) — tidak terpotong. */
function usePas(kunci: string) {
  const wadah = useRef<HTMLDivElement>(null);
  const isi = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = isi.current;
    const w = wadah.current;
    if (!el || !w) return;
    const pasang = (f: number) => {
      el.style.transform = f === 1 ? "" : `scale(${f})`;
      el.style.width = f === 1 ? "" : `${100 / f}%`;
    };
    const hitung = () => {
      pasang(1);
      const tersedia = w.clientHeight;
      let f = 1;
      for (let n = 0; n < 5 && el.scrollHeight * f > tersedia; n++) {
        f *= (tersedia / (el.scrollHeight * f)) * 0.99;
        pasang(f);
      }
    };
    hitung();
    // Wadah mengecil saat running text muncul (sinyal pertama) & huruf web selesai dimuat → hitung ulang.
    void document.fonts?.ready.then(hitung);
    const amati = new ResizeObserver(hitung);
    amati.observe(w);
    return () => amati.disconnect();
  }, [kunci]);
  return { wadah, isi };
}

/** Sekarang (langkah berjalan, boleh bersamaan) + Berikutnya; kloter = baris kuning dengan muatan. */
function SlideRencana({
  langkah,
  kini,
}: {
  langkah: LangkahTayang[];
  kini: number;
}) {
  const { sekarang, berikutnya } = posisi(langkah, kini);
  const tampil = sekarang.slice(0, 3);
  // Beberapa pesanan di hari yang sama: tiap baris menyebut pesanannya (docs/24 M1).
  const banyakPesanan = new Set(langkah.map((l) => l.pesanan)).size > 1;
  const ukuran = ["5vh", "4.3vh", "3.7vh"][tampil.length - 1] ?? "3.7vh";
  const lagi = (ms: number) =>
    teksSisa(Math.max(0, Math.ceil((ms - kini) / 60_000))) ?? "sekarang";
  // "Sesi Masak-1; Snack Box, …" → "Sesi Masak-1": label pendek, rinciannya sudah ada di baris langkah.
  const sesiKini = (tampil[0]?.sesi ?? berikutnya[0]?.sesi ?? "")
    .split(";")[0]
    .trim();
  // Tidak ada yang berjalan: langkah pertama berikutnya tampil besar di kiri, jadi kanan mulai dari langkah kedua.
  const antri = tampil.length ? berikutnya : berikutnya.slice(1);
  const menit = Math.floor(kini / 60_000);
  const { wadah: kiriWadah, isi: kiriIsi } = usePas(
    `${tampil.map((l) => l.kunci).join()}|${menit}`,
  );
  const { wadah: kananWadah, isi: kananIsi } = usePas(
    `${antri
      .slice(0, 4)
      .map((l) => l.kunci)
      .join()}|${menit}`,
  );
  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(0,56fr)_minmax(0,44fr)] gap-[2.6vw]">
      <div ref={kiriWadah} className="min-h-0 overflow-hidden">
        <div
          ref={kiriIsi}
          className="flex origin-top-left flex-col gap-[1.8vh]"
        >
          <div className="flex items-baseline gap-[1.2vw]">
            <p className="shrink-0 text-[6vh] leading-none" style={TEBAL}>
              Sekarang
            </p>
            {sesiKini ? (
              <p
                className="min-w-0 text-[3vh] font-semibold"
                style={{ color: W.redup }}
              >
                {teksLayar(sesiKini)}
              </p>
            ) : null}
          </div>
          {tampil.length ? (
            tampil.map((l) => {
              const titik = l.selesai === null;
              const jalan = l.selesai
                ? Math.min(1, (kini - l.mulai) / (l.selesai - l.mulai))
                : 1;
              return (
                <div
                  key={l.kunci}
                  className="flex min-h-0 overflow-hidden rounded-[2vh]"
                  style={{
                    background: W.putih,
                    color: W.tinta,
                    boxShadow: BAYANGAN,
                  }}
                >
                  <div
                    className="flex w-[10.5vw] shrink-0 flex-col items-center justify-center px-[0.6vw] tabular-nums"
                    style={{ background: titik ? W.koral : W.kuning }}
                  >
                    <span className="text-[2.6vh] font-bold">
                      {titik ? "Jam" : "s.d."}
                    </span>
                    <span className="text-[6vh] leading-none" style={TEBAL}>
                      {l.jamSelesai ?? l.jamMulai}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1vh] px-[1.4vw] py-[1.4vh]">
                    {banyakPesanan && l.pesanan ? (
                      <p
                        className="text-[2.6vh] leading-none font-extrabold"
                        style={{ color: W.tintaRedup }}
                      >
                        {l.pesanan}
                      </p>
                    ) : null}
                    <p
                      className="leading-[1.12]"
                      style={{
                        ...TEBAL,
                        fontSize: ukuran,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {teksLayar(l.teks)}
                    </p>
                    {l.rincian.length ? (
                      <p
                        className="text-[3vh] leading-snug font-bold"
                        style={{ color: W.tintaRedup }}
                      >
                        {l.rincian.join(" · ")}
                      </p>
                    ) : null}
                    {l.selesai ? (
                      <div className="flex items-center gap-[1vw]">
                        <span
                          className="h-[0.9vh] flex-1 overflow-hidden rounded-full"
                          style={{ background: "rgba(20,32,116,0.12)" }}
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.round(jalan * 100)}%`,
                              background: W.tinta,
                            }}
                          />
                        </span>
                        <span className="shrink-0 text-[2.8vh] font-bold tabular-nums">
                          sisa {lagi(l.selesai).replace(" lagi", "")}
                        </span>
                      </div>
                    ) : (
                      <p
                        className="text-[2.8vh] font-extrabold"
                        style={{ color: "#B23A1E" }}
                      >
                        Berangkat sekarang
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : berikutnya[0] ? (
            <div className="flex flex-col pt-[4vh]">
              <p className="text-[4.6vh] font-bold" style={{ color: W.redup }}>
                Belum ada yang berjalan. Mulai jam
              </p>
              <p
                className="mt-[1vh] text-[11vh] leading-[0.95] tabular-nums"
                style={TEBAL}
              >
                {berikutnya[0].jamMulai}
              </p>
              <p
                className="mt-[1.4vh] text-[4.6vh] leading-[1.12]"
                style={{ ...TEBAL, letterSpacing: "-0.02em" }}
              >
                {teksLayar(berikutnya[0].teks)}
              </p>
              <p
                className="mt-[1.4vh] self-start rounded-full px-[1.4vw] py-[0.8vh] text-[3.8vh]"
                style={{
                  ...TEBAL,
                  letterSpacing: "-0.01em",
                  background: W.kuning,
                  color: W.tinta,
                }}
              >
                {lagi(berikutnya[0].mulai)}
              </p>
            </div>
          ) : null}
          {sekarang.length > tampil.length ? (
            <p className="text-[2.8vh] font-bold" style={{ color: W.redup }}>
              +{sekarang.length - tampil.length} langkah lain sedang berjalan
            </p>
          ) : null}
        </div>
      </div>

      <div ref={kananWadah} className="min-h-0 overflow-hidden">
        <div
          ref={kananIsi}
          className="flex origin-top-left flex-col gap-[1.4vh]"
        >
          <p className="text-[4.4vh] leading-none" style={TEBAL}>
            Berikutnya
          </p>
          {antri.length ? null : (
            <p className="text-[3.4vh] font-bold" style={{ color: W.redup }}>
              Ini langkah terakhir.
            </p>
          )}
          {antri.slice(0, 4).map((l, n) => {
            const titik = l.selesai === null;
            return (
              <div
                key={l.kunci}
                className="flex min-h-0 flex-col gap-[0.6vh] rounded-[1.8vh] px-[1.2vw] py-[1.2vh]"
                style={
                  titik
                    ? { background: W.kuning, color: W.tinta }
                    : { background: "rgba(255,255,255,0.12)" }
                }
              >
                <p className="flex items-baseline gap-[0.8vw] tabular-nums">
                  <span className="text-[3.6vh] leading-none" style={TEBAL}>
                    {l.jamSelesai
                      ? `${l.jamMulai}–${l.jamSelesai}`
                      : l.jamMulai}
                  </span>
                  {n === 0 ? (
                    <span
                      className="text-[2.6vh] font-bold"
                      style={{ color: titik ? W.tintaRedup : W.redup }}
                    >
                      {lagi(l.mulai)}
                    </span>
                  ) : null}
                </p>
                <p className="text-[3vh] leading-[1.15] font-bold">
                  {banyakPesanan && l.pesanan ? (
                    <span className="opacity-75">{l.pesanan} · </span>
                  ) : null}
                  {teksLayar(l.teks)}
                </p>
                {l.rincian.length ? (
                  <p className="text-[2.5vh] leading-snug font-semibold">
                    {l.rincian.join(" · ")}
                  </p>
                ) : null}
              </div>
            );
          })}
          {antri.length > 4 ? (
            <p className="text-[2.6vh] font-bold" style={{ color: W.redup }}>
              +{antri.length - 4} langkah lagi
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Sorotan layar penuh saat langkah jadwal mulai (Rama 27 Nov: "di-highlight dulu tampilan penuh untuk mengumumkan,
 * baru balik ke mode keseluruhan"). Bersamaan dengan kalimat suara; garis bawah menghitung mundur kembalinya tampilan.
 * Beberapa langkah yang mulai bersamaan tampil bersama (maks. 3).
 */
export function SorotLangkah({
  langkah,
  lama,
  tutup,
}: {
  langkah: LangkahTayang[];
  lama: number;
  tutup: () => void;
}) {
  const tampil = langkah.slice(0, 3);
  const satu = tampil.length === 1;
  return (
    <div
      role="alert"
      onPointerDown={tutup}
      className="fixed inset-0 z-40 flex flex-col justify-center gap-[4vh] px-[6vw] text-white"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(150deg, #101a63 0%, #1d2f9e 55%, #2f4bd0 100%)",
      }}
    >
      <style>
        {
          "@keyframes sorot-mundur{from{transform:scaleX(1)}to{transform:scaleX(0)}}"
        }
      </style>
      {tampil.map((l) => {
        const titik = l.selesai === null;
        return (
          <div key={l.kunci} className="flex flex-col gap-[1.6vh]">
            <div className="flex flex-wrap items-center gap-[1.2vw]">
              <p
                className="rounded-full px-[1.8vw] py-[0.8vh] text-[4vh] tabular-nums"
                style={{
                  ...TEBAL,
                  letterSpacing: "-0.01em",
                  background: titik ? W.koral : W.kuning,
                  color: W.tinta,
                }}
              >
                {titik ? "Berangkat" : "Mulai sekarang"} · {l.jamMulai}
              </p>
              {l.pesanan ? (
                <p className="text-[4vh] font-bold" style={{ color: W.redup }}>
                  {l.pesanan}
                </p>
              ) : null}
            </div>
            <p
              className="leading-[1.05] text-balance"
              style={{
                ...TEBAL,
                fontSize: satu ? "10vh" : "6.4vh",
              }}
            >
              {teksLayar(l.teks)}
            </p>
            {l.jamSelesai ? (
              <p
                className="text-[4.4vh] font-bold tabular-nums"
                style={{ color: W.redup }}
              >
                Sampai jam {l.jamSelesai}
              </p>
            ) : null}
            {l.rincian.length ? (
              <div className="flex flex-wrap gap-[1vw]">
                {l.rincian.map((r) => (
                  <span
                    key={r}
                    className="rounded-[1.6vh] px-[1.4vw] py-[0.8vh] text-[4vh]"
                    style={{
                      ...TEBAL,
                      letterSpacing: "-0.01em",
                      background: W.putih,
                      color: W.tinta,
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      {langkah.length > tampil.length ? (
        <p className="text-[3.4vh] font-bold" style={{ color: W.redup }}>
          +{langkah.length - tampil.length} langkah lain juga mulai sekarang
        </p>
      ) : null}
      <span
        className="absolute inset-x-[6vw] bottom-[5vh] h-[0.8vh] origin-left rounded-full"
        style={{
          background: W.kuning,
          animation: `sorot-mundur ${lama}ms linear forwards`,
        }}
      />
    </div>
  );
}

/** Target persiapan acara besar hari ini (docs/25 #5): "Lipat box · Wisuda UNPAK — 520 / 750 box". */
export type TargetTayang = {
  acara: string;
  judul: string;
  satuan: string;
  target: number;
  tercapai: number;
  totalTarget: number;
  totalTercapai: number;
};

function SlidePersiapan({ target }: { target: TargetTayang[] }) {
  const angka = (n: number) => n.toLocaleString("id-ID");
  return (
    <section className="flex h-full flex-col justify-center gap-[3vh]">
      <p className="text-[7vh] leading-none" style={TEBAL}>
        Target hari ini
      </p>
      {target.slice(0, 3).map((t) => {
        const persen = t.target
          ? Math.min(100, Math.round((t.tercapai / t.target) * 100))
          : 0;
        const beres = t.tercapai >= t.target && t.target > 0;
        return (
          <div
            key={`${t.acara}|${t.judul}`}
            className="flex items-center gap-[2vw] rounded-[2vh] px-[2vw] py-[2.2vh]"
            style={{ background: W.putih, color: W.tinta, boxShadow: BAYANGAN }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[5vh] leading-[1.05]" style={TEBAL}>
                {t.judul}
              </p>
              <p
                className="mt-[0.6vh] text-[3vh] font-bold"
                style={{ color: W.tintaRedup }}
              >
                {t.acara} · total {angka(t.totalTercapai)} dari{" "}
                {angka(t.totalTarget)} {t.satuan}
              </p>
              <span
                className="mt-[1.4vh] block h-[1.4vh] overflow-hidden rounded-full"
                style={{ background: "rgba(20,32,116,0.12)" }}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${persen}%`,
                    background: beres ? "#2E9E6A" : W.tinta,
                  }}
                />
              </span>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-[10vh] leading-none" style={TEBAL}>
                {angka(t.tercapai)}
              </p>
              <p
                className="mt-[0.6vh] text-[3.4vh] font-bold"
                style={{ color: W.tintaRedup }}
              >
                dari {angka(t.target)} {t.satuan}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

const LABEL_SLIDE = {
  rencana: "Jadwal persiapan",
  persiapan: "Target persiapan",
  agenda: "Agenda 7 hari",
  ultah: "Ulang tahun",
  tiska: "Tiska",
} as const;

/* ---------- Layar ---------- */

export function LayarTv({
  order,
  orderBesok,
  tanggal,
  kini,
  labelHariIni,
  labelBesok,
  namaDapur,
  jam,
  peringatan,
  suara,
  nyalakanSuara,
  tesSuara,
  tahan,
  langkah,
  running,
  onTayang,
  agenda,
  ultah,
  rencana,
  targetPersiapan,
}: {
  order: OrderLayar[];
  orderBesok: OrderLayar[];
  tanggal: string;
  kini: Date | null;
  labelHariIni: string;
  labelBesok: string;
  namaDapur: string | null;
  jam: string;
  peringatan: string | null;
  suara: boolean;
  nyalakanSuara: () => void;
  tesSuara: () => void;
  /** Kontrol Dapur: Tahan = halaman tidak berganti sendiri. */
  tahan: boolean;
  /** Kontrol Dapur: tiap kenaikan n = satu langkah Next (arah 1) / Prev (arah -1). */
  langkah: { n: number; arah: number };
  running: string | null;
  /** Melapor apa yang sedang tayang ke Kontrol Dapur. */
  onTayang: (tayang: string) => void;
  /** Mode santai (hari tanpa pesanan): agenda 7 hari & ulang tahun; null saat ada pesanan hari ini. */
  agenda: AgendaHari[] | null;
  ultah: UltahDekat[];
  /** Rencana masak hari ini & besok (Kontrol Dapur → Rencana masak). */
  rencana: Rencana[];
  /** Target persiapan acara besar yang jatuh hari ini (Event → Persiapan). */
  targetPersiapan: TargetTayang[];
}) {
  const blok = useMemo(
    () => [...blokPesanan(order, false), ...blokPesanan(orderBesok, true)],
    [order, orderBesok],
  );
  const penuh = useSyncExternalStore(pantauPenuh, layarPenuh, () => false);

  const kanan = useRef<HTMLDivElement>(null);
  const ukur = useRef<HTMLDivElement>(null);
  const [halaman, setHalaman] = useState<Halaman[]>([]);

  // Ukur tinggi asli tiap blok (huruf & lebar kolom sesungguhnya), lalu bagi ke halaman: satu pesanan per halaman.
  useLayoutEffect(() => {
    const hitung = () => {
      if (!ukur.current || !kanan.current) return;
      const tinggi = [
        ...ukur.current.querySelectorAll<HTMLElement>("[data-blok]"),
      ].map((e) => e.getBoundingClientRect().height);
      const tinggiSesi = tinggi[blok.findIndex((b) => b.jenis === "sesi")] ?? 0;
      // Judul sesi diperlakukan seperti kepala: tidak sendirian di dasar halaman, dan diulang di atas halaman lanjutan.
      setHalaman(
        bagiHalaman(
          blok.map((b, n) => ({
            tinggi: tinggi[n] ?? 0,
            order:
              b.jenis === "item" && b.sesi ? `${b.order.id}|${b.sesi}` : null,
            kepala: b.jenis === "sesi",
            halamanBaru: b.halamanBaru,
          })),
          tinggiSesi,
          kanan.current.clientHeight,
        ),
      );
    };
    hitung();
    void document.fonts?.ready.then(hitung);
    const amati = new ResizeObserver(hitung);
    amati.observe(kanan.current!);
    return () => amati.disconnect();
  }, [blok]);

  // Jadwal persiapan tampil selama masih ada langkah yang berjalan / belum mulai.
  const langkahRencana = useMemo(() => linimasa(rencana), [rencana]);
  const adaRencana = kini
    ? (() => {
        const p = posisi(langkahRencana, kini.getTime());
        return p.sekarang.length + p.berikutnya.length > 0;
      })()
    : false;

  const adaTarget = targetPersiapan.length > 0;
  // Sel tetap di depan strip antrian untuk slide khusus saat mode masak.
  const selKhusus = [
    ...(adaRencana
      ? [
          {
            jenis: "rencana" as const,
            judul: "Jadwal",
            sub: "Sekarang & berikutnya",
          },
        ]
      : []),
    ...(adaTarget
      ? [
          {
            jenis: "persiapan" as const,
            judul: "Target",
            sub: "Persiapan hari ini",
          },
        ]
      : []),
  ];

  // Daftar slide: halaman pesanan; di hari tanpa pesanan ditambah Agenda (depan), Ulang tahun & Tiska (belakang).
  // Jadwal persiapan diselipkan tiap dua halaman pesanan supaya "Sekarang" tidak lama menghilang.
  const slides = useMemo<Slide[]>(() => {
    const hal: Slide[] = halaman.map((_, i) => ({ jenis: "halaman", i }));
    const jadwal: Slide[] = adaRencana ? [{ jenis: "rencana" }] : [];
    // Target persiapan acara besar: sekali per putaran, di depan.
    const target: Slide[] = adaTarget ? [{ jenis: "persiapan" }] : [];
    if (order.length || !agenda) {
      if (!adaRencana) return [...target, ...hal];
      return [
        ...target,
        ...(hal.length
          ? hal.flatMap((h, i) => (i % 2 === 0 ? [...jadwal, h] : [h]))
          : jadwal),
      ];
    }
    return [
      ...jadwal,
      ...target,
      { jenis: "agenda" },
      ...hal,
      ...(ultah.length ? [{ jenis: "ultah" } as const] : []),
      { jenis: "tiska" },
    ];
  }, [halaman, order.length, agenda, ultah.length, adaRencana, adaTarget]);
  const [ke, setKe] = useState(0);
  const [tampak, setTampak] = useState(true);
  useEffect(() => {
    if (slides.length <= 1 || tahan) return;
    let jeda: ReturnType<typeof setTimeout> | undefined;
    const putar = setInterval(() => {
      setTampak(false);
      jeda = setTimeout(() => {
        setKe((k) => (k + 1) % slides.length);
        setTampak(true);
      }, PUDAR_MS);
    }, DURASI_MS);
    return () => {
      clearInterval(putar);
      clearTimeout(jeda);
    };
  }, [slides.length, tahan, langkah]);

  // Next / Prev dari Kontrol Dapur: pudar keluar, ganti halaman, pudar masuk (putaran otomatis ikut mulai ulang).
  const jumlahHalaman = useRef(halaman.length);
  useEffect(() => {
    jumlahHalaman.current = slides.length;
  });
  useEffect(() => {
    if (!langkah.n) return;
    const keluar = setTimeout(() => setTampak(false), 0);
    const masuk = setTimeout(() => {
      const n = Math.max(1, jumlahHalaman.current);
      setKe((k) => (((k + langkah.arah) % n) + n) % n);
      setTampak(true);
    }, PUDAR_MS);
    return () => {
      clearTimeout(keluar);
      clearTimeout(masuk);
    };
  }, [langkah]);

  const slide = slides.length
    ? slides[Math.min(ke, slides.length - 1)]
    : undefined;
  const khusus = slide && slide.jenis !== "halaman" ? slide.jenis : null;
  const nomor = slide?.jenis === "halaman" ? slide.i : 0;
  const aktif = halaman[nomor];
  const pertama = aktif ? blok[aktif.blok[0]] : blok[0];
  const halamanPesanan = pertama
    ? halaman.filter(
        (h) =>
          blok[h.blok[0]]?.order.id === pertama.order.id &&
          blok[h.blok[0]]?.besok === pertama.besok,
      )
    : [];
  const bagian =
    halamanPesanan.length > 1 && aktif
      ? {
          ke: halamanPesanan.indexOf(aktif) + 1,
          dari: halamanPesanan.length,
          kunci: `${nomor}-${halaman.length}`,
        }
      : null;
  // Halaman yang isinya sedikit dibesarkan sampai SKALA_MAKS supaya layar terpakai (Rama: "masih luas tapi
  // fontnya kecil"). Diukur langsung di DOM: lebar diperkecil 1/f lalu di-scale f, jadi teks mengalir ulang dan
  // tingginya dicek lagi — tidak pernah melebihi kolom.
  const isiHalaman = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = isiHalaman.current;
    const wadah = kanan.current;
    if (!el || !wadah) return;
    const pasang = (f: number) => {
      el.style.transform = f === 1 ? "" : `scale(${f})`;
      el.style.width = f === 1 ? "" : `${100 / f}%`;
    };
    pasang(1);
    const tersedia = wadah.clientHeight;
    const tinggi = el.scrollHeight;
    if (!tinggi || tinggi >= tersedia * 0.85) return;
    let f = Math.min(SKALA_MAKS, (tersedia * 0.94) / tinggi);
    pasang(f);
    if (el.scrollHeight * f > tersedia) {
      f = Math.max(1, (f * tersedia * 0.97) / (el.scrollHeight * f));
      pasang(f);
    }
  }, [nomor, halaman]);

  const pudar: CSSProperties = {
    opacity: tampak ? 1 : 0,
    transition: `opacity ${PUDAR_MS}ms cubic-bezier(0.23, 1, 0.32, 1)`,
  };

  // Sel strip antrian: jam + judul tiap halaman (sesi yang sedang dimulai, atau nama pesanan).
  const sel = halaman.map((h) => {
    const b = blok[h.blok[0]];
    const sesi = h.lanjutan
      ? h.lanjutan.slice(h.lanjutan.indexOf("|") + 1)
      : b.jenis === "sesi"
        ? b.teks
        : b.jenis === "item"
          ? b.sesi
          : null;
    const js = sesi ? judulSesi(sesi) : null;
    return {
      jamSesi: js?.jam ?? null,
      jam: js?.jam ?? b.order.jam ?? "–",
      // Label pendek: bagian pertama judul sesi ("SESI I PAGI"), atau nama pemesan.
      judul: `${b.besok ? "Besok · " : ""}${js?.judul.split(" · ")[0] || b.order.nama}`,
      kunci: `${b.besok ? "b" : "h"}|${b.order.id}|${js?.jam ?? ""}|${js?.judul.split(" · ")[0] ?? ""}`,
    };
  });
  // Strip antrian: SATU sel per sesi (atau per pesanan tanpa sesi) — halaman lanjutan sesi yang sama jadi garis
  // kecil di dalam selnya, bukan sel kembar dengan label terpotong (Rama 26 Nov).
  const kelompok: {
    kunci: string;
    jam: string;
    judul: string;
    halaman: number[];
  }[] = [];
  sel.forEach((s, n) => {
    const terakhir = kelompok.at(-1);
    if (terakhir && terakhir.kunci === s.kunci) terakhir.halaman.push(n);
    else
      kelompok.push({
        kunci: s.kunci,
        jam: s.jam,
        judul: s.judul,
        halaman: [n],
      });
  });
  // Saat slide khusus (Jadwal persiapan) tayang, tidak ada sel pesanan yang menyala.
  const nomorStrip = khusus ? -1 : nomor;
  const kelompokTayang = kelompok.findIndex((k) =>
    k.halaman.includes(nomorStrip),
  );
  const awalSel = Math.max(
    0,
    Math.min(kelompokTayang - 2, kelompok.length - 6),
  );
  const jumlahSel = Math.min(6, kelompok.length);
  // Strip mode santai: Jadwal persiapan · Agenda · Persiapan besok · Ulang tahun · Tiska.
  const santai = slides.some((x) => x.jenis === "agenda")
    ? [
        {
          judul: "Jadwal persiapan",
          slides: slides.flatMap((x, i) => (x.jenis === "rencana" ? [i] : [])),
        },
        {
          judul: "Target persiapan",
          slides: slides.flatMap((x, i) =>
            x.jenis === "persiapan" ? [i] : [],
          ),
        },
        {
          judul: "Agenda 7 hari",
          slides: slides.flatMap((x, i) => (x.jenis === "agenda" ? [i] : [])),
        },
        {
          judul: "Persiapan besok",
          slides: slides.flatMap((x, i) => (x.jenis === "halaman" ? [i] : [])),
        },
        {
          judul: "Ulang tahun",
          slides: slides.flatMap((x, i) => (x.jenis === "ultah" ? [i] : [])),
        },
        {
          judul: "Tiska",
          slides: slides.flatMap((x, i) => (x.jenis === "tiska" ? [i] : [])),
        },
      ].filter((g) => g.slides.length)
    : null;
  const teksTayang = khusus
    ? LABEL_SLIDE[khusus]
    : pertama
      ? `${sel[nomor]?.jam ?? ""} ${sel[nomor]?.judul ?? ""}`.trim() +
        (pertama.order.nama && !sel[nomor]?.judul.includes(pertama.order.nama)
          ? ` · ${pertama.order.nama}`
          : "") +
        (halaman.length > 1 ? ` (halaman ${nomor + 1}/${halaman.length})` : "")
      : "Tidak ada pesanan";
  useEffect(() => {
    onTayang(teksTayang);
  }, [onTayang, teksTayang]);

  return (
    <div className="grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] overflow-hidden px-[3vw] py-[2.6vh]">
      <style>
        {
          "@keyframes jalan-halaman{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes jalan-teks{from{transform:translateX(0)}to{transform:translateX(-100%)}}"
        }
      </style>

      <header className="flex items-center justify-between pb-[2.2vh]">
        <div className="flex items-center gap-[1.6vw]">
          <Image
            src="/brand/unduh/logo-tiska-putih-mendatar.png"
            alt="Tiska Catering"
            width={1747}
            height={868}
            priority
            className="h-[9vh] w-auto"
          />
          {namaDapur ? (
            <p
              className="rounded-full px-[1.2vw] py-[0.6vh] text-[3vh]"
              style={{
                ...TEBAL,
                letterSpacing: "-0.01em",
                background: W.kuning,
                color: W.tinta,
              }}
            >
              {namaDapur}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-[1.6vw]">
          <p className="text-[3.2vh] font-semibold" style={{ color: W.redup }}>
            {labelHariIni}
          </p>
          <p className="text-[8.6vh] leading-[0.9] tabular-nums" style={TEBAL}>
            {jam}
          </p>
        </div>
      </header>

      {peringatan ? (
        <div
          role="status"
          className="mb-[2vh] flex items-center gap-[1vw] rounded-[1.6vh] px-[1.6vw] py-[1.2vh] text-[3.2vh] font-bold"
          style={{ background: W.amber, color: W.tinta }}
        >
          <WifiOff className="size-[3.8vh] shrink-0" strokeWidth={2.25} />
          {peringatan}
        </div>
      ) : (
        <div />
      )}

      <div className="relative min-h-0">
        {khusus ? (
          <div className="absolute inset-0 z-10" style={pudar}>
            {khusus === "persiapan" ? (
              <SlidePersiapan target={targetPersiapan} />
            ) : khusus === "rencana" ? (
              <SlideRencana
                langkah={langkahRencana}
                kini={kini?.getTime() ?? 0}
              />
            ) : khusus === "agenda" && agenda ? (
              <SlideAgenda agenda={agenda} />
            ) : khusus === "ultah" ? (
              <SlideUltah ultah={ultah} />
            ) : (
              <SlideTiska />
            )}
          </div>
        ) : null}
        <div
          className="h-full"
          style={khusus ? { visibility: "hidden" } : undefined}
        >
          {blok.length === 0 ? (
            <main className="flex h-full flex-col justify-center">
              <p className="text-[11vh] leading-[0.95]" style={TEBAL}>
                {namaDapur
                  ? `Tidak ada tugas ${namaDapur}`
                  : "Tidak ada pesanan"}
              </p>
              <p
                className="mt-[2vh] text-[4vh] font-semibold"
                style={{ color: W.redup }}
              >
                Hari ini maupun besok, {labelBesok}.
              </p>
            </main>
          ) : (
            <main className="grid h-full min-h-0 grid-cols-[minmax(0,31fr)_minmax(0,69fr)] gap-[2.6vw]">
              <div className="flex min-h-0" style={pudar}>
                {pertama ? (
                  <KolomWaktu
                    o={pertama.order}
                    jamTarget={sel[nomor]?.jamSesi ?? pertama.order.jam}
                    besok={pertama.besok}
                    labelBesok={labelBesok}
                    kini={kini}
                    tanggal={tanggal}
                    bagian={
                      santai || kelompok.length > 1 || selKhusus.length
                        ? null
                        : bagian
                    }
                  />
                ) : null}
              </div>
              <div ref={kanan} className="relative min-h-0 overflow-hidden">
                {/* Pengukur: semua blok dengan lebar kolom yang sama, tak terlihat. */}
                <div
                  ref={ukur}
                  aria-hidden
                  className="pointer-events-none invisible absolute inset-x-0 top-0"
                >
                  {blok.map((b) => (
                    <div key={b.kunci} data-blok>
                      <IsiBlok b={b} />
                    </div>
                  ))}
                </div>
                <div ref={isiHalaman} className="origin-top-left" style={pudar}>
                  {aktif?.lanjutan ? (
                    <JudulSesi
                      teks={aktif.lanjutan.slice(
                        aktif.lanjutan.indexOf("|") + 1,
                      )}
                    />
                  ) : null}
                  {aktif?.blok.map((n) => (
                    <IsiBlok key={blok[n].kunci} b={blok[n]} />
                  ))}
                </div>
              </div>
            </main>
          )}
        </div>
      </div>

      {/* Running text dari Kontrol Dapur — info penting berjalan seperti berita TV. */}
      {running ? (
        <div
          className="mt-[1.6vh] flex items-center overflow-hidden rounded-[1.6vh]"
          style={{ background: "rgba(8,14,60,0.45)" }}
        >
          <p
            className="shrink-0 self-stretch content-center px-[1.4vw] text-[3vh]"
            style={{
              ...TEBAL,
              letterSpacing: "-0.01em",
              background: W.kuning,
              color: W.tinta,
            }}
          >
            Info
          </p>
          <div className="min-w-0 flex-1 overflow-hidden py-[1vh]">
            <p
              key={running}
              className="inline-block pl-[100%] text-[3.6vh] font-bold whitespace-nowrap"
              style={{
                animation: `jalan-teks ${durasiRunning(running)}ms linear infinite`,
              }}
            >
              {running}
            </p>
          </div>
        </div>
      ) : (
        <div />
      )}

      {santai || kelompok.length > 1 || selKhusus.length || !penuh ? (
        <footer className="flex items-stretch gap-[1.2vw] pt-[2vh]">
          {santai ? (
            <ol
              className="grid min-w-0 flex-1 overflow-hidden rounded-[1.8vh] border"
              style={{
                borderColor: W.garis,
                gridTemplateColumns: `repeat(${santai.length}, minmax(0, 1fr))`,
              }}
            >
              {santai.map((g) => {
                const tayang = g.slides.includes(
                  Math.min(ke, slides.length - 1),
                );
                return (
                  <li
                    key={g.judul}
                    className="flex min-w-0 flex-col justify-center gap-[0.6vh] border-l px-[1vw] py-[1.2vh] first:border-l-0"
                    style={{
                      borderColor: W.garis,
                      background: tayang ? W.kuning : "transparent",
                      color: tayang ? W.tinta : W.putih,
                    }}
                  >
                    <p className="truncate text-[3vh]" style={TEBAL}>
                      {g.judul}
                    </p>
                    <span className="flex gap-[0.4vw]">
                      {g.slides.map((x) => (
                        <span
                          key={x}
                          className="h-[0.6vh] flex-1 overflow-hidden rounded-full"
                          style={{
                            background: tayang
                              ? "rgba(20,32,116,0.18)"
                              : W.garis,
                          }}
                        >
                          {x === Math.min(ke, slides.length - 1) ? (
                            <span
                              key={`${ke}-${slides.length}`}
                              className="block h-full origin-left"
                              style={{
                                background: W.tinta,
                                animation: `jalan-halaman ${DURASI_MS}ms linear`,
                              }}
                            />
                          ) : null}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : kelompok.length > 1 || selKhusus.length ? (
            <ol
              className="grid min-w-0 flex-1 overflow-hidden rounded-[1.8vh] border"
              style={{
                borderColor: W.garis,
                gridTemplateColumns: `repeat(${jumlahSel + selKhusus.length}, minmax(0, 1fr))`,
              }}
              aria-label={`Halaman ${nomor + 1} dari ${sel.length}`}
            >
              {selKhusus.map((c) => (
                <li
                  key={c.jenis}
                  className="flex min-w-0 flex-col gap-[0.6vh] border-l px-[1vw] py-[1vh] first:border-l-0"
                  style={{
                    borderColor: W.garis,
                    background: khusus === c.jenis ? W.kuning : "transparent",
                    color: khusus === c.jenis ? W.tinta : W.putih,
                  }}
                >
                  <p className="text-[3.4vh] leading-none" style={TEBAL}>
                    {c.judul}
                  </p>
                  <p className="line-clamp-2 text-[2.3vh] leading-tight font-bold">
                    {c.sub}
                  </p>
                  <span
                    className="mt-auto h-[0.6vh] overflow-hidden rounded-full"
                    style={{
                      background:
                        khusus === c.jenis ? "rgba(20,32,116,0.18)" : W.garis,
                    }}
                  >
                    {khusus === c.jenis ? (
                      <span
                        key={ke}
                        className="block h-full origin-left"
                        style={{
                          background: W.tinta,
                          animation: `jalan-halaman ${DURASI_MS}ms linear`,
                        }}
                      />
                    ) : null}
                  </span>
                </li>
              ))}
              {kelompok.slice(awalSel, awalSel + 6).map((g, k) => {
                const n = awalSel + k;
                const tayang = n === kelompokTayang;
                const lewat = n < kelompokTayang;
                return (
                  <li
                    key={g.kunci + n}
                    className="flex min-w-0 flex-col gap-[0.6vh] border-l px-[1vw] py-[1vh] first:border-l-0"
                    style={{
                      borderColor: W.garis,
                      background: tayang ? W.kuning : "transparent",
                      color: tayang
                        ? W.tinta
                        : lewat
                          ? "rgba(255,255,255,0.55)"
                          : W.putih,
                    }}
                  >
                    <p
                      className="text-[3.4vh] leading-none tabular-nums"
                      style={TEBAL}
                    >
                      {g.jam}
                    </p>
                    <p className="line-clamp-2 text-[2.3vh] leading-tight font-bold">
                      {g.judul}
                    </p>
                    {/* Garis per halaman di sesi ini; yang tayang berjalan 20 detik. */}
                    <span className="mt-auto flex gap-[0.4vw]">
                      {g.halaman.map((h) => (
                        <span
                          key={h}
                          className="h-[0.6vh] flex-1 overflow-hidden rounded-full"
                          style={{
                            background: tayang
                              ? "rgba(20,32,116,0.18)"
                              : W.garis,
                          }}
                        >
                          {h === nomorStrip ? (
                            <span
                              key={`${nomor}-${sel.length}`}
                              className="block h-full origin-left"
                              style={{
                                background: W.tinta,
                                animation: `jalan-halaman ${DURASI_MS}ms linear`,
                              }}
                            />
                          ) : h < nomorStrip ? (
                            <span
                              className="block h-full"
                              style={{
                                background: tayang
                                  ? W.tinta
                                  : "rgba(255,255,255,0.55)",
                              }}
                            />
                          ) : null}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex-1" />
          )}
          {/* Tombol suara bukan untuk orang dapur (Rama): disembunyikan saat layar penuh. Sentuhan/tombol apa pun
            di layar sudah menyalakan suara (layar.tsx); status suara nanti dilaporkan ke Kontrol Dapur. */}
          {penuh ? null : (
            <button
              type="button"
              onClick={suara ? tesSuara : nyalakanSuara}
              className="flex shrink-0 items-center gap-[0.6vw] self-center rounded-full px-[1.4vw] py-[1vh] text-[2.4vh] font-bold whitespace-nowrap transition-transform active:scale-[0.97]"
              style={{
                background: suara ? "rgba(255,255,255,0.12)" : W.putih,
                color: suara ? W.redup : W.tinta,
              }}
            >
              <Volume2 className="size-[2.8vh]" strokeWidth={2} />
              {suara ? "Tes suara" : "Nyalakan suara"}
            </button>
          )}
        </footer>
      ) : null}
    </div>
  );
}
