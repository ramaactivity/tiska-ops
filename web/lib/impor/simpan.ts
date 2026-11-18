import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { buatHashSandi, MIN_SANDI } from "@/lib/auth";
import { AWALAN_KODE_BAHAN, KATEGORI_BAHAN, type KategoriBahan } from "@/lib/bahan";
import { awalanKode, kodeBerikutnya } from "@/lib/kode-master";
import { calonMirip } from "@/lib/cari-mirip";
import { kunciMenu } from "@/lib/hitung/menu-dapur";
import { KATEGORI_MENU } from "@/lib/menu";
import { penentuMenu } from "@/lib/menu-dapur";
import { kodePelangganBerikutnya, kodeProdukBerikutnya } from "@/lib/nomor";
import { aksesPenuh, bolehUbahPaket, bolehUbahResep, LABEL_PERAN, type Peran } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { uraikanRupiah } from "@/lib/uang";

import { type DefinisiImpor, PERAN_IMPOR_USER } from "./definisi";

export type BarisDiperiksa = {
  nomor: number;
  data: Record<string, string>;
  status: "baru" | "ada" | "galat";
  pesan?: string;
};

type Tx = Prisma.TransactionClient;
type Penangan<T> = {
  boleh?: (peran: Peran) => string | null;
  /** Data pembanding dari database (nama yang sudah ada, daftar menu, …). */
  muat: () => Promise<Konteks>;
  /** Satu baris → data siap simpan + kunci duplikat, atau pesan galat. */
  urai: (d: Record<string, string>, k: Konteks) => { nilai: T; kunci: string } | { galat: string };
  simpan: (tx: Tx, nilai: T[], idPengguna: bigint, opsi: OpsiImpor) => Promise<void>;
};
export type OpsiImpor = { sandiAwal?: string };
type Konteks = { ada: Set<string>; menu?: { cari: (nama: string) => bigint | null; nama: string[] }; kodePaket?: Set<string>; email?: Set<string> };

const kunci = (...s: (string | null | undefined)[]) => s.map((x) => (x ?? "").trim().toLowerCase().replace(/\s+/g, " ")).join("|");
const teks = (maks: number) => z.string().trim().max(maks, `Maksimal ${maks} karakter.`);
const kosongNull = (s: string) => (s.trim() === "" ? null : s.trim());
const pesanZod = (e: z.ZodError) => e.issues.map((x) => x.message).join(" ");
const angka = (s: string, nama: string): number | null | string => {
  if (!s.trim()) return null;
  const n = uraikanRupiah(s);
  return n && n.gt(0) ? n.toNumber() : `${nama} harus angka lebih dari 0.`;
};

/* ---------- Customer ---------- */
const skemaCustomer = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(255),
  pic_name: teks(100),
  phone: teks(20),
  email: z.union([z.literal(""), z.email("Format email belum benar.")]),
  npwp: z.preprocess((v) => (typeof v === "string" ? v.replace(/\D/g, "") : v), teks(30)), // polos seperti Coretax
  address: teks(2000),
});
const customer: Penangan<z.infer<typeof skemaCustomer>> = {
  muat: async () => ({ ada: new Set((await prisma.customers.findMany({ select: { name: true } })).map((c) => kunci(c.name))) }),
  urai: (d) => {
    const h = skemaCustomer.safeParse(d);
    return h.success ? { nilai: h.data, kunci: kunci(h.data.name) } : { galat: pesanZod(h.error) };
  },
  simpan: async (tx, nilai, oleh) => {
    // Kode urut dihitung sekali lalu dinaikkan sendiri — satu kueri, bukan satu per baris.
    let urut = Number((await kodePelangganBerikutnya(tx)).replace(/\D/g, ""));
    const kini = new Date();
    await tx.customers.createMany({
      data: nilai.map((d) => ({
        customer_code: `CUST-${String(urut++).padStart(4, "0")}`,
        name: d.name,
        pic_name: kosongNull(d.pic_name),
        phone: kosongNull(d.phone),
        email: kosongNull(d.email),
        npwp: kosongNull(d.npwp),
        address: kosongNull(d.address),
        status: "active",
        created_by: oleh,
        created_at: kini,
        updated_at: kini,
      })),
    });
  },
};

