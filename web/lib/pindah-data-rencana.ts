/* ==========================================================================
   PINDAH DATA LAMA — bagian murni (tanpa database), dipakai wizard & dites.

   Data Aplikasi Penjualan TC (DB lama) disalin apa adanya — skema Tiska Ops
   adalah perluasan aditif dari skema lama (D-024), jadi kolomnya cocok.
   Yang perlu diputuskan manusia hanya tiga hal yang menunjuk ke "orang":
   akun pembuat (users), penandatangan, dan customer kembar.
   ========================================================================== */

export type Baris = Record<string, string | number | boolean | null>;

/** Urutan sisip: induk dulu (customers → quotations → invoices → payments). */
export const TABEL_LAMA = [
  "customers",
  "quotations",
  "quotation_items",
  "quotation_event_dates",
  "quotation_charges",
  "quotation_costs",
  "invoices",
  "invoice_items",
  "invoice_event_dates",
  "invoice_charges",
  "invoice_costs",
  "invoice_margins",
  "payments",
  "payment_details",
] as const;
export type TabelLama = (typeof TABEL_LAMA)[number];

export type DataLama = Record<TabelLama, Baris[]> & {
  users: Baris[];
  signatories: Baris[];
};

/** Kolom yang menunjuk ke users — dipetakan lewat keputusan "cocokkan akun". */
export const KOLOM_USER: Partial<Record<TabelLama, string[]>> = {
  customers: ["created_by"],
  quotations: ["created_by", "cancelled_by", "updated_by"],
  quotation_costs: ["created_by"],
  invoices: ["created_by", "cancelled_by", "updated_by"],
  invoice_costs: ["created_by"],
  invoice_margins: ["finalized_by"],
  payments: ["created_by"],
};

export type Keputusan = {
  /** id user lama → id user baru, atau null (dikosongkan). */
  user: Record<string, string | null>;
  /** id penandatangan lama → id penandatangan baru, atau "baru" (dibuat + tanda tangan disalin). */
  penandatangan: Record<string, string>;
  /** Customer kembar: semua `ikut` dilebur ke `utama`. */
  gabung: { utama: string; ikut: string[] }[];
  /** Ikut hapus data operasional uji (PR, nota, stok, opname, PO, kasbon, log kirim pricelist). */
  hapusOperasional: boolean;
};

const s = (v: unknown) => (v == null ? "" : String(v));

