import { ChevronLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { bolehUbahResep } from "@/lib/peran";
import { dataRapikan } from "@/lib/rapikan-menu";
import { kembarResepBahan } from "@/lib/rapikan-resep-bahan";
import { wajibIzin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { BarisBelumResep, BarisNama, BarisSaranResep, KartuGabung, KartuKembar } from "./aksi";

export const metadata: Metadata = { title: "Rapikan Menu" };
export const dynamic = "force-dynamic";

const BAGIAN = [
  ["kembar", "Menu kembar"],
  ["resep", "Sambungkan resep"],
  ["nama", "Nama belum dikenal"],
  ["belum", "Belum ada resep"],
  ["resepk", "Resep kembar"],
  ["bahank", "Bahan kembar"],
] as const;
type Bagian = (typeof BAGIAN)[number][0];
const PER_HALAMAN = 30;

/* Rapikan Menu (D-122): satu menu dapur, banyak nama jual — daftar kerja Mas Reza & dapur. TANPA harga. */
export default async function HalamanRapikan({ searchParams }: PageProps<"/menu/rapikan">) {
  const sesi = await wajibIzin("menu");
  const ubah = bolehUbahResep(sesi.peran);
  const { cari, bagian, semua } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const [d, rb] = await Promise.all([dataRapikan(kunci), kembarResepBahan(kunci)]);
  const jumlah: Record<Bagian, number> = {
    kembar: d.kembar.length,
    resep: d.saranResep.length,
    nama: d.belumDikenal.length,
    belum: d.belumResep.length,
    resepk: rb.resepKembar.length,
    bahank: rb.bahanKembar.length,
  };
  const aktif: Bagian = BAGIAN.some(([b]) => b === bagian) ? (bagian as Bagian) : (BAGIAN.find(([b]) => jumlah[b] > 0)?.[0] ?? "kembar");
  const lengkap = semua === "1";
  const potong = <T,>(x: T[]) => (lengkap ? x : x.slice(0, PER_HALAMAN));
  const tautan = (b: Bagian) => `/menu/rapikan?${new URLSearchParams({ bagian: b, ...(kunci ? { cari: kunci } : {}) })}`;
  const persen = (x: { siap: number; total: number }) => (x.total ? Math.round((x.siap / x.total) * 100) : 100);

  return (
    <Halaman>
      <Link href="/menu" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Menu
      </Link>
      <KepalaHalaman
        ikon={Sparkles}
        judul="Rapikan Menu"
        keterangan="Satu menu dapur (punya resep), banyak nama jual. Nama di pricelist, paket, dan dokumen tetap seperti biasa — di sini disambungkan ke menu dapurnya supaya HPP, Kebutuhan Bahan, PR, dan Layar Dapur ikut terhitung. Resep & bahan yang terinput dua kali juga digabung di sini."
      />

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ["Isi paket bisa dihitung", d.kemajuan.isiPaket],
            ["Pilihan paket bisa dihitung", d.kemajuan.pilihanPaket],
            ["Menu punya resep", d.kemajuan.menu],
          ] as const
        ).map(([label, x]) => (
          <div key={label} className="kartu px-4 py-3.5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-mono text-lg font-semibold tabular-nums">{persen(x)}%</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${persen(x)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {x.siap.toLocaleString("id-ID")} dari {x.total.toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {BAGIAN.map(([b, label]) => (
            <Link
              key={b}
              href={tautan(b)}
              className={cn(
                "min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors",
                b === aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              {label} <span className="tabular-nums opacity-80">{jumlah[b]}</span>
            </Link>
          ))}
        </div>
        <div className="sm:ml-auto sm:w-72">
          <Pencarian placeholder="Cari nama menu / resep…" />
        </div>
      </div>

      {!ubah ? <p className="mb-4 text-sm text-muted-foreground">Hanya Kepala Dapur, admin, atau owner yang bisa mengubah. Anda bisa melihat daftarnya.</p> : null}

      {aktif === "kembar" ? (
        <Bagian keterangan="Menu yang namanya sama atau sangat mirip — biasanya karena pernah diinput dua kali. Pilih menu dapur (induk); yang lain jadi nama lainnya. Kotak centang = ikut digabung.">
          {d.kembar.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">{potong(d.kembar).map((k) => (ubah ? <KartuKembar key={k.kunci} k={k} /> : <li key={k.kunci} className="kartu p-4 text-sm">{k.anggota.map((a) => a.nama).join(" · ")}</li>))}</ul>
          ) : (
            <Kosong teks="Tidak ada menu kembar." />
          )}
        </Bagian>
      ) : null}
      {aktif === "resep" ? (
        <Bagian keterangan="Menu tanpa resep yang punya resep bernama mirip. Cek dulu — box & prasmanan bisa beda takarannya.">
          {d.saranResep.length ? <ul className="kartu px-4">{potong(d.saranResep).map((s) => (ubah ? <BarisSaranResep key={s.idMenu} s={s} resep={d.resep} /> : <li key={s.idMenu} className="border-b py-3 last:border-0">{s.nama} → {s.calon.map((c) => c.nama).join(", ")}</li>))}</ul> : <Kosong teks="Tidak ada saran resep." />}
        </Bagian>
      ) : null}
      {aktif === "nama" ? (
        <Bagian keterangan="Nama di pilihan paket dan dokumen yang akan datang yang belum dikenali sebagai menu mana pun — belum ikut HPP & Kebutuhan Bahan. Jadikan nama lain sebuah menu, buat menu baru, atau abaikan bila bukan masakan (judul ruangan, catatan).">
          {d.belumDikenal.length ? <ul className="kartu px-4">{potong(d.belumDikenal).map((n) => (ubah ? <BarisNama key={n.nama} n={n} menu={d.menu} /> : <li key={n.nama} className="border-b py-3 last:border-0">{n.nama}</li>))}</ul> : <Kosong teks="Semua nama sudah dikenali." />}
        </Bagian>
      ) : null}
      {aktif === "belum" ? (
        <Bagian keterangan="Menu aktif yang belum punya resep dan tidak ada resep bernama mirip — buat resepnya di menu Resep, lalu sambungkan di sini. Urut dari yang paling banyak dipakai.">
          {d.belumResep.length ? <ul className="kartu px-4">{potong(d.belumResep).map((m) => (ubah ? <BarisBelumResep key={m.id} m={m} resep={d.resep} /> : <li key={m.id} className="border-b py-3 last:border-0">{m.nama}</li>))}</ul> : <Kosong teks="Semua menu sudah punya resep." />}
        </Bagian>
      ) : null}

      {aktif === "resepk" ? (
        <Bagian keterangan="Resep yang namanya sama — biasanya karena pernah diinput dua kali. Box & Prasmanan tidak dianggap kembar kecuali isi bahannya persis sama. Menu yang memakai resep lain pindah ke resep induk.">
          {rb.resepKembar.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {potong(rb.resepKembar).map((k) =>
                ubah ? (
                  <KartuGabung
                    key={k.kunci}
                    jenis="resep"
                    pasti={k.pasti}
                    catatan={k.isiSama ? "isi bahan persis sama" : "isi bahan berbeda — pilih takaran yang benar sebagai induk"}
                    anggota={k.anggota.map((r) => ({ id: r.id, kode: r.kode, nama: r.nama, info: `${r.baris} bahan · dipakai ${r.menu} menu`, href: `/resep/${r.id}` }))}
                  />
                ) : (
                  <li key={k.kunci} className="kartu p-4 text-sm">{k.anggota.map((r) => `${r.kode} ${r.nama}`).join(" · ")}</li>
                ),
              )}
            </ul>
          ) : (
            <Kosong teks="Tidak ada resep kembar." />
          )}
        </Bagian>
      ) : null}
      {aktif === "bahank" ? (
        <Bagian keterangan="Bahan yang nama, merk, dan variannya sama/mirip. Hanya bisa digabung bila satuan pakainya sama. Baris resep, PR, nota, PO, stok, opname, dan riwayat harga pindah ke bahan induk.">
          {rb.bahanKembar.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {potong(rb.bahanKembar).map((k) =>
                ubah ? (
                  <KartuGabung
                    key={k.kunci}
                    jenis="bahan"
                    pasti={k.pasti}
                    catatan={k.satuanSama ? null : "satuan pakai berbeda"}
                    anggota={k.anggota.map((b) => ({
                      id: b.id,
                      kode: b.kode,
                      nama: b.nama,
                      satuan: b.satuan,
                      info: [b.kemasan || "satuan belum diisi", `${b.resep} resep`, b.nota ? `${b.nota} nota` : null, b.stok ? `${b.stok} gerak stok` : null].filter(Boolean).join(" · "),
                      href: `/bahan/${b.id}`,
                    }))}
                  />
                ) : (
                  <li key={k.kunci} className="kartu p-4 text-sm">{k.anggota.map((b) => `${b.kode} ${b.nama}`).join(" · ")}</li>
                ),
              )}
            </ul>
          ) : (
            <Kosong teks="Tidak ada bahan kembar." />
          )}
        </Bagian>
      ) : null}

      {!lengkap && jumlah[aktif] > PER_HALAMAN ? (
        <Link href={`${tautan(aktif)}&semua=1`} className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          Tampilkan semua {jumlah[aktif].toLocaleString("id-ID")}
        </Link>
      ) : null}
    </Halaman>
  );
}

function Bagian({ keterangan, children }: { keterangan: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="max-w-[80ch] text-[0.9375rem] text-muted-foreground">{keterangan}</p>
      {children}
    </section>
  );
}

function Kosong({ teks }: { teks: string }) {
  return <p className="kartu px-4 py-6 text-center text-[0.9375rem] text-muted-foreground">{teks} ✅</p>;
}