/* ---------- Product ---------- */
type NilaiProduk = { name: string; type: string; unit: string; default_price: number; description: string | null };
const product: Penangan<NilaiProduk> = {
  muat: async () => ({ ada: new Set((await prisma.products.findMany({ select: { name: true } })).map((p) => kunci(p.name))) }),
  urai: (d) => {
    const name = d.name.trim();
    if (name.length < 2) return { galat: "Nama minimal 2 huruf." };
    const type = d.type.trim().toLowerCase() || "barang";
    if (!["barang", "jasa"].includes(type)) return { galat: "Jenis harus barang atau jasa." };
    const harga = d.default_price.trim() ? uraikanRupiah(d.default_price) : null;
    if (d.default_price.trim() && (!harga || harga.isNegative())) return { galat: "Harga harus angka." };
    if ((d.unit || "").length > 20) return { galat: "Satuan maksimal 20 karakter." };
    return { nilai: { name, type, unit: d.unit.trim() || "pcs", default_price: harga?.toNumber() ?? 0, description: kosongNull(d.description) }, kunci: kunci(name) };
  },
  simpan: async (tx, nilai, oleh) => {
    let urut = Number((await kodeProdukBerikutnya(tx)).replace(/\D/g, ""));
    const kini = new Date();
    await tx.products.createMany({
      data: nilai.map((d) => ({ ...d, product_code: `PRD-${String(urut++).padStart(4, "0")}`, status: "active", created_by: oleh, created_at: kini, updated_at: kini })),
    });
  },
};

/* ---------- Menu ---------- */
const KATEGORI_DARI_LABEL = new Map(Object.entries(KATEGORI_MENU).flatMap(([k, label]) => [[k.toLowerCase(), k], [label.toLowerCase(), k]]));
type NilaiMenu = { name: string; category: string | null; kitchen: string | null; portion_factor: number; notes: string | null };
const menu: Penangan<NilaiMenu> = {
  boleh: (peran) => (bolehUbahResep(peran) ? null : "Hanya Kepala Dapur atau owner yang bisa menambah menu."),
  // Nama yang sudah ada — beda huruf besar-kecil/tanda baca, atau sudah jadi nama lain (D-122) — dilewati, tidak jadi menu kembar.
  muat: async () => {
    const [m, a] = await Promise.all([prisma.menus.findMany({ select: { name: true } }), prisma.menu_aliases.findMany({ select: { name: true } })]);
    return { ada: new Set([...m, ...a].map((x) => kunciMenu(x.name))) };
  },
  urai: (d) => {
    const name = d.name.trim();
    if (name.length < 2) return { galat: "Nama minimal 2 huruf." };
    const category = d.category.trim() ? (KATEGORI_DARI_LABEL.get(d.category.trim().toLowerCase()) ?? null) : null;
    if (d.category.trim() && !category) return { galat: `Kategori "${d.category}" tidak dikenal. Pilihan: ${Object.values(KATEGORI_MENU).join(", ")}.` };
    const dapur = d.kitchen.trim().toLowerCase();
    if (dapur && !["masak", "pastry"].includes(dapur)) return { galat: "Dapur harus masak atau pastry." };
    const faktor = angka(d.portion_factor, "Faktor porsi");
    if (typeof faktor === "string") return { galat: faktor };
    return { nilai: { name, category, kitchen: dapur || null, portion_factor: faktor ?? 1, notes: kosongNull(d.notes) }, kunci: kunciMenu(name) };
  },
  simpan: async (tx, nilai) => {
    const kini = new Date();
    await tx.menus.createMany({ data: nilai.map((d) => ({ ...d, active: true, created_at: kini, updated_at: kini })) });
  },
};

