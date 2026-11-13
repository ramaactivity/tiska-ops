"use client";

import { Check, LoaderCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ALASAN_SELISIH, selisihOpname } from "@/lib/hitung/opname";

import { ajukanOpname, finalkanOpname, hapusOpname, isiHitung, kembalikanOpname, tambahBarisOpname } from "../actions";

type Baris = {
  id: string;
  nama: string;
  kode: string;
  kategori: string;
  satuan: string | null;
  sistemSekarang: string;
  /** Saldo sistem saat dihitung (pembanding selisih). */
  sistem: string | null;
  hitung: string | null;
  alasan: string;
  oleh: string | null;
};

const keAngka = (t: string) => (t.trim() === "" ? NaN : Number(t.replace(",", ".")));
const tampil = (n: string | number) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const lewatkanRedirect = (e: unknown) => {
  if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
};

/** Satu baris hitung: tersimpan saat kotak ditinggalkan (blur) — aman bila sinyal putus di tengah. */
function BarisHitung({ b, bisaUbah }: { b: Baris; bisaUbah: boolean }) {
  const [teks, setTeks] = useState(b.hitung ? String(Number(b.hitung)).replace(".", ",") : "");
  const [sistem, setSistem] = useState(b.sistem);
  const [alasan, setAlasan] = useState(b.alasan);
  const [simpan, mulai] = useTransition();
  const n = keAngka(teks);
  const s = selisihOpname(sistem ?? b.sistemSekarang, Number.isFinite(n) ? n : 0);
  const kirim = (nilai: string, a = alasan) =>
    mulai(async () => {
      const x = keAngka(nilai);
      if (nilai.trim() !== "" && !(x >= 0)) return void toast.error(`Jumlah ${b.nama} belum benar.`);
      try {
        const r = await isiHitung(b.id, nilai.trim() === "" ? null : x, a);
        setSistem(nilai.trim() === "" ? null : r.sistem);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
      }
    });
  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{b.nama}</p>
          <p className="text-xs text-muted-foreground">
            {b.kode} · catatan sistem {tampil(sistem ?? b.sistemSekarang)} {b.satuan ?? ""}
            {b.oleh ? ` · dihitung ${b.oleh}` : ""}
          </p>
        </div>
        {simpan ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : b.hitung || sistem ? <Check className="size-4 text-lunas" /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={teks}
          inputMode="decimal"
          disabled={!bisaUbah}
          onChange={(e) => setTeks(e.target.value)}
          onBlur={() => teks !== (b.hitung ? String(Number(b.hitung)).replace(".", ",") : "") && kirim(teks)}
          className="w-28 text-right font-mono tabular-nums"
          placeholder="Hitung"
          aria-label={`Hasil hitung ${b.nama}`}
        />
        <span className="text-sm text-muted-foreground">{b.satuan ?? ""}</span>
        {Number.isFinite(n) && teks.trim() !== "" ? (
          <span className={`ml-auto font-mono text-sm tabular-nums ${s.wajibAlasan ? "text-tempo" : "text-muted-foreground"}`}>
            selisih {s.selisih.gt(0) ? "+" : ""}
            {tampil(s.selisih.toString())}
            {s.persen ? ` (${s.persen.toFixed(1)}%)` : ""}
          </span>
        ) : null}
      </div>
      {s.wajibAlasan && teks.trim() !== "" ? (
        bisaUbah ? (
          <PilihanChip
            kecil
            label={`Alasan selisih ${b.nama}`}
            nilai={alasan}
            onPilih={(v) => {
              setAlasan(v);
              kirim(teks, v);
            }}
            pilihan={ALASAN_SELISIH.map((a) => ({ nilai: a, label: a }))}
          />
        ) : (
          <p className="text-xs text-perhatian">Alasan: {alasan || "—"}</p>
        )
      ) : null}
    </li>
  );
}

