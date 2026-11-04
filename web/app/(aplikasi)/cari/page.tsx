import { ChevronRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { cariSemua, type HasilCari } from "@/lib/cari";
import { wajibIzin } from "@/lib/rbac";
import { pertanyaanUntuk } from "@/lib/tanya-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cari Cepat" };
export const dynamic = "force-dynamic";

/* Cari Cepat (D-135): satu kotak untuk semua data + pertanyaan cepat yang dijawab langsung dari database — tanpa AI. */
export default async function HalamanCari({ searchParams }: PageProps<"/cari">) {
  const sesi = await wajibIzin("cari");
  const { q, t } = await searchParams;
  const kata = typeof q === "string" ? q.trim() : "";
  const daftarTanya = await pertanyaanUntuk(sesi);
  const tanya = typeof t === "string" ? daftarTanya.find((p) => p.kunci === t) : undefined;
  const [hasil, jawaban] = await Promise.all([kata ? cariSemua(kata, sesi) : Promise.resolve([]), tanya ? tanya.jalankan(sesi, {}) : Promise.resolve(null)]);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Search}
        judul="Cari Cepat"
        keterangan="Ketik apa saja: nama customer, nomor invoice, nama menu, paket, bahan, rekanan, vendor — salah ketik tetap ketemu. Harga paket, product, dan bahan langsung tampil."
      />
      <div className="mb-4 max-w-2xl">
        <Pencarian parameter="q" placeholder="mis. ayam bakar, PR-06, INV/TC/2611, Bu Rahmi, beras" />
      </div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {daftarTanya.map((p) => (
          <Link
            key={p.kunci}
            href={p.kunci === tanya?.kunci ? "/cari" : `/cari?t=${p.kunci}`}
            className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", p.kunci === tanya?.kunci ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {jawaban ? (
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{jawaban.judul}</h2>
            {jawaban.tautan ? (
              <Link href={jawaban.tautan.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                {jawaban.tautan.label} →
              </Link>
            ) : null}
          </div>
          <p className="text-[0.9375rem]">{jawaban.ringkasan}</p>
          {jawaban.baris.length ? (
            <ul className="divide-y rounded-xl border">
              {jawaban.baris.map((b, i) => (
                <Baris key={i} h={{ judul: b.label, sub: b.sub, nilai: b.nilai, href: b.href ?? "" }} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {kata ? (
        hasil.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {hasil.map((k) => (
              <section key={k.kunci} className="flex min-w-0 flex-col gap-2">
                <h2 className="eyebrow">{k.label}</h2>
                <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                  {k.hasil.map((h, i) => (
                    <Baris key={i} h={h} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-[14px] border bg-card px-4 py-8 text-center text-[0.9375rem] text-muted-foreground">Tidak ada data yang cocok dengan &quot;{kata}&quot;.</p>
        )
      ) : !jawaban ? (
        <p className="text-sm text-muted-foreground">Tekan <kbd className="rounded border px-1.5 font-mono text-xs">/</kbd> di halaman mana pun untuk langsung ke Cari Cepat.</p>
      ) : null}
    </Halaman>
  );
}

function Baris({ h }: { h: HasilCari }) {
  const isi = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[0.9375rem] font-medium break-words">{h.judul}</span>
        {h.sub ? <span className="text-xs text-muted-foreground">{h.sub}</span> : null}
      </span>
      {h.nilai ? <span className="shrink-0 text-right font-mono text-sm font-semibold tabular-nums">{h.nilai}</span> : null}
      {h.href ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  const kelas = "flex items-center gap-3 px-4 py-2.5";
  if (!h.href) return <li className={kelas}>{isi}</li>;
  const luar = h.href.startsWith("http");
  return (
    <li>
      {luar ? (
        <a href={h.href} target="_blank" rel="noreferrer" className={cn(kelas, "hover:bg-accent/50")}>
          {isi}
        </a>
      ) : (
        <Link href={h.href} className={cn(kelas, "hover:bg-accent/50")}>
          {isi}
        </Link>
      )}
    </li>
  );
}