/* ---------- Bahan ---------- */
type NilaiBahan = {
  name: string;
  category: KategoriBahan;
  brand: string | null;
  variant: string | null;
  purchase_qty: number | null;
  purchase_unit: string | null;
  usage_unit: string | null;
  usage_qty_per_pack: number | null;
  notes: string | null;
};
const bahan: Penangan<NilaiBahan> = {
  muat: async () => ({ ada: new Set((await prisma.ingredients.findMany({ select: { name: true, brand: true } })).map((b) => kunci(b.name, b.brand))) }),
  urai: (d) => {
    const name = d.name.trim();
    if (name.length < 2) return { galat: "Nama minimal 2 huruf." };
    const category = KATEGORI_BAHAN.find((k) => k.toLowerCase() === d.category.trim().toLowerCase());
    if (!category) return { galat: `Kategori wajib salah satu: ${KATEGORI_BAHAN.join(", ")}.` };
    const isi = angka(d.purchase_qty, "Isi kemasan");
    const isiResep = angka(d.usage_qty_per_pack, "Isi dalam satuan resep");
    if (typeof isi === "string") return { galat: isi };
    if (typeof isiResep === "string") return { galat: isiResep };
    return {
      nilai: {
        name,
        category,
        brand: kosongNull(d.brand),
        variant: kosongNull(d.variant),
        purchase_qty: isi,
        purchase_unit: kosongNull(d.purchase_unit),
        usage_unit: kosongNull(d.usage_unit),
        usage_qty_per_pack: isiResep,
        notes: kosongNull(d.notes),
      },
      kunci: kunci(name, d.brand),
    };
  },
  simpan: async (tx, nilai, oleh) => {
    const kode = (await tx.ingredients.findMany({ select: { code: true } })).map((b) => b.code);
    const kini = new Date();
    await tx.ingredients.createMany({
      data: nilai.map((d) => {
        const baru = kodeBerikutnya(AWALAN_KODE_BAHAN[d.category], kode);
        kode.push(baru);
        // Harga belum ada → status "lengkapi" sampai finance mengisi harga.
        return { ...d, code: baru, status: "lengkapi", created_by: oleh, created_at: kini, updated_at: kini };
      }),
    });
  },
};

/* ---------- Paket ---------- */
type NilaiPaket = { name: string; price: number; line: string | null; code: string | null; notes: string | null; menu: bigint[] };
const paket: Penangan<NilaiPaket> = {
  boleh: (peran) => (bolehUbahPaket(peran) ? null : "Hanya owner atau finance yang bisa menambah paket."),
  muat: async () => {
    const [p, m, { cari }] = await Promise.all([
      prisma.packages.findMany({ select: { code: true, name: true, line: true } }),
      prisma.menus.findMany({ where: { active: true }, select: { name: true } }),
      penentuMenu(),
    ]);
    // Isi paket dicocokkan lewat penentu menu dapur (D-122); tebakan salah ketik tidak disimpan — disarankan.
    const pasti = (n: string) => {
      const r = cari(n);
      return r && r.cara !== "mirip" ? BigInt(r.id) : null;
    };
    return {
      ada: new Set(p.map((x) => kunci(x.name, x.line))),
      kodePaket: new Set(p.map((x) => x.code.toLowerCase())),
      menu: { cari: pasti, nama: m.map((x) => x.name) },
    };
  },
  urai: (d, k) => {
    const name = d.name.trim();
    if (name.length < 2) return { galat: "Nama minimal 2 huruf." };
    const harga = uraikanRupiah(d.price);
    if (!harga || harga.lte(0)) return { galat: "Harga per porsi wajib angka lebih dari 0." };
    const code = d.code.trim() || null;
    if (code && !/^[A-Za-z0-9-]+$/.test(code)) return { galat: "Kode hanya huruf, angka, dan tanda -." };
    if (code && k.kodePaket?.has(code.toLowerCase())) return { galat: `Kode ${code} sudah dipakai paket lain.` };
    const nama = d.isi.split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
    if (!nama.length) return { galat: "Isi menu wajib diisi (pisahkan dengan ;)." };
    const hilang = nama.filter((n) => !k.menu?.cari(n));
    if (hilang.length) {
      const saran = hilang.map((n) => {
        const c = calonMirip(n, k.menu?.nama ?? [], (x) => x, 0.5, 2).map((x) => `"${x.x}"`);
        return c.length ? `${n} (mungkin maksudnya ${c.join(" atau ")}?)` : n;
      });
      return { galat: `Menu tidak ada di daftar Menu: ${saran.join(", ")}. Samakan ejaannya, tambahkan nama lain di Rapikan Menu, atau tambahkan menunya dulu.` };
    }
    return {
      nilai: { name, price: harga.toNumber(), line: kosongNull(d.line), code, notes: kosongNull(d.notes), menu: nama.map((n) => k.menu!.cari(n)!) },
      kunci: code ? `kode|${code.toLowerCase()}` : kunci(name, d.line),
    };
  },
  simpan: async (tx, nilai) => {
    const semua = await tx.packages.findMany({ select: { code: true, line: true }, orderBy: { id: "desc" } });
    const kode = semua.map((p) => p.code);
    const kini = new Date();
    for (const d of nilai) {
      const contoh = d.line ? semua.find((p) => p.line === d.line) : undefined;
      const baru = d.code ?? kodeBerikutnya(contoh ? awalanKode(contoh.code) : "PK-", kode);
      kode.push(baru);
      await tx.packages.create({
        data: {
          code: baru,
          name: d.name,
          line: d.line,
          price: d.price.toFixed(2),
          notes: d.notes,
          status: "aktif",
          created_at: kini,
          updated_at: kini,
          package_items: { create: d.menu.map((m, i) => ({ menu_id: m, qty: 1, sort: i + 1, created_at: kini, updated_at: kini })) },
        },
      });
    }
  },
};

