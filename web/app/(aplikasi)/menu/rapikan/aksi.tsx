"use client";

import { Check, Combine, LoaderCircle, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { rapikanTeks } from "@/lib/cari-mirip";
import { kunciMenu } from "@/lib/hitung/menu-dapur";
import type { KelompokKembar, NamaBelumDikenal, SaranResep } from "@/lib/rapikan-menu";

import { buatMenuDariNama, gabungkanBahan, gabungkanMenu, gabungkanResep, lewatiSaran, sambungkanResep, tambahNamaLain } from "../actions";

type Hasil = { ok: boolean; pesan: string };

function useAksi() {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const jalan = (kerja: () => Promise<Hasil>) =>
    mulai(async () => {
      const r = await kerja();
      if (r.ok) {
        toast.success(r.pesan);
        router.refresh();
      } else toast.error(r.pesan);
    });
  return { menunggu, jalan };
}

const pakai = (paket: number, pilihan: number) => [paket ? `${paket} paket` : null, pilihan ? `${pilihan} pilihan paket` : null].filter(Boolean).join(" · ") || "belum dipakai paket";

/** Satu kelompok menu kembar → pilih induk & resep → Gabungkan (dikonfirmasi). */
export function KartuKembar({ k }: { k: KelompokKembar }) {
  const { menunggu, jalan } = useAksi();
  const [induk, setInduk] = useState(k.usulanInduk);
  const resepAda = [...new Map(k.anggota.flatMap((a) => (a.resep ? [[a.resep.id, a.resep.nama] as const] : []))).entries()];
  const [resep, setResep] = useState(k.anggota.find((a) => a.id === k.usulanInduk)?.resep?.id ?? resepAda[0]?.[0] ?? "");
  const [ikut, setIkut] = useState<string[]>(k.pasti ? k.anggota.map((a) => a.id) : k.anggota.map((a) => a.id));
  const [konfirmasi, setKonfirmasi] = useState(false);
  const indukNama = k.anggota.find((a) => a.id === induk)?.nama ?? "";
  const digabung = k.anggota.filter((a) => a.id !== induk && ikut.includes(a.id));

  return (
    <li className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={k.pasti ? "text-sm font-medium text-perhatian" : "text-sm text-muted-foreground"}>{k.pasti ? "Hampir pasti sama" : "Mungkin sama — cek dulu"}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {k.anggota.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 text-[0.9375rem]">
            <button
              type="button"
              aria-pressed={ikut.includes(a.id)}
              disabled={a.id === induk}
              onClick={() => setIkut((x) => (x.includes(a.id) ? x.filter((y) => y !== a.id) : [...x, a.id]))}
              className="flex size-5 shrink-0 items-center justify-center rounded border disabled:opacity-40 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              aria-label={`Ikut digabung: ${a.nama}`}
            >
              {ikut.includes(a.id) ? <Check className="size-3.5" /> : null}
            </button>
            <Link href={`/menu/${a.id}`} className="font-medium hover:underline">
              {a.nama}
            </Link>
            <span className="text-sm text-muted-foreground">
              {a.resep ? `resep ${a.resep.nama}` : "tanpa resep"} · {pakai(a.paket, a.pilihan)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Nama menu dapur (induk) — nama lainnya tetap dikenali:</span>
        <PilihanChip kecil label="Menu induk" nilai={induk} onPilih={setInduk} pilihan={k.anggota.filter((a) => ikut.includes(a.id)).map((a) => ({ nilai: a.id, label: a.nama }))} />
      </div>
      {resepAda.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Resep yang dipakai:</span>
          <PilihanChip kecil label="Resep" nilai={resep} onPilih={setResep} pilihan={resepAda.map(([id, nama]) => ({ nilai: id, label: nama }))} />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="rounded-full" disabled={menunggu || digabung.length === 0} onClick={() => setKonfirmasi(true)}>
          <Combine className="size-3.5" />
          Gabungkan {digabung.length ? `${digabung.length} ke induk` : ""}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-full"
          disabled={menunggu}
          onClick={() =>
            jalan(async () => {
              const ks = k.anggota.map((a) => kunciMenu(a.nama));
              for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) await lewatiSaran("kembar", ks[i], ks[j]);
              return { ok: true, pesan: "Ditandai bukan kembar." };
            })
          }
        >
          <X className="size-3.5" />
          Bukan kembar
        </Button>
      </div>
      <Dialog open={konfirmasi} onOpenChange={setKonfirmasi}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gabungkan ke &quot;{indukNama}&quot;?</DialogTitle>
            <DialogDescription>
              {digabung.map((a) => `"${a.nama}"`).join(", ")} dinonaktifkan dan namanya menjadi nama lain dari &quot;{indukNama}&quot;. Isi paket, pilihan paket,
              quotation, invoice, dan Ikut Menu Pesta yang memakainya pindah ke induk. Teks dokumen yang sudah dicetak tidak berubah, dan menu lama tidak dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setKonfirmasi(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={menunggu}
              onClick={() => {
                setKonfirmasi(false);
                jalan(() => gabungkanMenu(induk, digabung.map((a) => a.id), resep || null));
              }}
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Combine className="size-4" />}
              Gabungkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** Menu tanpa resep → calon resep mirip, atau cari resep lain. */
export function BarisSaranResep({ s, resep }: { s: SaranResep; resep: OpsiCari[] }) {
  const { menunggu, jalan } = useAksi();
  const [pilih, setPilih] = useState(s.calon[0]?.id ?? "");
  const [lain, setLain] = useState<OpsiCari | undefined>();
  const id = lain?.id ?? pilih;
  return (
    <li className="flex flex-col gap-2 border-b py-3.5 last:border-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <Link href={`/menu/${s.idMenu}`} className="font-medium hover:underline">
          {s.nama}
        </Link>
        <span className="text-sm text-muted-foreground">{s.paket ? `dipakai ${s.paket}×` : "belum dipakai paket"}</span>
      </div>
      <PilihanChip
        kecil
        label="Calon resep"
        nilai={lain ? "" : pilih}
        onPilih={(v) => {
          setLain(undefined);
          setPilih(v);
        }}
        pilihan={s.calon.map((c) => ({ nilai: c.id, label: `${c.nama} · ${c.kode}` }))}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <PilihCari nilai={lain} pilihan={resep} onPilih={setLain} placeholder="…atau cari resep lain" />
        </div>
        <Button type="button" size="sm" className="rounded-full" disabled={menunggu || !id} onClick={() => jalan(() => sambungkanResep(s.idMenu, id))}>
          <Check className="size-3.5" />
          Sambungkan
        </Button>
        {!lain && pilih ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            disabled={menunggu}
            onClick={() => jalan(() => lewatiSaran("resep", kunciMenu(s.nama), s.calon.find((c) => c.id === pilih)!.kode))}
          >
            <X className="size-3.5" />
            Bukan resep ini
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** Nama belum dikenal → jadikan nama lain sebuah menu, buat menu baru, atau abaikan. */
export function BarisNama({ n, menu }: { n: NamaBelumDikenal; menu: OpsiCari[] }) {
  const { menunggu, jalan } = useAksi();
  const [pilih, setPilih] = useState(n.tebakan?.id ?? n.calon[0]?.id ?? "");
  const [lain, setLain] = useState<OpsiCari | undefined>();
  const id = lain?.id ?? pilih;
  const pilihan = [...(n.tebakan ? [{ nilai: n.tebakan.id, label: n.tebakan.nama }] : []), ...n.calon.filter((c) => c.id !== n.tebakan?.id).map((c) => ({ nilai: c.id, label: c.nama }))];
  return (
    <li className="flex flex-col gap-2 border-b py-3.5 last:border-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium">{n.nama}</span>
        <span className="text-sm text-muted-foreground">
          {[n.pilihan ? `${n.pilihan} pilihan paket${n.contoh.length ? ` (${n.contoh.join(", ")})` : ""}` : null, n.dokumen ? `${n.dokumen}× di dokumen mendatang` : null].filter(Boolean).join(" · ")}
        </span>
      </div>
      {n.tebakan ? <p className="text-sm text-perhatian">Sementara dihitung sebagai &quot;{n.tebakan.nama}&quot; (salah ketik tipis) — pastikan benar.</p> : null}
      {pilihan.length ? (
        <>
          <span className="text-sm text-muted-foreground">Mungkin maksudnya:</span>
          <PilihanChip
            kecil
            label="Menu yang dimaksud"
            nilai={lain ? "" : pilih}
            onPilih={(v) => {
              setLain(undefined);
              setPilih(v);
            }}
            pilihan={pilihan}
          />
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <PilihCari nilai={lain} pilihan={menu} onPilih={setLain} placeholder="…atau cari menu lain" />
        </div>
        <Button type="button" size="sm" className="rounded-full" disabled={menunggu || !id} onClick={() => jalan(() => tambahNamaLain(id, n.nama))}>
          <Check className="size-3.5" />
          Jadikan nama lain
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => buatMenuDariNama(n.nama, null))}>
          <Plus className="size-3.5" />
          Menu baru
        </Button>
        <Button type="button" size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => lewatiSaran("nama", kunciMenu(n.nama), "*"))}>
          <X className="size-3.5" />
          Abaikan
        </Button>
      </div>
    </li>
  );
}

/** Menu tanpa calon resep → cari resepnya, atau buka menunya. */
export function BarisBelumResep({ m, resep }: { m: { id: string; nama: string; paket: number; pilihan: number }; resep: OpsiCari[] }) {
  const { menunggu, jalan } = useAksi();
  const [pilih, setPilih] = useState<OpsiCari | undefined>();
  return (
    <li className="flex flex-wrap items-center gap-2 border-b py-3 last:border-0">
      <span className="min-w-0 flex-1">
        <Link href={`/menu/${m.id}`} className="font-medium hover:underline">
          {m.nama}
        </Link>
        <span className="ml-2 text-sm text-muted-foreground">{pakai(m.paket, m.pilihan)}</span>
      </span>
      <div className="w-full max-w-xs">
        <PilihCari nilai={pilih} pilihan={resep} onPilih={setPilih} placeholder="Cari resepnya…" />
      </div>
      <Button type="button" size="sm" className="rounded-full" disabled={menunggu || !pilih} onClick={() => pilih && jalan(() => sambungkanResep(m.id, pilih.id))}>
        <Check className="size-3.5" />
        Sambungkan
      </Button>
    </li>
  );
}

/**
 * Resep / bahan kembar (D-123): pilih induk + yang ikut digabung → Gabungkan (dikonfirmasi) atau "Bukan kembar".
 * `blokir` = alasan tidak bisa digabung (mis. satuan pakai berbeda) — tetap bisa digabung sebagian lewat kotak centang.
 */
export function KartuGabung({
  jenis,
  pasti,
  catatan,
  anggota,
}: {
  jenis: "resep" | "bahan";
  pasti: boolean;
  catatan: string | null;
  anggota: { id: string; kode: string; nama: string; info: string; satuan?: string | null; href: string }[];
}) {
  const { menunggu, jalan } = useAksi();
  const [induk, setInduk] = useState(anggota[0].id);
  const [ikut, setIkut] = useState<string[]>(anggota.map((a) => a.id));
  const [konfirmasi, setKonfirmasi] = useState(false);
  const pilih = anggota.filter((a) => ikut.includes(a.id));
  const indukA = anggota.find((a) => a.id === induk)!;
  const digabung = pilih.filter((a) => a.id !== induk);
  const satuan = new Set(pilih.flatMap((a) => (a.satuan?.trim() ? [a.satuan.trim().toLowerCase()] : [])));
  const bedaSatuan = jenis === "bahan" && satuan.size > 1;

  return (
    <li className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
      <span className={pasti ? "text-sm font-medium text-perhatian" : "text-sm text-muted-foreground"}>
        {pasti ? "Hampir pasti sama" : "Mungkin sama — cek dulu"}
        {catatan ? ` · ${catatan}` : ""}
      </span>
      <ul className="flex flex-col gap-1.5">
        {anggota.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 text-[0.9375rem]">
            <button
              type="button"
              aria-pressed={ikut.includes(a.id)}
              disabled={a.id === induk}
              onClick={() => setIkut((x) => (x.includes(a.id) ? x.filter((y) => y !== a.id) : [...x, a.id]))}
              className="flex size-5 shrink-0 items-center justify-center rounded border disabled:opacity-40 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              aria-label={`Ikut digabung: ${a.nama}`}
            >
              {ikut.includes(a.id) ? <Check className="size-3.5" /> : null}
            </button>
            <Link href={a.href} className="font-medium hover:underline">
              <span className="nomor-dokumen mr-1.5 text-muted-foreground">{a.kode}</span>
              {a.nama}
            </Link>
            <span className="text-sm text-muted-foreground">{a.info}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">{jenis === "resep" ? "Resep induk — takarannya yang dipakai:" : "Bahan induk — kode & data kemasannya yang dipakai:"}</span>
        <PilihanChip kecil label="Induk" nilai={induk} onPilih={setInduk} pilihan={pilih.map((a) => ({ nilai: a.id, label: `${a.kode} ${a.nama}` }))} />
      </div>
      {bedaSatuan ? <p className="text-sm text-destructive">Satuan pakai berbeda ({[...satuan].join(" / ")}) — hilangkan centang yang beda, atau samakan satuannya dulu di halaman Bahan.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="rounded-full" disabled={menunggu || !digabung.length || bedaSatuan} onClick={() => setKonfirmasi(true)}>
          <Combine className="size-3.5" />
          Gabungkan {digabung.length ? `${digabung.length} ke induk` : ""}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-full"
          disabled={menunggu}
          onClick={() =>
            jalan(async () => {
              const ks = anggota.map((a) => rapikanTeks(a.kode));
              for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) await lewatiSaran(jenis === "resep" ? "rkembar" : "bkembar", ks[i], ks[j]);
              return { ok: true, pesan: "Ditandai bukan kembar." };
            })
          }
        >
          <X className="size-3.5" />
          Bukan kembar
        </Button>
      </div>
      <Dialog open={konfirmasi} onOpenChange={setKonfirmasi}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Gabungkan ke {indukA.kode} {indukA.nama}?
            </DialogTitle>
            <DialogDescription>
              {jenis === "resep"
                ? `${digabung.map((a) => a.kode).join(", ")} disembunyikan (tidak dihapus). Menu yang memakainya pindah ke resep induk — HPP & Kebutuhan Bahan memakai takaran induk.`
                : `${digabung.map((a) => a.kode).join(", ")} disembunyikan (tidak dihapus). Baris resep, PR, nota belanja, PO, stok, opname, dan riwayat harganya pindah ke bahan induk; pemakaian di tanggal yang sama dijumlahkan.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setKonfirmasi(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={menunggu}
              onClick={() => {
                setKonfirmasi(false);
                const lain = digabung.map((a) => a.id);
                jalan(() => (jenis === "resep" ? gabungkanResep(induk, lain) : gabungkanBahan(induk, lain)));
              }}
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Combine className="size-4" />}
              Gabungkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
