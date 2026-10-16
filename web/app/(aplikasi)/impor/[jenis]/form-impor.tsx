"use client";

import { CircleAlert, CircleCheck, CircleMinus, Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { BagianForm, BingkaiTabel, Td, Th } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import type { KolomImpor } from "@/lib/impor/definisi";
import type { BarisDiperiksa } from "@/lib/impor/simpan";
import { cn } from "@/lib/utils";

import { jalankanImpor, periksaImpor } from "./actions";

const SARING = [
  { nilai: "semua", label: "Semua" },
  { nilai: "baru", label: "Akan ditambah" },
  { nilai: "ada", label: "Dilewati" },
  { nilai: "galat", label: "Perlu dibetulkan" },
] as const;

export function FormImpor({
  jenis,
  judul,
  kembali,
  duplikat,
  kolom,
}: {
  jenis: string;
  judul: string;
  kembali: string;
  duplikat: string;
  kolom: KolomImpor[];
}) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [baris, setBaris] = useState<BarisDiperiksa[] | null>(null);
  const [saring, setSaring] = useState<(typeof SARING)[number]["nilai"]>("semua");
  const [memeriksa, mulaiPeriksa] = useTransition();
  const [menyimpan, mulaiSimpan] = useTransition();

  const hitung = (s: BarisDiperiksa["status"]) => baris?.filter((b) => b.status === s).length ?? 0;
  const baru = hitung("baru");
  const tampil = (baris ?? []).filter((b) => saring === "semua" || b.status === saring);

  function periksa(b: File) {
    setBerkas(b);
    setBaris(null);
    const data = new FormData();
    data.set("berkas", b);
    mulaiPeriksa(async () => {
      const h = await periksaImpor(jenis, data);
      if (h.pesan) toast.error(h.pesan);
      else setBaris(h.baris ?? []);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <BagianForm nomor={1} judul="Unduh template" keterangan={`Isi di Excel (atau Google Sheets), satu baris satu ${judul.toLowerCase()}. ${duplikat}`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full bg-card" render={<a href={`/impor/${jenis}/template`} />}>
            <Download className="size-4" />
            Template Excel (.xlsx)
          </Button>
          <Button variant="outline" className="rounded-full bg-card" render={<a href={`/impor/${jenis}/template?format=csv`} />}>
            <Download className="size-4" />
            Template CSV
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Kolom: {kolom.map((k) => `${k.judul}${k.wajib ? " (wajib)" : ""}`).join(" · ")}
        </p>
      </BagianForm>

      <BagianForm nomor={2} judul="Unggah berkas yang sudah diisi" keterangan="Excel (.xlsx) atau CSV, maksimal 2 MB / 2.000 baris.">
        <input
          ref={masukan}
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          aria-label="Berkas impor"
          onChange={(e) => {
            const b = e.target.files?.[0];
            if (b) periksa(b);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" className="h-12 justify-start rounded-full bg-card sm:w-fit sm:min-w-80" disabled={memeriksa} onClick={() => masukan.current?.click()}>
          {memeriksa ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
          <span className="truncate">{memeriksa ? "Memeriksa…" : berkas ? `${berkas.name} — pilih berkas lain` : "Pilih berkas Excel / CSV…"}</span>
        </Button>
      </BagianForm>

      {baris ? (
        <BagianForm nomor={3} judul="Periksa, lalu impor" keterangan="Hanya baris hijau yang ditambahkan. Baris merah perbaiki di berkas lalu unggah ulang.">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Saring hasil">
            {SARING.map((s) => {
              const n = s.nilai === "semua" ? baris.length : hitung(s.nilai);
              return (
                <button
                  key={s.nilai}
                  type="button"
                  aria-pressed={saring === s.nilai}
                  onClick={() => setSaring(s.nilai)}
                  className={cn(
                    "min-h-9 rounded-full border px-3.5 text-sm transition-colors",
                    saring === s.nilai ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent",
                  )}
                >
                  {s.label} <span className="tabular-nums opacity-75">{n}</span>
                </button>
              );
            })}
          </div>

          <BingkaiTabel>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <Th className="w-16">Baris</Th>
                  <Th className="w-52">Hasil</Th>
                  {kolom.slice(0, 4).map((k) => (
                    <Th key={k.kunci}>{k.judul}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tampil.slice(0, 300).map((b) => (
                  <tr key={b.nomor} className="border-b border-border-row last:border-0">
                    <Td className="font-mono text-muted-foreground">{b.nomor}</Td>
                    <Td>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-medium",
                          b.status === "baru" ? "text-lunas" : b.status === "ada" ? "text-muted-foreground" : "text-tempo",
                        )}
                      >
                        {b.status === "baru" ? <CircleCheck className="size-4" /> : b.status === "ada" ? <CircleMinus className="size-4" /> : <CircleAlert className="size-4" />}
                        {b.status === "baru" ? "Ditambah" : b.status === "ada" ? "Dilewati" : "Perlu dibetulkan"}
                      </span>
                      {b.pesan ? <span className="block text-xs text-muted-foreground">{b.pesan}</span> : null}
                    </Td>
                    {kolom.slice(0, 4).map((k) => (
                      <Td key={k.kunci} className="max-w-60 truncate">
                        {b.data[k.kunci] || <span className="text-muted-foreground">—</span>}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </BingkaiTabel>
          {tampil.length > 300 ? <p className="text-sm text-muted-foreground">Menampilkan 300 baris pertama dari {tampil.length}.</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="h-11 rounded-full px-6"
              disabled={!baru || menyimpan}
              onClick={() =>
                mulaiSimpan(async () => {
                  const h = await jalankanImpor(
                    jenis,
                    baris.map((b) => b.data),
                  );
                  if (h.pesan) return void toast.error(h.pesan);
                  toast.success(`${h.jumlah} ${judul.toLowerCase()} ditambahkan.`);
                  router.push(kembali);
                })
              }
            >
              {menyimpan ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {menyimpan ? "Mengimpor…" : baru ? `Impor ${baru} ${judul.toLowerCase()}` : "Tidak ada yang bisa diimpor"}
            </Button>
            {hitung("galat") ? <span className="text-sm text-tempo">{hitung("galat")} baris perlu dibetulkan dulu (tidak ikut diimpor).</span> : null}
          </div>
        </BagianForm>
      ) : null}
    </div>
  );
}