export function rapikanNama(n: unknown): string {
  return s(n)
    .toLowerCase()
    .replace(/\bpt\.?\s*/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rapikanHp(h: unknown): string {
  const d = s(h).replace(/\D/g, "").replace(/^62/, "0");
  return d.length >= 8 ? d : "";
}

export type KelompokKembar = {
  anggota: string[];
  saran: { utama: string; ikut: string[] };
};

/**
 * Customer yang kemungkinan orang/perusahaan yang sama: nama sama (setelah
 * dirapikan) ATAU nomor HP sama. Saran bawaan hanya menggabung yang NAMANYA
 * sama; yang cuma sama HP-nya dibiarkan untuk diputuskan manusia
 * (mis. "Ibu Mona" vs "Ibu Santi-Mona Sabatina" — satu HP, bisa beda acara).
 */
export function cariKembar(customers: Baris[], jumlahDok: Record<string, number>): KelompokKembar[] {
  const induk = new Map<string, string>();
  const akar = (x: string): string => {
    const p = induk.get(x) ?? x;
    if (p === x) return x;
    const r = akar(p);
    induk.set(x, r);
    return r;
  };
  const satukan = (a: string, b: string) => induk.set(akar(a), akar(b));
  const pertama = new Map<string, string>();
  for (const c of customers) {
    const id = s(c.id);
    induk.set(id, akar(id));
    for (const k of [`n:${rapikanNama(c.name)}`, `h:${rapikanHp(c.phone)}`]) {
      if (k.length <= 2) continue;
      const ada = pertama.get(k);
      if (ada) satukan(id, ada);
      else pertama.set(k, id);
    }
  }
  const grup = new Map<string, string[]>();
  for (const c of customers) {
    const r = akar(s(c.id));
    grup.set(r, [...(grup.get(r) ?? []), s(c.id)]);
  }
  const nama = new Map(customers.map((c) => [s(c.id), rapikanNama(c.name)]));
  return [...grup.values()]
    .filter((g) => g.length > 1)
    .map((anggota) => {
      const utama = [...anggota].sort((a, b) => (jumlahDok[b] ?? 0) - (jumlahDok[a] ?? 0) || Number(a) - Number(b))[0];
      return {
        anggota,
        saran: {
          utama,
          ikut: anggota.filter((x) => x !== utama && nama.get(x) === nama.get(utama)),
        },
      };
    });
}

/** Saran akun baru untuk akun lama: username sama, lalu nama sama. */
export function saranUser(lama: Baris, baru: { id: string; username: string; name: string }[]): string | null {
  const u = s(lama.username).toLowerCase();
  const n = rapikanNama(lama.name);
  return (
    baru.find((b) => b.username.toLowerCase() === u)?.id ??
    baru.find((b) => rapikanNama(b.name) === n)?.id ??
    baru.find((b) => n.length > 3 && (rapikanNama(b.name).includes(n) || n.includes(rapikanNama(b.name))))?.id ??
    null
  );
}

export function saranPenandatangan(lama: Baris, baru: { id: string; name: string }[]): string {
  return baru.find((b) => rapikanNama(b.name) === rapikanNama(lama.name))?.id ?? "baru";
}

export type Rencana = {
  baris: Record<TabelLama, Baris[]>;
  /** id penandatangan lama yang dibuat baru; diisi id sungguhan saat dijalankan. */
  penandatanganBaru: string[];
  ringkasan: {
    customer: number;
    customerDigabung: number;
    quotation: number;
    invoice: number;
    payment: number;
    totalInvoice: number;
    totalPayment: number;
  };
};

/**
 * Menyalin baris lama dengan id dipertahankan, lalu mengganti rujukan
 * user/penandatangan/customer menurut keputusan. Penandatangan "baru" diberi
 * id sementara `baru:<id lama>` yang ditukar saat dijalankan.
 * Melempar galat bila ada rujukan yang belum diputuskan.
 */
export function susunRencana(lama: DataLama, k: Keputusan): Rencana {
  const keUtama = new Map<string, string>();
  for (const g of k.gabung) for (const x of g.ikut) if (x !== g.utama) keUtama.set(x, g.utama);

  const user = (v: unknown) => {
    if (v == null) return null;
    if (!(s(v) in k.user)) throw new Error(`Akun lama #${s(v)} belum dicocokkan.`);
    return k.user[s(v)];
  };
  const ttd = (v: unknown) => {
    if (v == null) return null;
    const t = k.penandatangan[s(v)];
    if (!t) throw new Error(`Penandatangan lama #${s(v)} belum dicocokkan.`);
    return t === "baru" ? `baru:${s(v)}` : t;
  };

  const baris = {} as Record<TabelLama, Baris[]>;
  for (const t of TABEL_LAMA) {
    baris[t] = lama[t]
      .filter((r) => t !== "customers" || !keUtama.has(s(r.id)))
      .map((r) => {
        const b: Baris = { ...r };
        for (const kol of KOLOM_USER[t] ?? []) b[kol] = user(r[kol]);
        if ("customer_id" in b && b.customer_id != null) b.customer_id = keUtama.get(s(b.customer_id)) ?? s(b.customer_id);
        if ((t === "quotations" || t === "invoices") && "signatory_id" in b) b.signatory_id = ttd(r.signatory_id);
        return b;
      });
  }

  const dipakai = new Set([...baris.quotations, ...baris.invoices].map((r) => s(r.signatory_id)));
  const jumlah = (rows: Baris[], kol: string) => rows.reduce((a, r) => a + Number(r[kol] ?? 0), 0);
  return {
    baris,
    penandatanganBaru: Object.entries(k.penandatangan)
      .filter(([id, t]) => t === "baru" && dipakai.has(`baru:${id}`))
      .map(([id]) => id),
    ringkasan: {
      customer: baris.customers.length,
      customerDigabung: keUtama.size,
      quotation: baris.quotations.length,
      invoice: baris.invoices.length,
      payment: baris.payments.length,
      totalInvoice: jumlah(baris.invoices, "grand_total"),
      totalPayment: jumlah(baris.payments, "total_amount"),
    },
  };
}
