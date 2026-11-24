import { Download, ExternalLink } from "lucide-react";

import { SalinTeks } from "@/components/salin-teks";
import { Button } from "@/components/ui/button";
import { ATURAN_LOGO, FOLDER_UNDUH, FOTO_PROFIL, type GambarBrand, HURUF, IDENTITAS, LOGO, LOGO_SPONSOR, WARNA, ZIP_LOGO } from "@/lib/kit-brand";
import { cn } from "@/lib/utils";

import { SalinWarna } from "./salin-warna";

const LATAR = { gelap: "#16140f", terang: "#f6f1e7" } as const;
const ukuran = (n: number) => n.toLocaleString("id-ID");

/* Kit brand (D-226): logo resmi untuk diunduh + warna, huruf, aturan pakai — pola halaman branding Atapura. */
export function KitBrand() {
  return (
    <div className="flex flex-col gap-6">
      <section className="kartu p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
          <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
            <h2 className="eyebrow">Logo resmi</h2>
            <p className="mt-1 max-w-[62ch] text-[0.9375rem] text-muted-foreground">
              PNG transparan resolusi tinggi, dengan tanda ®. Untuk Canva, banner, kemasan, dan materi sponsor.
            </p>
          </div>
          <Button render={<a href={`${FOLDER_UNDUH}/${ZIP_LOGO.file}`} download />} className="shrink-0 rounded-full">
            <Download className="size-4" />
            Unduh semua (ZIP, {ZIP_LOGO.ukuran})
          </Button>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOGO.map((l) => (
            <li key={l.file} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
              {/* Tinggi tetap: logo tegak & mendatar sama-sama muat tanpa membuat kartu sebaris tidak rata. */}
              <div className="flex h-44 items-center justify-center p-6" style={{ backgroundColor: LATAR[l.latar] }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- file statis apa adanya, bukan gambar yang dioptimasi */}
                <img src={`${FOLDER_UNDUH}/${l.file}`} alt={`Logo Tiska ${l.warna} ${l.bentuk}`} loading="lazy" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium capitalize">
                    {l.warna} · {l.bentuk}
                  </p>
                  <p className="text-sm text-muted-foreground">{l.kapan}</p>
                  <p className="mt-0.5 font-mono text-xs text-subtle-foreground">
                    PNG {ukuran(l.lebar)} × {ukuran(l.tinggi)} px
                  </p>
                </div>
                <Button variant="outline" size="sm" render={<a href={`${FOLDER_UNDUH}/${l.file}`} download />} className="mt-auto self-start rounded-full">
                  <Download className="size-4" />
                  Unduh PNG
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <ul className="mt-5 flex flex-col gap-1.5 border-t pt-4 text-[0.9375rem]">
          {ATURAN_LOGO.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      <KisiUnduh
        judul="Foto profil WhatsApp & Instagram"
        keterangan="Persegi 1080 × 1080 px, logo sudah muat di dalam lingkaran — tulisan TISKA tidak terpotong saat dipasang jadi DP grup atau akun."
        isi={FOTO_PROFIL}
        bulat
      />

      <KisiUnduh
        judul="Logo sponsorship"
        keterangan="Kartu logo untuk deretan logo sponsor di spanduk, backdrop, dan flyer acara. Sudah dengan ®."
        isi={LOGO_SPONSOR}
      />

      <section className="kartu p-5 sm:p-6">
        <h2 className="eyebrow">Warna</h2>
        <p className="mt-1 mb-4 text-[0.9375rem] text-muted-foreground">Ketuk kotaknya untuk menyalin kode warna.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WARNA.map((w) => (
            <SalinWarna key={w.hex} {...w} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="kartu p-5 sm:p-6">
          <h2 className="eyebrow">Huruf</h2>
          <ul className="mt-3 flex flex-col divide-y">
            {HURUF.map((h) => (
              <li key={h.nama} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3 first:pt-1 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {h.nama} <span className="font-normal text-muted-foreground">· {h.peran}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{h.catatan}</p>
                </div>
                {h.tautan ? (
                  <Button variant="outline" size="sm" render={<a href={h.tautan} target="_blank" rel="noreferrer" />} className="rounded-full">
                    <ExternalLink className="size-4" />
                    Unduh gratis
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="kartu p-5 sm:p-6">
          <h2 className="eyebrow">Tulisan resmi</h2>
          <dl className="mt-3 flex flex-col gap-4">
            {[
              ["Tagline", IDENTITAS.tagline],
              ["Situs", IDENTITAS.situs],
            ].map(([label, isi]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <dt className="label-kecil">{label}</dt>
                  <dd className="text-[0.9375rem]">{isi}</dd>
                </div>
                <SalinTeks teks={isi} pesan={`${label} tersalin.`} />
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

/** Kisi unduhan gambar turunan (DP & sponsorship). `bulat` = pratinjau dipotong lingkaran seperti tampilan WA/IG. */
function KisiUnduh({ judul, keterangan, isi, bulat = false }: { judul: string; keterangan: string; isi: GambarBrand[]; bulat?: boolean }) {
  return (
    <section className="kartu p-5 sm:p-6">
      <h2 className="eyebrow">{judul}</h2>
      <p className="mt-1 mb-5 max-w-[62ch] text-[0.9375rem] text-muted-foreground">{keterangan}</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isi.map((g) => (
          <li key={g.file} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
            <div className="flex h-44 items-center justify-center p-5" style={{ backgroundColor: bulat ? "var(--muted)" : LATAR[g.latar] }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- file statis apa adanya, bukan gambar yang dioptimasi */}
              <img
                src={`${FOLDER_UNDUH}/${g.file}`}
                alt={`Tiska — ${g.judul}`}
                loading="lazy"
                className={cn("object-contain", bulat ? "aspect-square h-full rounded-full shadow-[0_4px_16px_-6px_rgb(0_0_0/0.35)]" : "h-full w-full")}
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{g.judul}</p>
                <p className="text-sm text-muted-foreground">{g.kapan}</p>
                <p className="mt-0.5 font-mono text-xs text-subtle-foreground">
                  PNG {ukuran(g.lebar)} × {ukuran(g.tinggi)} px
                </p>
              </div>
              <Button variant="outline" size="sm" render={<a href={`${FOLDER_UNDUH}/${g.file}`} download />} className="mt-auto self-start rounded-full">
                <Download className="size-4" />
                Unduh PNG
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
