"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { BagianForm } from "@/components/halaman";
import { InputSaran } from "@/components/input-saran";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { unggahPdf } from "../[id]/unggah-versi";
import { buatPricelist } from "../actions";

const WILAYAH = [
  { nilai: "semua", label: "Bogor & Jakarta" },
  { nilai: "bogor", label: "Bogor" },
  { nilai: "jakarta", label: "Jakarta" },
];
const BASIS = [
  { nilai: "plus_plus", label: "Harga ++" },
  { nilai: "nett", label: "Harga nett" },
  { nilai: "", label: "Tidak disebut" },
];

export function FormPricelistBaru({ saranSegmen }: { saranSegmen: string[] }) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);
  const [nama, setNama] = useState("");
  const [segmen, setSegmen] = useState("");
  const [wilayah, setWilayah] = useState("semua");
  const [basis, setBasis] = useState("plus_plus");
  const [musiman, setMusiman] = useState("tidak");
  const [venue, setVenue] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [galat, setGalat] = useState<Record<string, string | undefined>>({});
  const [sedang, setSedang] = useState(false);

  async function simpan() {
    if (!berkas) return setGalat({ berkas: "Pilih berkas PDF pricelist-nya." });
    if (berkas.type !== "application/pdf") return setGalat({ berkas: "Hanya berkas PDF." });
    setSedang(true);
    setGalat({});
    try {
      const hasil = await buatPricelist({ name: nama, segment: segmen, region: wilayah as "semua", price_basis: basis, venue, seasonal: musiman === "ya" });
      if (!hasil.id) {
        setGalat(hasil.galat ?? {});
        return;
      }
      try {
        await unggahPdf(hasil.id, berkas, "Versi pertama");
        toast.success("Pricelist baru tersimpan dan siap dikirim.");
      } catch (e) {
        // Pricelist sudah tercatat — PDF tinggal diunggah ulang dari halaman detailnya.
        toast.error(`Pricelist tersimpan, tapi PDF gagal diunggah: ${e instanceof Error ? e.message : "coba lagi"}. Unggah ulang di bagian "Unggah versi baru".`);
      }
      router.push(`/pricelist/${hasil.id}`);
    } catch {
      toast.error("Gagal menyimpan. Coba lagi sebentar.");
    } finally {
      setSedang(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <BagianForm nomor={1} judul="Tentang pricelist ini">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pl-nama">Nama pricelist</Label>
          <Input id="pl-nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Menu Wedding Bogor 2027" aria-invalid={Boolean(galat.name)} />
          {galat.name ? <p className="text-xs text-destructive">{galat.name}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pl-segmen">Untuk siapa (segmen)</Label>
          <InputSaran id="pl-segmen" value={segmen} onChange={setSegmen} saran={saranSegmen} placeholder="mis. Wedding, Corporate, Hampers musiman" />
          {galat.segment ? <p className="text-xs text-destructive">{galat.segment}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Wilayah</Label>
          <PilihanChip pilihan={WILAYAH} nilai={wilayah} onPilih={setWilayah} label="Wilayah" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Harga di PDF</Label>
          <PilihanChip pilihan={BASIS} nilai={basis} onPilih={setBasis} label="Harga di PDF" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Musiman?</Label>
          <PilihanChip
            pilihan={[
              { nilai: "tidak", label: "Sepanjang tahun" },
              { nilai: "ya", label: "Musiman (Ramadan, Natal, Imlek…)" },
            ]}
            nilai={musiman}
            onPilih={setMusiman}
            label="Musiman"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pl-venue">Venue rekanan (opsional)</Label>
          <Input id="pl-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Isi kalau pricelist khusus satu venue, mis. Puri Begawan" />
        </div>
      </BagianForm>

      <BagianForm nomor={2} judul="Berkas PDF" keterangan="Maksimal 50 MB. Nanti kalau ada revisi, cukup unggah versi baru — link ke klien tetap sama.">
        <input ref={masukan} type="file" accept="application/pdf" className="sr-only" onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" className="h-12 justify-start rounded-full bg-card" onClick={() => masukan.current?.click()}>
          <FileUp className="size-4" />
          <span className="truncate">{berkas ? `${berkas.name} (${(berkas.size / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB)` : "Pilih berkas PDF…"}</span>
        </Button>
        {galat.berkas ? <p className="text-xs text-destructive">{galat.berkas}</p> : null}
      </BagianForm>

      <div>
        <Button type="button" onClick={simpan} disabled={sedang} className="h-11 rounded-full px-6">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan & mengunggah…" : "Simpan pricelist"}
        </Button>
      </div>
    </div>
  );
}
