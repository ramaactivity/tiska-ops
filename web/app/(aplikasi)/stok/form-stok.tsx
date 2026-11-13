"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { aturMinimum, catatKeluar, catatMutasiManual, hapusKeluar, masukkanBarisNota } from "./actions";

// "1,5" (kebiasaan Indonesia) dan "1.5" sama-sama diterima.
const keAngka = (t: string) => (t.trim() === "" ? NaN : Number(t.replace(",", ".")));
const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

function jalankan(mulai: (f: () => Promise<void>) => void, kerja: () => Promise<void>, sukses: string) {
  mulai(async () => {
    try {
      await kerja();
      toast.success(sukses);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal.");
    }
  });
}

/**
 * Waste / koreksi stok. Daftar bahan dimuat saat dibuka (982 bahan) — supaya
 * halaman stok tetap ringan untuk yang hanya melihat.
 */
export function FormMutasi({ bahanAwal }: { bahanAwal?: OpsiCari & { satuan: string | null } }) {
  const [buka, setBuka] = useState(Boolean(bahanAwal));
  const [pilihan, setPilihan] = useState<(OpsiCari & { satuan: string | null })[]>([]);
  const [daftarEvent, setDaftarEvent] = useState<OpsiCari[] | null>(null);
  const [acara, setAcara] = useState<OpsiCari | undefined>();
  const [bahan, setBahan] = useState(bahanAwal);
  const [jenis, setJenis] = useState("keluar");
  const [qty, setQty] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  useEffect(() => {
    if (!buka || bahanAwal || pilihan.length) return;
    fetch("/stok/bahan").then((r) => r.json()).then(setPilihan).catch(() => toast.error("Daftar bahan gagal dimuat."));
  }, [buka, bahanAwal, pilihan.length]);
  useEffect(() => {
    if (!buka || jenis !== "keluar" || daftarEvent) return;
    fetch("/stok/event").then((r) => r.json()).then(setDaftarEvent).catch(() => toast.error("Daftar event gagal dimuat."));
  }, [buka, jenis, daftarEvent]);

  if (!buka) {
    return (
      <div>
        <Button variant="outline" onClick={() => setBuka(true)}>
          Catat barang keluar / waste / koreksi
        </Button>
      </div>
    );
  }
  return (
    <section className="flex flex-col gap-3 kartu p-4">
      <h2 className="eyebrow">Catat barang keluar / waste / koreksi</h2>
      {!bahanAwal ? <PilihCari nilai={bahan} pilihan={pilihan} onPilih={(p) => setBahan(p as typeof bahan)} placeholder="Cari bahan…" /> : null}
      <PilihanChip
        kecil
        label="Jenis"
        nilai={jenis}
        onPilih={setJenis}
        pilihan={[
          { nilai: "keluar", label: "Barang keluar" },
          { nilai: "waste", label: "Waste (rusak/basi/tumpah)" },
          { nilai: "tambah", label: "Koreksi: tambah" },
          { nilai: "kurang", label: "Koreksi: kurang" },
        ]}
      />
      {jenis === "keluar" ? (
        <div className="flex flex-col gap-1">
          <PilihCari nilai={acara} pilihan={daftarEvent ?? []} onPilih={setAcara} placeholder={daftarEvent ? "Untuk event apa? (kosongkan bila bukan untuk event)" : "Memuat event…"} />
          <p className="text-xs text-muted-foreground">
            Untuk barang di luar resep (minyak tambahan, gas, kemasan…). Bahan resep sudah otomatis lewat Pemakaian event. Bila untuk event, nilainya masuk Margin event itu.
          </p>
          {acara ? (
            <button type="button" className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setAcara(undefined)}>
              Bukan untuk event
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={qty} inputMode="decimal" onChange={(e) => setQty(e.target.value)} className="w-28 text-right font-mono tabular-nums" placeholder="Jumlah" aria-label="Jumlah" />
        <span className="text-sm text-muted-foreground">{bahan?.satuan ?? ""}</span>
        <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} className="w-48" aria-label="Tanggal" />
        <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={jenis === "keluar" ? (acara ? "Catatan (opsional)" : "Keperluannya, mis. dipakai kantor") : jenis === "waste" ? "Sebabnya, mis. sayur busuk" : "Alasan koreksi"} className="min-w-48 flex-1" aria-label="Catatan" />
        <Button
          disabled={menunggu || !bahan || !(keAngka(qty) > 0)}
          onClick={() =>
            jalankan(
              mulai,
              async () => {
                if (jenis === "keluar") await catatKeluar({ idBahan: bahan!.id, qty: keAngka(qty), tanggal, idEvent: acara?.id ?? null, catatan });
                else await catatMutasiManual({ idBahan: bahan!.id, jenis: jenis as "waste", qty: keAngka(qty), tanggal, catatan });
                setQty("");
                setCatatan("");
              },
              "Stok tercatat.",
            )
          }
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Simpan
        </Button>
      </div>
    </section>
  );
}

/** Hapus catatan barang keluar yang salah (stok kembali, Margin event dihitung ulang). */
export function TombolHapusKeluar({ id }: { id: string }) {
  const [yakin, setYakin] = useState(false);
  const [menunggu, mulai] = useTransition();
  return yakin ? (
    <span className="flex items-center gap-1">
      <Button size="sm" variant="outline" disabled={menunggu} onClick={() => setYakin(false)}>
        Tidak
      </Button>
      <Button size="sm" variant="destructive" disabled={menunggu} onClick={() => jalankan(mulai, () => hapusKeluar(id), "Catatan dihapus.")}>
        Hapus
      </Button>
    </span>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => setYakin(true)}>
      Hapus
    </Button>
  );
}

/** Baris nota yang satuannya tidak bisa dikonversi: gudang mengisi jumlah dalam satuan stok. */
export function MasukkanBaris({ id, satuan }: { id: string; satuan: string | null }) {
  const [qty, setQty] = useState("");
  const [menunggu, mulai] = useTransition();
  return (
    <span className="flex items-center gap-2">
      <Input value={qty} inputMode="decimal" onChange={(e) => setQty(e.target.value)} className="w-24 bg-card text-right font-mono tabular-nums" aria-label="Jumlah masuk stok" />
      <span className="text-muted-foreground">{satuan ?? ""}</span>
      <Button size="sm" disabled={menunggu || !(keAngka(qty) > 0)} onClick={() => jalankan(mulai, () => masukkanBarisNota(id, keAngka(qty)), "Masuk stok.")}>
        Masukkan
      </Button>
    </span>
  );
}

export function FormMinimum({ id, minimum, satuan }: { id: string; minimum: string; satuan: string | null }) {
  const [nilai, setNilai] = useState(minimum.replace(".", ","));
  const [menunggu, mulai] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={nilai} inputMode="decimal" onChange={(e) => setNilai(e.target.value)} className="w-28 text-right font-mono tabular-nums" placeholder="—" aria-label="Stok minimum" />
      <span className="text-sm text-muted-foreground">{satuan ?? ""}</span>
      <Button
        size="sm"
        variant="outline"
        disabled={menunggu || (nilai.trim() !== "" && !(keAngka(nilai) >= 0))}
        onClick={() => jalankan(mulai, () => aturMinimum(id, nilai.trim() === "" ? null : keAngka(nilai)), "Stok minimum tersimpan.")}
      >
        Simpan minimum
      </Button>
    </div>
  );
}