export function HitungOpname({ id, status, baris }: { id: string; status: string; baris: Baris[] }) {
  const bisaUbah = status === "berjalan";
  const kategori = useMemo(() => [...new Set(baris.map((b) => b.kategori))], [baris]);
  // Opname yang sudah diajukan/final dibuka di "Semua" — kotak kosong yang mati hanya membingungkan.
  const [saring, setSaring] = useState(bisaUbah ? "belum" : "semua");
  const [pilihan, setPilihan] = useState<OpsiCari[]>([]);
  const [menunggu, mulai] = useTransition();
  const [hapus, setHapus] = useState(false);
  useEffect(() => {
    if (!bisaUbah) return;
    fetch("/stok/bahan").then((r) => r.json()).then(setPilihan).catch(() => {});
  }, [bisaUbah]);
  const sudah = baris.filter((b) => b.hitung !== null).length;
  // "Belum dihitung" = yang belum dihitung saat halaman dibuka, ditambah yang masih butuh alasan.
  // Baris yang baru diisi TETAP tampil — kalau langsung hilang, alasan selisihnya tidak sempat dipilih.
  const [belumAwal] = useState(() => new Set(baris.filter((b) => b.hitung === null).map((b) => b.id)));
  const perluAlasan = (b: Baris) => b.hitung !== null && !b.alasan && selisihOpname(b.sistem ?? b.sistemSekarang, b.hitung).wajibAlasan;
  const tampilBaris = baris.filter((b) =>
    saring === "belum" ? belumAwal.has(b.id) || perluAlasan(b) : saring === "semua" ? true : b.kategori === saring,
  );

  return (
    <div className="flex flex-col gap-4">
      <PilihanChip
        kecil
        label="Kategori"
        nilai={saring}
        onPilih={setSaring}
        pilihan={[{ nilai: "belum", label: `Belum dihitung (${baris.length - sudah})` }, { nilai: "semua", label: "Semua" }, ...kategori.map((k) => ({ nilai: k, label: k }))]}
      />
      <section className="kartu">
        <h2 className="eyebrow border-b p-4">
          {sudah} dari {baris.length} bahan dihitung
        </h2>
        {!tampilBaris.length ? <p className="p-4 text-sm text-muted-foreground">{saring === "belum" ? "Semua bahan sudah dihitung." : "Tidak ada bahan."}</p> : null}
        <ul className="divide-y">
          {tampilBaris.map((b) => (
            <BarisHitung key={b.id} b={b} bisaUbah={bisaUbah} />
          ))}
        </ul>
        {bisaUbah ? (
          <div className="border-t p-4">
            <PilihCari pilihan={pilihan} placeholder="+ Tambah bahan yang ada di rak tapi belum di daftar…" onPilih={(p) => mulai(async () => { try { await tambahBarisOpname(id, p.id); } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal."); } })} />
          </div>
        ) : null}
      </section>
      {bisaUbah ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {hapus ? (
            <>
              <span className="text-sm text-muted-foreground">Buang opname ini (hasil hitung hilang)?</span>
              <Button variant="outline" onClick={() => setHapus(false)}>
                Tidak
              </Button>
              <Button variant="destructive" disabled={menunggu} onClick={() => mulai(async () => { try { await hapusOpname(id); } catch (e) { lewatkanRedirect(e); toast.error(e instanceof Error ? e.message : "Gagal."); } })}>
                Ya, buang
              </Button>
            </>
          ) : (
            <Button variant="ghost" className="mr-auto" onClick={() => setHapus(true)}>
              <Trash2 className="size-4" />
              Buang
            </Button>
          )}
          <Button
            disabled={menunggu || !sudah}
            onClick={() =>
              mulai(async () => {
                try {
                  await ajukanOpname(id);
                  toast.success("Opname diajukan ke Finance.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Gagal.");
                }
              })
            }
          >
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
            Ajukan ke Finance
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Finance: finalkan (stok disesuaikan) atau kembalikan untuk dihitung ulang. */
export function PanelFinanceOpname({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  const [catatan, setCatatan] = useState("");
  const [kembali, setKembali] = useState(false);
  const jalan = (k: () => Promise<void>, ok: string) =>
    mulai(async () => {
      try {
        await k();
        toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    });
  return (
    <section className="flex flex-col gap-3 kartu p-5">
      <h2 className="eyebrow">Pemeriksaan Finance</h2>
      <p className="text-sm text-muted-foreground">Finalkan → setiap selisih dibukukan ke stok (mutasi “opname”). Hasil ini menjadi stok awal bulan.</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={menunggu} onClick={() => jalan(() => finalkanOpname(id), "Opname final, stok disesuaikan.")}>
          Finalkan
        </Button>
        <Button variant="outline" disabled={menunggu} onClick={() => setKembali(true)}>
          Kembalikan
        </Button>
      </div>
      {kembali ? (
        <div className="flex flex-col gap-2">
          <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Apa yang perlu dihitung ulang?" aria-label="Catatan pengembalian opname" />
          <div className="flex justify-end">
            <Button variant="outline" disabled={menunggu || !catatan.trim()} onClick={() => jalan(() => kembalikanOpname(id, catatan), "Opname dikembalikan.")}>
              Kirim kembali
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
