import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/* ==========================================================================
   PANEL STATISTIK (sistem desain v2, D-059)

   Wadah gradasi (--hero) berisi kartu putih. Warna menyatakan KEADAAN, bukan
   topik: kartu "perhatian" (kuning) hanya untuk yang perlu ditindak — paling
   banyak satu per panel — dan "info" (biru muda) untuk kondisi baik/lunas.
   Sisanya putih. Angka selalu mono. (Menggantikan aturan lama "tiap kartu
   berwarna sendiri", yang membuat panel ramai dan warna kehilangan arti.)

   `warna` lama tetap diterima supaya halaman lama tidak pecah:
   merah → perhatian, hijau → info, lainnya → putih. Halaman sebaiknya
   memberi `nada="perhatian"` hanya bila memang ada yang perlu ditindak.
   ========================================================================== */

export type WarnaKartu = "hijau" | "kuning" | "oranye" | "merah" | "biru" | "ungu" | "toska";
export type NadaKartu = "netral" | "perhatian" | "info";

const NADA: Record<NadaKartu, { kartu: string; label: string; ket: string }> = {
  netral: { kartu: "border-border bg-card", label: "text-muted-foreground", ket: "text-muted-foreground" },
  perhatian: { kartu: "border-perhatian-garis bg-perhatian-halus", label: "text-perhatian", ket: "text-perhatian" },
  info: { kartu: "border-info-garis bg-info-halus", label: "text-info", ket: "text-muted-foreground" },
};

const DARI_WARNA: Record<WarnaKartu, NadaKartu> = {
  merah: "perhatian",
  kuning: "netral",
  hijau: "info",
  oranye: "netral",
  biru: "netral",
  ungu: "netral",
  toska: "netral",
};

export function PapanAngka({ children, kolom = 4, className = "" }: { children: React.ReactNode; kolom?: 3 | 4; className?: string }) {
  const sebar = kolom === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <section className={`grid grid-cols-1 gap-3 rounded-[18px] bg-[image:var(--hero)] p-3 sm:grid-cols-2 ${sebar} ${className}`}>{children}</section>
  );
}

export function KartuAngka({
  label,
  nilai,
  keterangan,
  warna,
  nada,
  ikon: Ikon,
  menonjol,
  teks,
  href,
}: {
  label: string;
  nilai: string;
  keterangan?: string;
  /** Lama — dipetakan ke nada. Pakai `nada` untuk halaman baru. */
  warna?: WarnaKartu;
  nada?: NadaKartu;
  ikon?: LucideIcon;
  menonjol?: boolean;
  /** Nilainya bukan angka (nama customer) — tanpa font mono. */
  teks?: boolean;
  /** Kartu yang punya tautan dibuat kelihatan bisa diklik. */
  href?: string;
}) {
  const n = NADA[nada ?? (warna ? DARI_WARNA[warna] : "netral")];
  const isi = (
    <>
      <p className={`flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase ${n.label} ${href ? "group-hover:underline" : ""}`}>
        {Ikon ? <Ikon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" /> : null}
        <span className="truncate">{label}</span>
      </p>
      <p
        className={`mt-2.5 truncate text-foreground ${
          teks ? "text-lg font-semibold" : `uang ${menonjol ? "text-[1.625rem]" : "text-2xl"} font-bold`
        }`}
      >
        {nilai}
      </p>
      {keterangan ? <p className={`mt-1.5 text-[0.8125rem] ${n.ket}`}>{keterangan}</p> : null}
    </>
  );
  const kelas = `block min-w-0 rounded-[14px] border px-5 py-4 ${n.kartu}`;
  if (href) {
    return (
      <Link
        href={href}
        className={`group ${kelas} transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(31,42,92,0.25)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
      >
        {isi}
      </Link>
    );
  }
  return <div className={kelas}>{isi}</div>;
}
