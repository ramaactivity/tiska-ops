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
import type { OrderLayar } from "@/lib/pesanan-dapur";
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
          kunci: `${o.id}-s${n}`,
          jenis: "sesi",
          teks: sesi,
          order: o,
          besok,
          halamanBaru: hasil.length === 0,
        });
      if (sesi) sesiKini = sesi;
      hasil.push({
        kunci: `${o.id}-${n}`,
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
          <p className="text-[8vh] leading-[0.9] tabular-nums" style={TEBAL}>
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
          className={`${ubin} relative h-[22vh] min-w-[13vw] overflow-hidden`}
          style={{ background: W.putih, color: W.tinta, boxShadow: BAYANGAN }}
        >
          <span className="text-[19vh] leading-none" style={TEBAL}>
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
  bagian: string | null;
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
        {bagian ? (
          <p
            className="mt-[1vh] text-[2.8vh] font-semibold"
            style={{ color: W.redup }}
          >
            {bagian}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-[1.6vh]">
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
const layarPenuh = () =>
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

  const [ke, setKe] = useState(0);
  const [tampak, setTampak] = useState(true);
  useEffect(() => {
    if (halaman.length <= 1) return;
    let jeda: ReturnType<typeof setTimeout> | undefined;
    const putar = setInterval(() => {
      setTampak(false);
      jeda = setTimeout(() => {
        setKe((k) => (k + 1) % halaman.length);
        setTampak(true);
      }, PUDAR_MS);
    }, DURASI_MS);
    return () => {
      clearInterval(putar);
      clearTimeout(jeda);
    };
  }, [halaman.length]);

  const nomor = halaman.length ? Math.min(ke, halaman.length - 1) : 0;
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
      ? `Bagian ${halamanPesanan.indexOf(aktif) + 1} dari ${halamanPesanan.length}`
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
  const kelompokTayang = kelompok.findIndex((k) => k.halaman.includes(nomor));
  const awalSel = Math.max(
    0,
    Math.min(kelompokTayang - 2, kelompok.length - 6),
  );
  const jumlahSel = Math.min(6, kelompok.length);

  return (
    <div className="grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden px-[3vw] py-[2.6vh]">
      <style>
        {
          "@keyframes jalan-halaman{from{transform:scaleX(0)}to{transform:scaleX(1)}}"
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

      {blok.length === 0 ? (
        <main className="flex flex-col justify-center">
          <p className="text-[11vh] leading-[0.95]" style={TEBAL}>
            {namaDapur ? `Tidak ada tugas ${namaDapur}` : "Tidak ada pesanan"}
          </p>
          <p
            className="mt-[2vh] text-[4vh] font-semibold"
            style={{ color: W.redup }}
          >
            Hari ini maupun besok, {labelBesok}.
          </p>
        </main>
      ) : (
        <main className="grid min-h-0 grid-cols-[minmax(0,31fr)_minmax(0,69fr)] gap-[2.6vw]">
          <div className="flex min-h-0" style={pudar}>
            {pertama ? (
              <KolomWaktu
                o={pertama.order}
                jamTarget={sel[nomor]?.jamSesi ?? pertama.order.jam}
                besok={pertama.besok}
                labelBesok={labelBesok}
                kini={kini}
                tanggal={tanggal}
                bagian={bagian}
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
                  teks={aktif.lanjutan.slice(aktif.lanjutan.indexOf("|") + 1)}
                />
              ) : null}
              {aktif?.blok.map((n) => (
                <IsiBlok key={blok[n].kunci} b={blok[n]} />
              ))}
            </div>
          </div>
        </main>
      )}

      <footer className="flex items-stretch gap-[1.2vw] pt-[2vh]">
        {kelompok.length > 1 || sel.length > 1 ? (
          <ol
            className="grid min-w-0 flex-1 overflow-hidden rounded-[1.8vh] border"
            style={{
              borderColor: W.garis,
              gridTemplateColumns: `repeat(${jumlahSel}, minmax(0, 1fr))`,
            }}
            aria-label={`Halaman ${nomor + 1} dari ${sel.length}`}
          >
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
                          background: tayang ? "rgba(20,32,116,0.18)" : W.garis,
                        }}
                      >
                        {h === nomor ? (
                          <span
                            key={`${nomor}-${sel.length}`}
                            className="block h-full origin-left"
                            style={{
                              background: W.tinta,
                              animation: `jalan-halaman ${DURASI_MS}ms linear`,
                            }}
                          />
                        ) : h < nomor ? (
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
    </div>
  );
}
