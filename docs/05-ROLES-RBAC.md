# 05 — Organisasi, Peran & Hak Akses

## Struktur organisasi

```
Direksi (keluarga besar owner)                 → laporan ringkas saja
└─ Owner: Pak Bimo Haryo Dewanto · Ibu Rita Ariyani
   ├─ Kantor
   │   ├─ Finance & Accounting ...... Pak Reza Devyan
   │   ├─ Sales & Marketing ......... Mbak Ariz Rakhma (juga admin chat)
   │   ├─ Business Development ...... Ramadan Saputra (pembangun sistem)
   │   ├─ Operational ............... KOSONG → owner (sistem mengisi peran ini)
   │   └─ Admin (2 orang) ........... nomor WA Admin Utama 0813-8310-8103
   ├─ Dapur ── Kepala Dapur: Mbak Sarinah
   │   ├─ Dapur Masak ............... juru masak + cook helper
   │   └─ Dapur Pastry/Bersih ....... juru masak + cook helper (Head Baker: Sulistiyowati, dari website)
   ├─ Captain & Lapangan
   │   ├─ Captain ................... Pak Yoga · Pak Sukir · Pak Asep
   │   ├─ Anggota (karyawan tetap)
   │   └─ DW / freelance ............ untuk acara besar; dicatat captain, dibayar Pak Reza
   ├─ Driver ........................ Pak Nung · Pak Mul · Pak Agil (armada: Luxio, Grand Max, …)
   └─ Gudang & Purchasing ........... Tya (stok, opname bulanan) · Pak Sur (belanja per event)
```
Nama lain di grup WA: Vikri, Pak Agus (steward), Pak Iwan, Pak Daud (steward) — anggota lapangan.

## Peran sistem

| Kode peran | Siapa | Tampilan utama |
|---|---|---|
| `owner` | Pak Bimo, Ibu Rita | Desktop + HP, semua |
| `direksi` | keluarga | Laporan ringkas (read-only) |
| `accounting` | Pak Reza | Desktop |
| `sales` | Mbak Ariz, admin | Desktop + HP |
| `bizdev` | Rama | Desktop (akses luas non-keuangan; super admin teknis terpisah) |
| `admin` | 2 admin | Desktop + HP |
| `kepala_dapur` | Mbak Sarinah | HP/tablet + layar dapur |
| `dapur` | juru masak, cook helper | HP / layar dapur |
| `captain` | Pak Yoga, Pak Sukir, Pak Asep | HP |
| `driver` | Pak Nung, Pak Mul, Pak Agil | HP |
| `gudang` | Tya, Pak Sur | HP |
| `field` | anggota lapangan tetap | HP |
| `dw` | freelance | Tanpa login; dicatat captain (opsional link sementara) |
| `super_admin` | teknis (Rama/Claude) | buka-kunci rekap, migrasi |

Peran lama di Aplikasi Penjualan TC: `admin, sales, finance, cost` → petakan: finance→accounting, cost→accounting/owner (cek pemakaian di kode sebelum mengubah).

## Matriks akses (● penuh · ◐ sebagian · – tidak)

| Peran | Harga jual | HPP & untung | Quotation & invoice | Keuangan | Resep & takaran | Brief & jadwal | Stok & belanja |
|---|---|---|---|---|---|---|---|
| Owner | ● | ● | ● | ● | ● | ● | ● |
| Direksi | ◐ ringkas | ◐ ringkas | – | ◐ ringkas | – | – | – |
| Accounting | ● | ● | ● | ● | ◐ | ◐ | ● |
| Sales & Marketing / Admin | ● | – (hanya status "menunggu persetujuan owner") | ● | – | – | ◐ | – |
| Business Development | ● | – (kecuali diizinkan owner) | ◐ | – | – | ◐ | – |
| Kepala Dapur | – | – | – | – | ● | ● | ◐ stok bahan |
| Dapur | – | – | – | – | ● | ◐ dapurnya | – |
| Captain | – | – | – | – | – | ● | ◐ alat |
| Driver | – | – | – | – | – | ◐ tugasnya | – |
| Gudang & Purchasing | – | – (harga beli: ◐ hanya untuk input belanja, tanpa HPP/untung) | – | – | – | ● | ● |
| Field / DW | – | – | – | – | – | ◐ jadwalnya | – |

Keputusan tim: **HPP & margin hanya Owner dan Accounting** (Pak Reza). Catatan: Purchasing pasti melihat harga beli saat
mencatat belanja — itu wajar, tetapi tanpa akses HPP menu/untung. Konfirmasi ke owner bila perlu dibatasi lagi.

## Kemampuan khusus (capabilities)

`view_cost` (owner, accounting) · `approve_low_margin` (owner) · `approve_purchase` (accounting) · `transfer_advance`
(accounting) · `edit_prices` (owner; sales untuk harga quotation) · `edit_recipes` (kepala_dapur, owner) ·
`lock_unlock_rekap` (owner; buka kembali: super_admin) · `send_to_client` (admin, sales — selalu manual) ·
`manage_users` (owner, super_admin) · `record_dw` (captain) · `pay_crew_fee` (accounting).

## Implementasi rahasia (ringkas, detail `03-DATA-MODEL.md` §10)

1. Query server memilih kolom berdasarkan peran (fungsi `selectForRole`); data 🔒 tidak pernah dikirim ke komponen client peran lain.
2. Layar dapur, PWA tim, brief, lembar dapur: memakai DTO khusus tanpa harga sama sekali.
3. Hermes: token peran saat memanggil API; tool untuk tim tidak bisa membaca kolom 🔒.
4. Test: snapshot payload halaman per peran tidak mengandung `hpp`, `cost`, `margin`, `price_per_pack`.
5. Akses DW kedaluwarsa otomatis (`access_expires_at`).