/* ---------- User (D-105) ---------- */
const PERAN_DARI_TEKS = new Map<string, Peran>(
  PERAN_IMPOR_USER.flatMap((p) => [[p, p], [LABEL_PERAN[p].toLowerCase(), p], [p.replace("_", " "), p]] as [string, Peran][]),
);
// Sebutan pendek yang lazim di tim.
for (const [t, p] of [["finance", "finance"], ["gudang", "gudang"], ["bizdev", "bizdev"], ["tim lapangan", "field"], ["lapangan", "field"]] as [string, Peran][]) PERAN_DARI_TEKS.set(t, p);
type NilaiUser = { name: string; username: string; role: Peran; email: string | null; employment_type: string | null; gender: string | null };
const JENIS_KELAMIN: Record<string, "L" | "P"> = { l: "L", "laki-laki": "L", laki: "L", pria: "L", p: "P", perempuan: "P", wanita: "P" };
const user: Penangan<NilaiUser> = {
  boleh: (peran) => (aksesPenuh(peran) ? null : "Hanya admin yang bisa membuat user."),
  muat: async () => {
    const u = await prisma.users.findMany({ select: { username: true, email: true } });
    return { ada: new Set(u.map((x) => kunci(x.username))), email: new Set(u.flatMap((x) => (x.email ? [x.email.toLowerCase()] : []))) };
  },
  urai: (d, k) => {
    const name = d.name.trim();
    if (name.length < 3 || name.length > 255) return { galat: "Nama minimal 3 huruf." };
    const username = d.username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)) return { galat: "Nama user 3–50 karakter: huruf kecil, angka, titik, garis bawah, strip; diawali huruf/angka." };
    const teksPeran = d.role.trim().toLowerCase();
    if (["admin", "owner"].includes(teksPeran)) return { galat: "Admin & Owner tidak bisa diimpor — buat satu per satu di menu User." };
    const role = PERAN_DARI_TEKS.get(teksPeran);
    if (!role) return { galat: `Peran "${d.role}" tidak dikenal. Pilihan: ${PERAN_IMPOR_USER.map((p) => LABEL_PERAN[p]).join(", ")}.` };
    const email = d.email.trim().toLowerCase();
    if (email && !z.email().safeParse(email).success) return { galat: "Format email belum benar." };
    // Akun yang sudah ada dilewati utuh — emailnya tentu sudah "terpakai" oleh dirinya sendiri.
    const sudahAda = k.ada.has(kunci(username));
    if (email && !sudahAda && k.email?.has(email)) return { galat: `Email ${email} sudah dipakai akun lain / baris lain.` };
    if (email && !sudahAda) k.email?.add(email);
    const teksJk = (d.gender ?? "").trim().toLowerCase();
    const gender = teksJk ? (JENIS_KELAMIN[teksJk] ?? null) : null;
    if (teksJk && !gender) return { galat: "Jenis kelamin isi L atau P." };
    const status = d.employment_type.trim().toLowerCase();
    if (status && !["tetap", "freelance"].includes(status)) return { galat: "Status kerja harus tetap atau freelance." };
    return { nilai: { name, username, role, email: email || null, employment_type: status === "freelance" ? "freelance" : null, gender }, kunci: kunci(username) };
  },
  simpan: async (tx, nilai, _oleh, opsi) => {
    const sandi = opsi.sandiAwal ?? "";
    if (sandi.length < MIN_SANDI) throw new Error(`Sandi awal minimal ${MIN_SANDI} karakter.`);
    // Satu hash untuk semua: sandinya memang sama, dan bcrypt per baris lambat untuk ratusan akun.
    const password = await buatHashSandi(sandi);
    const kini = new Date();
    await tx.users.createMany({
      data: nilai.map((d) => ({ ...d, password, is_active: true, wajib_ganti_sandi: true, created_at: kini, updated_at: kini })),
    });
  },
};

const PENANGAN: Record<string, Penangan<unknown>> = { customer, product, menu, bahan, paket, user } as Record<string, Penangan<unknown>>;

function penangan(def: DefinisiImpor) {
  const p = PENANGAN[def.jenis];
  if (!p) throw new Error("Jenis impor belum didukung.");
  return p;
}

/** Penolakan peran tambahan di luar izin halaman (mis. paket hanya owner/finance). */
export function tolakPeran(def: DefinisiImpor, peran: Peran): string | null {
  return penangan(def).boleh?.(peran) ?? null;
}

/** Memeriksa setiap baris: galat isian, duplikat di database, dan dobel di dalam berkas itu sendiri. */
export async function periksaBaris(def: DefinisiImpor, baris: Record<string, string>[]): Promise<BarisDiperiksa[]> {
  const p = penangan(def);
  const k = await p.muat();
  const diBerkas = new Set<string>();
  return baris.map((data, i) => {
    const nomor = i + 2; // baris 1 = judul kolom
    const h = p.urai(data, k);
    if ("galat" in h) return { nomor, data, status: "galat", pesan: h.galat };
    if (k.ada.has(h.kunci)) return { nomor, data, status: "ada", pesan: `Sudah ada di daftar ${def.judul.toLowerCase()} — dilewati.` };
    if (diBerkas.has(h.kunci)) return { nomor, data, status: "ada", pesan: "Muncul dua kali di berkas — dilewati." };
    diBerkas.add(h.kunci);
    return { nomor, data, status: "baru" };
  });
}

/** Menyimpan baris berstatus "baru" dalam satu transaksi (semua atau tidak sama sekali). */
export async function simpanBaris(def: DefinisiImpor, baris: Record<string, string>[], idPengguna: string, opsi: OpsiImpor = {}): Promise<number> {
  const p = penangan(def);
  const k = await p.muat();
  const diperiksa = await periksaBaris(def, baris);
  const nilai = diperiksa.filter((b) => b.status === "baru").map((b) => {
    const h = p.urai(b.data, k);
    if ("galat" in h) throw new Error(h.galat);
    return h.nilai;
  });
  if (!nilai.length) return 0;
  await prisma.$transaction((tx) => p.simpan(tx, nilai, BigInt(idPengguna), opsi), { timeout: 60_000 });
  return nilai.length;
}
